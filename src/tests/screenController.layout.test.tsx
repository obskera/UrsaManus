import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ScreenControl from "../components/screenController/ScreenControl";
import ScreenControlGroup from "../components/screenController/ScreenControlGroup";
import ScreenController from "../components/screenController/screenController";

describe("screenController layout", () => {
    it("renders ScreenControl and calls onActivate", () => {
        const onActivate = vi.fn();

        render(<ScreenControl label="Fire" onActivate={onActivate} />);

        fireEvent.click(screen.getByRole("button", { name: "Fire" }));

        expect(onActivate).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("button", { name: "Fire" })).toHaveClass(
            "screen-control",
        );
    });

    it("applies custom className and blurs after mouse/touch release", () => {
        const blurSpy = vi.spyOn(HTMLButtonElement.prototype, "blur");

        render(<ScreenControl label="A" className="custom" />);

        const button = screen.getByRole("button", { name: "A" });
        expect(button).toHaveClass("screen-control", "custom");

        fireEvent.mouseUp(button);
        fireEvent.touchEnd(button);

        expect(blurSpy).toHaveBeenCalled();
        blurSpy.mockRestore();
    });

    it("renders ScreenController and ScreenControlGroup wrappers", () => {
        render(
            <ScreenController className="layout">
                <ScreenControlGroup title="Group 1" className="zone">
                    <ScreenControl label="B" />
                </ScreenControlGroup>
            </ScreenController>,
        );

        expect(screen.getByText("Group 1")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
        expect(screen.getByText("Group 1").closest("section")).toHaveClass(
            "screen-control-group",
            "zone",
        );
    });

    it("supports ScreenControlGroup without title", () => {
        render(
            <ScreenControlGroup>
                <ScreenControl label="C" />
            </ScreenControlGroup>,
        );

        expect(screen.getByRole("button", { name: "C" })).toBeInTheDocument();
        expect(screen.queryByRole("heading")).toBeNull();
    });

    it("renders ScreenController with default className when none is provided", () => {
        const { container } = render(
            <ScreenController>
                <ScreenControl label="Default" />
            </ScreenController>,
        );

        const wrapper = container.firstElementChild;
        expect(wrapper).toHaveClass("screen-controller");
        expect(wrapper).not.toHaveClass("layout");
    });
});
