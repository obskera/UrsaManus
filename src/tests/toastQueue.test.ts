import { describe, expect, it } from "vitest";
import { createToastQueue } from "@/components/toasts";

describe("Toast queue helper", () => {
    it("uses FIFO queue sequencing", () => {
        const queue = createToastQueue();

        queue.enqueue({ id: "a", message: "A" });
        queue.enqueue({ id: "b", message: "B" });

        expect(queue.peek()?.id).toBe("a");
        expect(queue.dequeue()?.id).toBe("a");
        expect(queue.dequeue()?.id).toBe("b");
        expect(queue.dequeue()).toBeNull();
    });

    it("replaces entries by id deterministically", () => {
        const queue = createToastQueue();

        queue.enqueue({ id: "same", message: "Old", variant: "info" });
        queue.enqueue({ id: "same", message: "New", variant: "success" });

        expect(queue.size()).toBe(1);
        expect(queue.peek()?.message).toBe("New");
        expect(queue.peek()?.variant).toBe("success");
    });

    it("supports remove and clear operations", () => {
        const queue = createToastQueue();

        queue.enqueue({ id: "a", message: "A" });
        queue.enqueue({ id: "b", message: "B" });

        expect(queue.remove("b")?.id).toBe("b");
        expect(queue.remove("missing")).toBeNull();
        expect(queue.size()).toBe(1);

        queue.clear();
        expect(queue.size()).toBe(0);
    });
});
