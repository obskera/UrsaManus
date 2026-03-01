export type RecoveryContractViolation = {
    message: string;
};

const FORBIDDEN_AUTOSAVE_KEY_LITERAL = /um:tools:[^"'`\s]+:autosave:v1/i;
const FORBIDDEN_AUTOSAVE_LOCALSTORAGE =
    /localStorage\.(getItem|setItem|removeItem)\([^)]*autosave[^)]*\)/i;

export function getRecoveryContractViolations(
    source: string,
): RecoveryContractViolation[] {
    const violations: RecoveryContractViolation[] = [];

    if (FORBIDDEN_AUTOSAVE_KEY_LITERAL.test(source)) {
        violations.push({
            message:
                "Hardcoded autosave storage key found. Use buildToolRecoveryStorageKey(toolKey) via shared recovery helpers.",
        });
    }

    if (FORBIDDEN_AUTOSAVE_LOCALSTORAGE.test(source)) {
        violations.push({
            message:
                "Direct localStorage autosave access found. Use persist/load/clearToolRecoverySnapshot helpers.",
        });
    }

    return violations;
}
