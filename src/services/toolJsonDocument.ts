export type JsonValidationResult<TValue> =
    | {
          ok: true;
          value: TValue;
      }
    | {
          ok: false;
          message: string;
      };

export const TOOL_JSON_MESSAGE = {
    invalidJson: "Invalid JSON.",
    validationInvalidJson: "Validation failed: invalid JSON.",
    previewInvalidJson: "Preview failed: invalid JSON.",
    importInvalidJson: "Import failed: invalid JSON.",
    importInvalidJsonFile: "Import failed: invalid JSON file.",
} as const;

export const withStatusPrefix = (prefix: string, message: string): string => {
    return message.startsWith(prefix) ? message : `${prefix}${message}`;
};

export const parseJsonDocument = <TValue>(
    raw: string,
    options?: {
        invalidJsonMessage?: string;
        validate?: (value: unknown) => JsonValidationResult<TValue>;
    },
): JsonValidationResult<TValue> => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return {
            ok: false,
            message:
                options?.invalidJsonMessage ?? TOOL_JSON_MESSAGE.invalidJson,
        };
    }

    if (options?.validate) {
        return options.validate(parsed);
    }

    return {
        ok: true,
        value: parsed as TValue,
    };
};

export const stringifyJsonDocument = (
    value: unknown,
    pretty = true,
): string => {
    return JSON.stringify(value, null, pretty ? 2 : undefined);
};
