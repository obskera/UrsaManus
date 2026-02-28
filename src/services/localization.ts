export type LocalizationParams = Record<string, string | number | boolean>;

export type LocalizationCatalog = Record<string, string>;

export type LocalizationService = {
    setLocale: (locale: string) => string;
    getLocale: () => string;
    setFallbackLocale: (locale: string) => string;
    getFallbackLocale: () => string;
    registerCatalog: (
        locale: string,
        entries: LocalizationCatalog,
        options?: { merge?: boolean },
    ) => number;
    unregisterCatalog: (locale: string) => boolean;
    getCatalog: (locale: string) => LocalizationCatalog;
    translate: (
        key: string,
        options?: {
            params?: LocalizationParams;
            locale?: string;
            fallback?: string;
        },
    ) => string;
};

export type PromptLocalizationInput = {
    channel: string;
    message: string;
    payload?: Record<string, unknown>;
};

const TOKEN_REGEX = /\{([a-zA-Z0-9_.-]+)\}/g;

function normalizeLocale(locale: string): string {
    const trimmed = String(locale).trim();
    return trimmed || "en";
}

function toLocalizationParams(value: unknown): LocalizationParams | null {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }

    const params: LocalizationParams = {};
    for (const [key, entry] of Object.entries(value)) {
        if (
            typeof entry === "string" ||
            typeof entry === "number" ||
            typeof entry === "boolean"
        ) {
            params[key] = entry;
        }
    }

    return params;
}

function formatTemplate(template: string, params?: LocalizationParams): string {
    if (!params) {
        return template;
    }

    return template.replace(TOKEN_REGEX, (match, token: string) => {
        if (!Object.prototype.hasOwnProperty.call(params, token)) {
            return match;
        }

        return String(params[token]);
    });
}

function toPromptFieldKey(channel: string, suffix: string): string {
    return `${channel}${suffix}`;
}

function pickPromptTextKey(input: PromptLocalizationInput): {
    key: string;
    params?: LocalizationParams;
    locale?: string;
    fallback: string;
} | null {
    const payload = input.payload;
    if (!payload) {
        return null;
    }

    const channelKey = toPromptFieldKey(input.channel, "Key");
    const genericKey = "textKey";

    const keyCandidate = payload[channelKey] ?? payload[genericKey];
    if (typeof keyCandidate !== "string") {
        return null;
    }

    const key = keyCandidate.trim();
    if (!key) {
        return null;
    }

    const channelParams = toPromptFieldKey(input.channel, "Params");
    const params =
        toLocalizationParams(payload[channelParams]) ??
        toLocalizationParams(payload.textParams);

    const fallbackValue = payload[toPromptFieldKey(input.channel, "Fallback")];
    const genericFallback = payload.textFallback;
    const fallback =
        typeof fallbackValue === "string"
            ? fallbackValue
            : typeof genericFallback === "string"
              ? genericFallback
              : input.message;

    const localeValue = payload[toPromptFieldKey(input.channel, "Locale")];
    const genericLocale = payload.locale;
    const locale =
        typeof localeValue === "string"
            ? localeValue
            : typeof genericLocale === "string"
              ? genericLocale
              : undefined;

    return {
        key,
        ...(params ? { params } : {}),
        ...(locale ? { locale } : {}),
        fallback,
    };
}

export function createLocalizationService(options?: {
    locale?: string;
    fallbackLocale?: string;
    catalogs?: Record<string, LocalizationCatalog>;
}): LocalizationService {
    let locale = normalizeLocale(options?.locale ?? "en");
    let fallbackLocale = normalizeLocale(
        options?.fallbackLocale ?? options?.locale ?? "en",
    );

    const catalogs = new Map<string, LocalizationCatalog>();

    if (options?.catalogs) {
        for (const [catalogLocale, entries] of Object.entries(
            options.catalogs,
        )) {
            catalogs.set(normalizeLocale(catalogLocale), { ...entries });
        }
    }

    const setLocale: LocalizationService["setLocale"] = (nextLocale) => {
        locale = normalizeLocale(nextLocale);
        return locale;
    };

    const setFallbackLocale: LocalizationService["setFallbackLocale"] = (
        nextFallback,
    ) => {
        fallbackLocale = normalizeLocale(nextFallback);
        return fallbackLocale;
    };

    const registerCatalog: LocalizationService["registerCatalog"] = (
        catalogLocale,
        entries,
        options,
    ) => {
        const normalizedLocale = normalizeLocale(catalogLocale);
        const shouldMerge = options?.merge !== false;
        const existing = catalogs.get(normalizedLocale) ?? {};

        const merged = shouldMerge
            ? { ...existing, ...entries }
            : { ...entries };
        catalogs.set(normalizedLocale, merged);
        return Object.keys(merged).length;
    };

    const unregisterCatalog: LocalizationService["unregisterCatalog"] = (
        catalogLocale,
    ) => {
        const normalizedLocale = normalizeLocale(catalogLocale);
        return catalogs.delete(normalizedLocale);
    };

    const getCatalog: LocalizationService["getCatalog"] = (catalogLocale) => {
        const normalizedLocale = normalizeLocale(catalogLocale);
        return { ...(catalogs.get(normalizedLocale) ?? {}) };
    };

    const translate: LocalizationService["translate"] = (key, options) => {
        const normalizedKey = String(key).trim();
        const requestedLocale = options?.locale
            ? normalizeLocale(options.locale)
            : locale;

        const requestedCatalog = catalogs.get(requestedLocale);
        const fallbackCatalog = catalogs.get(fallbackLocale);

        const template =
            (normalizedKey && requestedCatalog?.[normalizedKey]) ||
            (normalizedKey && fallbackCatalog?.[normalizedKey]) ||
            options?.fallback ||
            normalizedKey;

        return formatTemplate(template, options?.params);
    };

    return {
        setLocale,
        getLocale: () => locale,
        setFallbackLocale,
        getFallbackLocale: () => fallbackLocale,
        registerCatalog,
        unregisterCatalog,
        getCatalog,
        translate,
    };
}

export function resolveLocalizedPromptMessage(
    localization: Pick<LocalizationService, "translate">,
    input: PromptLocalizationInput,
): string {
    const descriptor = pickPromptTextKey(input);
    if (!descriptor) {
        return input.message;
    }

    return localization.translate(descriptor.key, {
        ...(descriptor.params ? { params: descriptor.params } : {}),
        ...(descriptor.locale ? { locale: descriptor.locale } : {}),
        fallback: descriptor.fallback,
    });
}

export const localizationService = createLocalizationService();
