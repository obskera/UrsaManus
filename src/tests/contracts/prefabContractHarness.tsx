import { render, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import type {
    PrefabAttachRequest,
    PrefabAttachmentReport,
    PrefabAttachmentRuntime,
} from "@/services/prefabCore";

export type PrefabContractSuiteOptions<TProps> = {
    prefabName: string;
    renderPrefab: (props: TProps) => ReactElement;
    createInitialProps: () => TProps;
    createUpdatedProps?: (initialProps: TProps) => TProps;
    assertRender: (rendered: RenderResult, props: TProps) => void;
    assertUpdate?: (rendered: RenderResult, props: TProps) => void;
    inputContract?: {
        trigger: (input: {
            rendered: RenderResult;
            props: TProps;
            user: ReturnType<typeof userEvent.setup>;
        }) => Promise<void>;
        assert: (rendered: RenderResult, props: TProps) => void;
    };
};

export function runPrefabContractSuite<TProps>(
    options: PrefabContractSuiteOptions<TProps>,
): void {
    describe(`${options.prefabName} prefab contract`, () => {
        it("passes render contract assertions", () => {
            const initialProps = options.createInitialProps();
            const rendered = render(options.renderPrefab(initialProps));

            options.assertRender(rendered, initialProps);
        });

        it("passes lifecycle contract assertions", () => {
            const initialProps = options.createInitialProps();
            const rendered = render(options.renderPrefab(initialProps));
            options.assertRender(rendered, initialProps);

            if (options.createUpdatedProps && options.assertUpdate) {
                const updatedProps = options.createUpdatedProps(initialProps);
                rendered.rerender(options.renderPrefab(updatedProps));
                options.assertUpdate(rendered, updatedProps);
            }

            expect(() => rendered.unmount()).not.toThrow();
        });

        const inputContract = options.inputContract;
        if (inputContract) {
            it("passes input contract assertions", async () => {
                const initialProps = options.createInitialProps();
                const rendered = render(options.renderPrefab(initialProps));
                const user = userEvent.setup();

                await inputContract.trigger({
                    rendered,
                    props: initialProps,
                    user,
                });

                inputContract.assert(rendered, initialProps);
            });
        }
    });
}

export type PrefabModuleContractFixture<TContext> = {
    runtime: PrefabAttachmentRuntime;
    entityId: string;
    context: TContext;
    initialRequests: PrefabAttachRequest[];
    overrideRequests?: PrefabAttachRequest[];
};

export type PrefabModuleContractSuiteOptions<TContext> = {
    suiteName: string;
    createFixture: () => PrefabModuleContractFixture<TContext>;
    assertAttach: (input: {
        fixture: PrefabModuleContractFixture<TContext>;
        report: PrefabAttachmentReport;
    }) => void;
    assertDetach: (input: {
        fixture: PrefabModuleContractFixture<TContext>;
        report: PrefabAttachmentReport;
    }) => void;
    assertOverride?: (input: {
        fixture: PrefabModuleContractFixture<TContext>;
        report: PrefabAttachmentReport;
    }) => void;
};

export function runPrefabModuleContractSuite<TContext>(
    options: PrefabModuleContractSuiteOptions<TContext>,
): void {
    describe(`${options.suiteName} module contract`, () => {
        it("passes module attach contract assertions", () => {
            const fixture = options.createFixture();
            const report = fixture.runtime.attachPrefabModules(
                fixture.entityId,
                fixture.initialRequests,
                fixture.context as Record<string, unknown>,
            );

            options.assertAttach({
                fixture,
                report,
            });
        });

        it("passes module detach contract assertions", () => {
            const fixture = options.createFixture();
            fixture.runtime.attachPrefabModules(
                fixture.entityId,
                fixture.initialRequests,
                fixture.context as Record<string, unknown>,
            );

            const report = fixture.runtime.detachPrefabModules(
                fixture.entityId,
                undefined,
                fixture.context as Record<string, unknown>,
            );

            options.assertDetach({
                fixture,
                report,
            });
            expect(
                fixture.runtime.getAttachedModuleIds(fixture.entityId),
            ).toEqual([]);
        });

        const assertOverride = options.assertOverride;
        if (assertOverride) {
            it("passes module override contract assertions", () => {
                const fixture = options.createFixture();
                fixture.runtime.attachPrefabModules(
                    fixture.entityId,
                    fixture.initialRequests,
                    fixture.context as Record<string, unknown>,
                );

                const report = fixture.runtime.attachPrefabModules(
                    fixture.entityId,
                    fixture.overrideRequests ?? fixture.initialRequests,
                    fixture.context as Record<string, unknown>,
                );

                assertOverride({
                    fixture,
                    report,
                });
            });
        }
    });
}
