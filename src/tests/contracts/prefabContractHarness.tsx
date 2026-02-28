import { render, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";

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
