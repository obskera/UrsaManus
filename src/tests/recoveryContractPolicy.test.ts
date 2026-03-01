import { describe, expect, it } from "vitest";
import { getRecoveryContractViolations } from "@/services/recoveryContractPolicy";

describe("recoveryContractPolicy", () => {
    it("accepts helper-based recovery calls", () => {
        const source = `
            import { persistToolRecoverySnapshot } from "@/services/toolRecoverySnapshot";
            persistToolRecoverySnapshot("bgm", raw);
        `;

        expect(getRecoveryContractViolations(source)).toEqual([]);
    });

    it("rejects hardcoded autosave storage key literals", () => {
        const source = 'const key = "um:tools:bgm:autosave:v1";';

        const violations = getRecoveryContractViolations(source);
        expect(violations.length).toBeGreaterThan(0);
    });

    it("rejects direct localStorage autosave access", () => {
        const source =
            'window.localStorage.setItem("um:tools:bgm:autosave:v1", raw);';

        const violations = getRecoveryContractViolations(source);
        expect(violations.length).toBeGreaterThan(0);
    });

    it("rejects helper calls with string literal key argument", () => {
        const source =
            'persistToolRecoverySnapshot("um:tools:bgm:autosave:v1", raw);';

        const violations = getRecoveryContractViolations(source);
        expect(violations.length).toBeGreaterThan(0);
    });
});
