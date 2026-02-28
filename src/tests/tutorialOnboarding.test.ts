import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    TUTORIAL_COMPLETED_SIGNAL,
    TUTORIAL_PROMPT_SIGNAL,
    TUTORIAL_RESUMED_SIGNAL,
    TUTORIAL_SKIPPED_SIGNAL,
    TUTORIAL_STARTED_SIGNAL,
    TUTORIAL_STEP_BLOCKED_SIGNAL,
    TUTORIAL_STEP_CHANGED_SIGNAL,
    TUTORIAL_STEP_COMPLETED_SIGNAL,
    createTutorialOnboardingService,
} from "@/services/tutorialOnboarding";

describe("tutorial onboarding service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("runs deterministic step flow with gating conditions", () => {
        const service = createTutorialOnboardingService();
        service.registerFlow({
            id: "intro",
            steps: [
                {
                    id: "move",
                    label: "Move",
                    gate: ({ context }) => context.moved === true,
                },
                {
                    id: "interact",
                    label: "Interact",
                    gate: ({ context }) => context.interacted === true,
                },
            ],
        });

        expect(service.start("intro")).toBe(true);
        expect(service.canAdvance()).toEqual({
            ok: false,
            reason: "gate-blocked",
        });

        service.setContext({ moved: true });
        expect(service.advance()).toBe(true);

        const step2 = service.getSnapshot();
        expect(step2.currentStepId).toBe("interact");

        service.setContext({ interacted: true });
        expect(service.advance()).toBe(true);

        const completed = service.getSnapshot();
        expect(completed.status).toBe("completed");
        expect(completed.completedStepIds).toEqual(["interact", "move"]);
    });

    it("supports skip and resume behavior", () => {
        const service = createTutorialOnboardingService();
        service.registerFlow({
            id: "intro",
            steps: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
            ],
        });

        service.start("intro");
        expect(service.skip()).toBe(true);
        expect(service.getSnapshot().status).toBe("skipped");

        expect(service.resume()).toBe(true);
        const resumed = service.getSnapshot();
        expect(resumed.status).toBe("active");
        expect(resumed.currentStepId).toBe("a");
    });

    it("supports completion persistence export and restore", () => {
        const service = createTutorialOnboardingService();
        service.registerFlow({
            id: "intro",
            steps: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
                { id: "c", label: "C" },
            ],
        });

        service.start("intro");
        service.advance();
        service.advance();

        const persisted = service.getPersistedState();

        const restoredService = createTutorialOnboardingService();
        restoredService.registerFlow({
            id: "intro",
            steps: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
                { id: "c", label: "C" },
            ],
        });

        expect(restoredService.restorePersistedState(persisted)).toBe(true);
        const snapshot = restoredService.getSnapshot();
        expect(snapshot.status).toBe("active");
        expect(snapshot.currentStepId).toBe("c");
        expect(snapshot.completedStepIds).toEqual(["a", "b"]);
    });

    it("emits start/step/prompt/skip/resume/completion lifecycle signals", () => {
        const events: string[] = [];

        signalBus.on(TUTORIAL_STARTED_SIGNAL, () => {
            events.push("start");
        });
        signalBus.on(TUTORIAL_STEP_CHANGED_SIGNAL, () => {
            events.push("step-changed");
        });
        signalBus.on(TUTORIAL_PROMPT_SIGNAL, () => {
            events.push("prompt");
        });
        signalBus.on(TUTORIAL_STEP_BLOCKED_SIGNAL, () => {
            events.push("blocked");
        });
        signalBus.on(TUTORIAL_STEP_COMPLETED_SIGNAL, () => {
            events.push("step-completed");
        });
        signalBus.on(TUTORIAL_SKIPPED_SIGNAL, () => {
            events.push("skip");
        });
        signalBus.on(TUTORIAL_RESUMED_SIGNAL, () => {
            events.push("resume");
        });
        signalBus.on(TUTORIAL_COMPLETED_SIGNAL, () => {
            events.push("completed");
        });

        const service = createTutorialOnboardingService();
        service.registerFlow({
            id: "intro",
            steps: [
                {
                    id: "a",
                    label: "A",
                    prompt: { channel: "textbox", message: "Press W" },
                    gate: ({ context }) => context.ready === true,
                },
                {
                    id: "b",
                    label: "B",
                    prompt: { channel: "dialogue", message: "Nice" },
                },
            ],
        });

        service.start("intro");
        service.advance();
        service.setContext({ ready: true });
        service.advance();
        service.skip();
        service.resume();
        service.advance();

        expect(events).toContain("start");
        expect(events).toContain("step-changed");
        expect(events).toContain("prompt");
        expect(events).toContain("blocked");
        expect(events).toContain("step-completed");
        expect(events).toContain("skip");
        expect(events).toContain("resume");
        expect(events).toContain("completed");
    });
});
