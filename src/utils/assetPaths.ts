const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

export function resolvePublicAssetPath(assetPath: string): string {
    const trimmedPath = assetPath.trim();
    if (!trimmedPath) {
        return import.meta.env.BASE_URL;
    }

    if (
        ABSOLUTE_URL_PATTERN.test(trimmedPath) ||
        trimmedPath.startsWith("data:") ||
        trimmedPath.startsWith("blob:")
    ) {
        return trimmedPath;
    }

    const basePath = import.meta.env.BASE_URL.endsWith("/")
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;

    if (basePath !== "/" && trimmedPath.startsWith(basePath)) {
        return trimmedPath;
    }

    return `${basePath}${trimmedPath.replace(/^\/+/, "")}`;
}