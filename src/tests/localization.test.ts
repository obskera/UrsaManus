import { describe, expect, it } from "vitest";
import {
    createLocalizationService,
    resolveLocalizedPromptMessage,
} from "@/services/localization";
import { createTutorialOnboardingService } from "@/services/tutorialOnboarding";

describe("localization service", () => {
    it("resolves requested locale with fallback locale behavior", () => {
        const localization = createLocalizationService({
            locale: "es",
            fallbackLocale: "en",
            catalogs: {
                en: {
                    "tutorial.move": "Press {key} to move",
                    "tutorial.ready": "Ready",
                },
                es: {
                    "tutorial.ready": "Listo",
                },
            },
        });

        expect(
            localization.translate("tutorial.move", {
                params: { key: "W" },
            }),
        ).toBe("Press W to move");
        expect(localization.translate("tutorial.ready")).toBe("Listo");
        expect(
            localization.translate("missing.key", {
                fallback: "Fallback copy",
            }),
        ).toBe("Fallback copy");
    });

    it("resolves prompt payload text keys for dialogue/textbox/toast channels", () => {
        const localization = createLocalizationService({
            locale: "en",
            fallbackLocale: "en",
            catalogs: {
                en: {
                    "tutorial.dialogue.ok": "Great job",
                    "tutorial.textbox.move": "Press {key}",
                    "tutorial.toast.saved": "Saved to slot {slot}",
                },
            },
        });

        expect(
            resolveLocalizedPromptMessage(localization, {
                channel: "dialogue",
                message: "fallback",
                payload: {
                    dialogueKey: "tutorial.dialogue.ok",
                },
            }),
        ).toBe("Great job");

        expect(
            resolveLocalizedPromptMessage(localization, {
                channel: "textbox",
                message: "fallback",
                payload: {
                    textKey: "tutorial.textbox.move",
                    textParams: { key: "E" },
                },
            }),
        ).toBe("Press E");

        expect(
            resolveLocalizedPromptMessage(localization, {
                channel: "toast",
                message: "fallback",
                payload: {
                    toastKey: "tutorial.toast.saved",
                    toastParams: { slot: 2 },
                },
            }),
        ).toBe("Saved to slot 2");
    });

    it("localizes tutorial prompt emission when a resolver is provided", () => {
        const localization = createLocalizationService({
            locale: "es",
            fallbackLocale: "en",
            catalogs: {
                en: {
                    "tutorial.step.move": "Press {key}",
                },
                es: {
                    "tutorial.step.move": "Pulsa {key}",
                },
            },
        });

        const emitted: Array<{ signal: string; payload: unknown }> = [];

        const service = createTutorialOnboardingService({
            emit: (signal, payload) => {
                emitted.push({ signal, payload });
            },
            localizePrompt: (input) =>
                resolveLocalizedPromptMessage(localization, {
                    channel: input.channel,
                    message: input.message,
                    ...(input.payload ? { payload: input.payload } : {}),
                }),
        });

        service.registerFlow({
            id: "intro",
            steps: [
                {
                    id: "move",
                    label: "Move",
                    prompt: {
                        channel: "textbox",
                        message: "fallback",
                        payload: {
                            textboxKey: "tutorial.step.move",
                            textboxParams: { key: "W" },
                        },
                    },
                },
            ],
        });

        expect(service.start("intro")).toBe(true);

        const promptEvent = emitted.find(
            (event) => event.signal === "tutorial:onboarding:prompt",
        );
        expect(promptEvent).toBeTruthy();

        const promptPayload =
            promptEvent && typeof promptEvent.payload === "object"
                ? (promptEvent.payload as {
                      prompt?: { message?: string };
                  })
                : null;

        expect(promptPayload?.prompt?.message).toBe("Pulsa W");
    });
});
