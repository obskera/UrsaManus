import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    getFocusableElements,
    handleArrowFocusNavigation,
} from "@/components/screenController/focusNavigation";

describe("focusNavigation helpers", () => {
    it("returns focusable elements while excluding disabled buttons", () => {
        render(
            <div data-testid="root">
                <button type="button">One</button>
                <button type="button" disabled>
                    Disabled
                </button>
                <button type="button">Two</button>
            </div>,
        );

        const root = screen.getByTestId("root");
        const focusables = getFocusableElements(root);

        expect(focusables).toHaveLength(2);
        expect(focusables[0]).toHaveTextContent("One");
        expect(focusables[1]).toHaveTextContent("Two");
    });

    it("moves focus with arrow keys and wraps by default", () => {
        render(
            <div
                data-testid="root"
                onKeyDown={(event) => {
                    handleArrowFocusNavigation(
                        event.nativeEvent,
                        event.currentTarget,
                        {
                            orientation: "horizontal",
                        },
                    );
                }}
            >
                <button type="button">One</button>
                <button type="button">Two</button>
            </div>,
        );

        const one = screen.getByRole("button", { name: "One" });
        const two = screen.getByRole("button", { name: "Two" });

        one.focus();
        fireEvent.keyDown(one, { key: "ArrowRight" });
        expect(document.activeElement).toBe(two);

        fireEvent.keyDown(two, { key: "ArrowRight" });
        expect(document.activeElement).toBe(one);
    });

    it("ignores typing targets by default", () => {
        render(
            <div
                data-testid="root"
                onKeyDown={(event) => {
                    handleArrowFocusNavigation(
                        event.nativeEvent,
                        event.currentTarget,
                        {
                            orientation: "horizontal",
                        },
                    );
                }}
            >
                <input aria-label="Name" />
                <button type="button">Apply</button>
            </div>,
        );

        const input = screen.getByRole("textbox", { name: "Name" });
        input.focus();
        fireEvent.keyDown(input, { key: "ArrowRight" });

        expect(document.activeElement).toBe(input);
    });

    it("returns false when key is not part of configured orientation", () => {
        const keyboardEvent = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true,
            cancelable: true,
        });

        const root = document.createElement("div");
        const handled = handleArrowFocusNavigation(keyboardEvent, root, {
            orientation: "horizontal",
        });

        expect(handled).toBe(false);
    });

    it("supports vertical orientation and no-wrap bounds", () => {
        render(
            <div data-testid="root">
                <button type="button">Top</button>
                <button type="button">Bottom</button>
            </div>,
        );

        const top = screen.getByRole("button", { name: "Top" });
        const bottom = screen.getByRole("button", { name: "Bottom" });
        const root = screen.getByTestId("root");

        top.focus();
        const first = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(first, "target", { value: top });

        const moved = handleArrowFocusNavigation(first, root, {
            orientation: "vertical",
            wrap: false,
        });

        expect(moved).toBe(true);
        expect(document.activeElement).toBe(bottom);

        const second = new KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(second, "target", { value: bottom });

        const blocked = handleArrowFocusNavigation(second, root, {
            orientation: "vertical",
            wrap: false,
        });

        expect(blocked).toBe(false);
        expect(document.activeElement).toBe(bottom);
    });

    it("allows typing targets when includeFromTypingTargets is true", () => {
        render(
            <div data-testid="root">
                <input aria-label="Name" />
                <button type="button">Apply</button>
            </div>,
        );

        const root = screen.getByTestId("root");
        const input = screen.getByRole("textbox", { name: "Name" });
        const apply = screen.getByRole("button", { name: "Apply" });

        input.focus();
        const event = new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(event, "target", { value: input });

        const handled = handleArrowFocusNavigation(event, root, {
            orientation: "horizontal",
            includeFromTypingTargets: true,
        });

        expect(handled).toBe(true);
        expect(document.activeElement).toBe(apply);
    });

    it("uses custom selector and can skip preventDefault", () => {
        render(
            <div data-testid="root">
                <button type="button" data-nav="yes">
                    First
                </button>
                <button type="button" data-nav="yes">
                    Second
                </button>
                <button type="button">Ignored</button>
            </div>,
        );

        const root = screen.getByTestId("root");
        const first = screen.getByRole("button", { name: "First" });
        const second = screen.getByRole("button", { name: "Second" });

        first.focus();

        const event = new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(event, "target", { value: first });

        const handled = handleArrowFocusNavigation(event, root, {
            orientation: "both",
            focusableSelector: '[data-nav="yes"]',
            preventDefault: false,
        });

        expect(handled).toBe(true);
        expect(document.activeElement).toBe(second);
        expect(event.defaultPrevented).toBe(false);
    });

    it("returns false when no matching focusable elements are found", () => {
        render(
            <div data-testid="root">
                <button type="button">Only</button>
            </div>,
        );

        const root = screen.getByTestId("root");
        const event = new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
            cancelable: true,
        });

        const handled = handleArrowFocusNavigation(event, root, {
            focusableSelector: '[data-never="matches"]',
        });

        expect(handled).toBe(false);
    });

    it("supports ArrowLeft and ArrowUp directional paths", () => {
        render(
            <div data-testid="root">
                <button type="button">First</button>
                <button type="button">Second</button>
            </div>,
        );

        const root = screen.getByTestId("root");
        const first = screen.getByRole("button", { name: "First" });
        const second = screen.getByRole("button", { name: "Second" });

        second.focus();
        const left = new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(left, "target", { value: second });

        expect(
            handleArrowFocusNavigation(left, root, {
                orientation: "horizontal",
            }),
        ).toBe(true);
        expect(document.activeElement).toBe(first);

        second.focus();
        const up = new KeyboardEvent("keydown", {
            key: "ArrowUp",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(up, "target", { value: second });

        expect(
            handleArrowFocusNavigation(up, root, {
                orientation: "vertical",
            }),
        ).toBe(true);
        expect(document.activeElement).toBe(first);
    });

    it("returns false for unmapped key in both orientation", () => {
        const root = document.createElement("div");
        const event = new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
            cancelable: true,
        });

        expect(
            handleArrowFocusNavigation(event, root, {
                orientation: "both",
            }),
        ).toBe(false);
    });

    it("uses document.activeElement fallback when event target is not an HTMLElement", () => {
        render(
            <div data-testid="root">
                <button type="button">One</button>
                <button type="button">Two</button>
            </div>,
        );

        const root = screen.getByTestId("root");
        const one = screen.getByRole("button", { name: "One" });
        const two = screen.getByRole("button", { name: "Two" });

        one.focus();
        const event = new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(event, "target", { value: window });

        expect(
            handleArrowFocusNavigation(event, root, {
                orientation: "horizontal",
            }),
        ).toBe(true);
        expect(document.activeElement).toBe(two);
    });

    it("wraps to the last element when moving left from the first", () => {
        render(
            <div data-testid="root">
                <button type="button">One</button>
                <button type="button">Two</button>
            </div>,
        );

        const root = screen.getByTestId("root");
        const one = screen.getByRole("button", { name: "One" });
        const two = screen.getByRole("button", { name: "Two" });

        one.focus();
        const left = new KeyboardEvent("keydown", {
            key: "ArrowLeft",
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(left, "target", { value: one });

        expect(
            handleArrowFocusNavigation(left, root, {
                orientation: "horizontal",
                wrap: true,
            }),
        ).toBe(true);
        expect(document.activeElement).toBe(two);
    });
});
