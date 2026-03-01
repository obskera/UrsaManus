import { describe, expect, it } from "vitest";
import {
    collectUnresolvedDependencies,
    createPrefabDiagnosticsService,
    PREFAB_DIAGNOSTIC_EVENT_SIGNAL,
    PREFAB_HEALTH_REPORT_SIGNAL,
} from "@/services/prefabDiagnostics";

describe("prefabDiagnostics", () => {
    it("records attachment report events and emits signals", () => {
        const emitted: string[] = [];
        const diagnostics = createPrefabDiagnosticsService({
            now: () => 123,
            emit: (signal) => {
                emitted.push(signal);
            },
        });

        diagnostics.recordAttachmentReport({
            blueprintId: "player-main",
            report: {
                entityId: "entity-1",
                attached: [{ moduleId: "rpg.stats-equipment" }],
                skipped: [
                    {
                        moduleId: "rpg.abilities",
                        reason: "missing-dependency",
                        details: 'Requires "rpg.inventory-hotbar".',
                    },
                ],
                failed: [
                    {
                        moduleId: "rpg.world-hooks",
                        reason: "attach-threw",
                        error: "boom",
                    },
                ],
            },
        });

        const events = diagnostics.getEvents();
        expect(events).toHaveLength(3);
        expect(events[0].type).toBe("attach");
        expect(events[1].type).toBe("skip");
        expect(events[2].type).toBe("failed");
        expect(emitted).toContain(PREFAB_DIAGNOSTIC_EVENT_SIGNAL);
    });

    it("produces health report and export payload", () => {
        const emitted: string[] = [];
        const diagnostics = createPrefabDiagnosticsService({
            now: () => 999,
            emit: (signal) => {
                emitted.push(signal);
            },
        });

        diagnostics.recordAttachmentReport({
            report: {
                entityId: "entity-2",
                attached: [{ moduleId: "enemy.core" }],
                skipped: [],
                failed: [],
            },
        });

        const report = diagnostics.getHealthReport();
        expect(report.attachedCount).toBe(1);
        expect(report.failedCount).toBe(0);
        expect(emitted).toContain(PREFAB_HEALTH_REPORT_SIGNAL);

        const exported = diagnostics.exportHealthReport();
        const parsed = JSON.parse(exported) as {
            version: string;
            report: {
                attachedCount: number;
            };
        };
        expect(parsed.version).toBe("um-prefab-health-report-v1");
        expect(parsed.report.attachedCount).toBe(1);
    });

    it("extracts unresolved dependencies from an attachment report", () => {
        const unresolved = collectUnresolvedDependencies({
            entityId: "entity-3",
            attached: [],
            skipped: [
                {
                    moduleId: "enemy.melee-ability",
                    reason: "missing-dependency",
                    details: 'Requires "enemy.core".',
                },
                {
                    moduleId: "enemy.pathing",
                    reason: "conflict",
                },
            ],
            failed: [],
        });

        expect(unresolved).toEqual([
            {
                entityId: "entity-3",
                moduleId: "enemy.melee-ability",
                details: 'Requires "enemy.core".',
            },
        ]);
    });
});
