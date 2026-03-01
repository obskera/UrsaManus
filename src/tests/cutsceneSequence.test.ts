import { afterEach, describe, expect, it } from "vitest";
import { signalBus } from "@/services/signalBus";
import {
    CUTSCENE_SEQUENCE_COMPLETED_SIGNAL,
    CUTSCENE_SEQUENCE_STEP_SIGNAL,
    createCutsceneSequenceService,
} from "@/services/cutsceneSequence";

describe("cutscene sequence service", () => {
    afterEach(() => {
        signalBus.clear();
    });

    it("runs mixed steps with await-input and timed wait", () => {
        const textEvents: string[] = [];
        const toastEvents: string[] = [];
        const signals: string[] = [];
        const stepTypes: string[] = [];
        const completionReasons: string[] = [];

        signalBus.on(
            CUTSCENE_SEQUENCE_STEP_SIGNAL,
            (event: { stepType: string }) => {
                stepTypes.push(event.stepType);
            },
        );
        signalBus.on("game:signal", () => {
            signals.push("game:signal");
        });
        signalBus.on(
            CUTSCENE_SEQUENCE_COMPLETED_SIGNAL,
            (event: { reason: string }) => {
                completionReasons.push(event.reason);
            },
        );

        const service = createCutsceneSequenceService({
            now: () => 100,
            onText: (payload) => {
                textEvents.push(payload.text);
            },
            onToast: (payload) => {
                toastEvents.push(payload.message);
            },
        });

        const started = service.start(
            {
                id: "intro",
                skipPolicy: "disabled",
                steps: [
                    {
                        type: "text",
                        text: "Welcome",
                        awaitInput: true,
                    },
                    { type: "signal", signal: "game:signal" },
                    { type: "wait", durationMs: 150 },
                    { type: "toast", message: "Done" },
                ],
            },
            {
                onComplete: (reason) => {
                    completionReasons.push(`callback:${reason}`);
                },
            },
        );

        expect(started).toBe(true);
        expect(textEvents).toEqual(["Welcome"]);
        expect(service.continue()).toBe(true);
        expect(signals).toEqual(["game:signal"]);

        service.update(149);
        expect(service.getState()?.active).toBe(true);
        service.update(1);

        expect(toastEvents).toEqual(["Done"]);
        expect(service.getState()?.active).toBe(false);
        expect(stepTypes).toEqual(["text", "signal", "wait", "toast"]);
        expect(completionReasons).toEqual(["completed", "callback:completed"]);
    });

    it("supports hold-to-skip and instant skip policies", () => {
        const completionReasons: string[] = [];
        signalBus.on(
            CUTSCENE_SEQUENCE_COMPLETED_SIGNAL,
            (event: { reason: string }) => {
                completionReasons.push(event.reason);
            },
        );

        const service = createCutsceneSequenceService();
        service.start({
            id: "hold",
            skipPolicy: "hold-to-skip",
            holdToSkipMs: 300,
            steps: [{ type: "wait", durationMs: 5_000 }],
        });

        expect(service.skip()).toBe(false);
        service.setSkipHolding(true);
        service.update(200);
        expect(service.getState()?.active).toBe(true);
        service.update(100);
        expect(service.getState()?.active).toBe(false);

        service.start({
            id: "instant",
            skipPolicy: "instant",
            steps: [{ type: "wait", durationMs: 5_000 }],
        });
        expect(service.skip()).toBe(true);
        expect(service.getState()?.active).toBe(false);
        expect(completionReasons).toEqual(["skipped", "skipped"]);
    });
});
