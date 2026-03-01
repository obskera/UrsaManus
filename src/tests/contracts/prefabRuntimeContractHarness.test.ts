import { expect } from "vitest";
import { createPrefabAttachmentRuntime } from "@/services/prefabCore";
import { createDefaultPrefabRegistry } from "@/services/prefabRegistryDefaults";
import {
    PREFAB_BLUEPRINT_FIXTURE_MATRIX,
    type PrefabBlueprintFixture,
} from "@/tests/contracts/fixtures/prefabBlueprintMatrix";
import { runPrefabModuleContractSuite } from "@/tests/contracts/prefabContractHarness";

type FixtureContext = {
    notes?: string[];
};

for (const matrixFixture of PREFAB_BLUEPRINT_FIXTURE_MATRIX) {
    runPrefabModuleContractSuite<FixtureContext>({
        suiteName: `Prefab runtime ${matrixFixture.id}`,
        createFixture: () => createFixture(matrixFixture),
        assertAttach: ({ fixture, report }) => {
            expect(report.failed).toHaveLength(0);
            expect(report.skipped).toHaveLength(0);
            expect(report.attached.map((item) => item.moduleId).sort()).toEqual(
                matrixFixture.expectedModuleIds,
            );
            expect(
                fixture.runtime.getAttachedModuleIds(fixture.entityId),
            ).toEqual(matrixFixture.expectedModuleIds);
        },
        assertDetach: ({ report }) => {
            expect(report.failed).toHaveLength(0);
            expect(report.skipped).toHaveLength(0);
            expect(report.attached.map((item) => item.moduleId).sort()).toEqual(
                matrixFixture.expectedModuleIds,
            );
        },
        assertOverride: ({ report }) => {
            expect(report.failed).toHaveLength(0);
            expect(report.attached).toHaveLength(0);
            expect(report.skipped.map((item) => item.reason)).toEqual(
                matrixFixture.expectedModuleIds.map(() => "already-attached"),
            );
        },
    });
}

function createFixture(matrixFixture: PrefabBlueprintFixture): {
    runtime: ReturnType<typeof createPrefabAttachmentRuntime>;
    entityId: string;
    context: FixtureContext;
    initialRequests: PrefabBlueprintFixture["requests"];
    overrideRequests: PrefabBlueprintFixture["requests"];
} {
    const registry = createDefaultPrefabRegistry();
    const runtime = createPrefabAttachmentRuntime({ registry });

    return {
        runtime,
        entityId: matrixFixture.entityId,
        context: {},
        initialRequests: matrixFixture.requests,
        overrideRequests: matrixFixture.requests.map((request) => ({
            moduleId: request.moduleId,
            config: {
                source: "override-pass",
            },
        })),
    };
}
