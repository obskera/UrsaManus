import { describe, expect, it } from "vitest";
import { createTextBoxQueue } from "@/components/textBox";

describe("TextBox queue helper", () => {
    it("uses FIFO sequencing for queue policy", () => {
        const queue = createTextBoxQueue("queue");

        queue.enqueue({ id: "a", text: "A" });
        queue.enqueue({ id: "b", text: "B" });
        queue.enqueue({ id: "c", text: "C" });

        expect(queue.getActive()?.id).toBe("a");
        expect(queue.dequeue()?.id).toBe("a");
        expect(queue.dequeue()?.id).toBe("b");
        expect(queue.dequeue()?.id).toBe("c");
        expect(queue.dequeue()).toBeNull();
    });

    it("uses LIFO sequencing for stack policy", () => {
        const stack = createTextBoxQueue("stack");

        stack.enqueue({ id: "a", text: "A" });
        stack.enqueue({ id: "b", text: "B" });
        stack.enqueue({ id: "c", text: "C" });

        expect(stack.getActive()?.id).toBe("c");
        expect(stack.dequeue()?.id).toBe("c");
        expect(stack.dequeue()?.id).toBe("b");
        expect(stack.dequeue()?.id).toBe("a");
        expect(stack.dequeue()).toBeNull();
    });

    it("replaces existing entries by id deterministically", () => {
        const queue = createTextBoxQueue("queue");

        queue.enqueue({ id: "same", text: "Old" });
        queue.enqueue({ id: "same", text: "New" });

        expect(queue.size()).toBe(1);
        expect(queue.getActive()?.text).toBe("New");
    });
});
