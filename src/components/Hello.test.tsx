import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Hello from "./Hello";

describe("Hello", () => {
    it("renders name", () => {
        render(<Hello name="UrsaManus" />);
        expect(
            screen.getByRole("heading", { name: "Hello UrsaManus" }),
        ).toBeInTheDocument();
    });
});
