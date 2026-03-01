import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BgmComposerToolExample from "@/components/examples/BgmComposerToolExample";
import {
    TOOL_RECOVERY_SNAPSHOT_VERSION,
    buildToolRecoveryStorageKey,
} from "@/services/toolRecoverySnapshot";

const BGM_AUTOSAVE_STORAGE_KEY = buildToolRecoveryStorageKey("bgm");

describe("BgmComposerToolExample", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("validates starter json and reports success", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        await user.click(screen.getByRole("button", { name: "Validate JSON" }));

        expect(screen.getByText("Validation passed.")).toBeInTheDocument();
        expect(
            screen.getByText(/Palette: 4 sounds\. Steps: 7\./),
        ).toBeInTheDocument();
    });

    it("reports validation failure for invalid json", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;

        await user.clear(payload);
        await user.type(payload, "bad-json");
        await user.click(screen.getByRole("button", { name: "Validate JSON" }));

        expect(
            screen.getByText("Validation failed: invalid JSON."),
        ).toBeInTheDocument();
    });

    it("schedules and stops preview playback", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        await user.click(
            screen.getByRole("button", { name: "Preview sequence" }),
        );

        expect(
            screen.getByText(
                /Preview scheduled \(7 playable of 7 window steps, 1920ms window\)\./,
            ),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Stop preview" }));

        expect(screen.getByText("Preview stopped.")).toBeInTheDocument();
    });

    it("supports loop toggle and per-step override controls", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        await user.click(
            screen.getByRole("button", { name: "Loop preview: off" }),
        );
        expect(
            screen.getByRole("button", { name: "Loop preview: on" }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Mute step 0" }));
        expect(
            screen.getByRole("button", { name: "Unmute step 0" }),
        ).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Solo step 1" }));
        expect(
            screen.getByRole("button", { name: "Unsolo step 1" }),
        ).toBeInTheDocument();

        await user.selectOptions(screen.getAllByLabelText("Channel")[0], "sfx");

        await user.click(
            screen.getByRole("button", { name: "Preview sequence" }),
        );

        expect(
            screen.getByText(
                /Preview scheduled \(1 playable of 7 window steps/,
            ),
        ).toBeInTheDocument();
    });

    it("loads preset templates from the preset strip", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;

        await user.click(screen.getByRole("button", { name: "Preset: Intro" }));
        expect(screen.getByText("Loaded Intro preset.")).toBeInTheDocument();
        expect(payload.value).toContain('"name": "intro-fanfare-a"');

        await user.click(
            screen.getByRole("button", { name: "Preset: Battle" }),
        );
        expect(screen.getByText("Loaded Battle preset.")).toBeInTheDocument();
        expect(payload.value).toContain('"name": "battle-loop-b"');

        await user.click(
            screen.getByRole("button", { name: "Preset: Loop A" }),
        );
        expect(screen.getByText("Loaded Loop A preset.")).toBeInTheDocument();
        expect(payload.value).toContain('"name": "overworld-loop-a"');
    });

    it("imports a valid json file", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const importInput = screen.getByLabelText(
            "Import BGM JSON file",
        ) as HTMLInputElement;

        const importedPayload = {
            version: "um-bgm-v1",
            name: "custom-import",
            bpm: 120,
            stepMs: 125,
            loop: { startStep: 0, endStep: 8 },
            palette: [
                {
                    id: "sq1",
                    file: "assets/audio/chiptune/sq1.wav",
                },
            ],
            sequence: [
                {
                    step: 0,
                    soundId: "sq1",
                    lengthSteps: 2,
                    effect: "none",
                },
            ],
        };

        const file = new File(
            [JSON.stringify(importedPayload)],
            "imported.json",
            {
                type: "application/json",
            },
        );

        await user.upload(importInput, file);

        expect(screen.getByText("Imported imported.json.")).toBeInTheDocument();

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;
        expect(payload.value).toContain('"name": "custom-import"');
    });

    it("supports undo and redo for json edits", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;
        const initialValue = payload.value;

        await user.type(payload, " ");
        expect(payload.value).toBe(`${initialValue} `);
        expect(screen.getByText(/History: 2\/2\./)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Undo" }));
        expect(payload.value).toBe(initialValue);
        expect(
            screen.getByText(/^Undo applied\./, { selector: "p" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/History: 1\/2\./)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Redo" }));
        expect(payload.value).toBe(`${initialValue} `);
        expect(
            screen.getByText(/^Redo applied\./, { selector: "p" }),
        ).toBeInTheDocument();
        expect(screen.getByText(/History: 2\/2\./)).toBeInTheDocument();
    });

    it("adds and removes beforeunload guard based on dirty state", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;

        expect(screen.getByText(/Unsaved changes: No\./)).toBeInTheDocument();

        await user.type(payload, " ");
        expect(screen.getByText(/Unsaved changes: Yes\./)).toBeInTheDocument();

        const dirtyEvent = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(dirtyEvent);
        expect(dirtyEvent.defaultPrevented).toBe(true);

        await user.click(screen.getByRole("button", { name: "Undo" }));
        expect(screen.getByText(/Unsaved changes: No\./)).toBeInTheDocument();

        const cleanEvent = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(cleanEvent);
        expect(cleanEvent.defaultPrevented).toBe(false);
    });

    it("recovers autosave snapshot on initial load", () => {
        const recoveredPayload = {
            version: "um-bgm-v1",
            name: "autosave-recovered",
            bpm: 128,
            stepMs: 120,
            loop: { startStep: 0, endStep: 8 },
            palette: [{ id: "sq1", file: "assets/audio/chiptune/sq1.wav" }],
            sequence: [
                {
                    step: 0,
                    soundId: "sq1",
                    lengthSteps: 1,
                    effect: "none",
                },
            ],
        };

        window.localStorage.setItem(
            BGM_AUTOSAVE_STORAGE_KEY,
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "bgm",
                savedAt: "2026-03-01T00:00:00.000Z",
                payloadRaw: JSON.stringify(recoveredPayload),
            }),
        );

        render(<BgmComposerToolExample />);

        expect(
            screen.getByText("Recovered autosave snapshot."),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/Last autosave: 2026-03-01T00:00:00\.000Z/),
        ).toBeInTheDocument();

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;
        expect(payload.value).toContain('"name": "autosave-recovered"');
    });

    it("supports explicit autosave recovery controls", async () => {
        const user = userEvent.setup();

        window.localStorage.setItem(
            BGM_AUTOSAVE_STORAGE_KEY,
            JSON.stringify({
                version: TOOL_RECOVERY_SNAPSHOT_VERSION,
                toolKey: "bgm",
                savedAt: "2026-03-01T12:00:00.000Z",
                payloadRaw: JSON.stringify({
                    version: "um-bgm-v1",
                    name: "autosave-control",
                    bpm: 120,
                    stepMs: 120,
                    loop: { startStep: 0, endStep: 8 },
                    palette: [
                        {
                            id: "sq1",
                            file: "assets/audio/chiptune/sq1.wav",
                        },
                    ],
                    sequence: [
                        {
                            step: 0,
                            soundId: "sq1",
                            lengthSteps: 1,
                            effect: "none",
                        },
                    ],
                }),
            }),
        );

        render(<BgmComposerToolExample />);

        expect(
            screen.getByRole("button", { name: "Recover autosave" }),
        ).toBeEnabled();

        await user.click(
            screen.getByRole("button", { name: "Recover autosave" }),
        );

        expect(
            screen.getByText("Autosave snapshot is already applied."),
        ).toBeInTheDocument();

        await user.click(
            screen.getByRole("button", { name: "Clear autosave" }),
        );

        expect(
            screen.getByText("Cleared autosave snapshot."),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: "Recover autosave" }),
        ).toBeDisabled();
        expect(screen.getByText(/Last autosave: none/)).toBeInTheDocument();
    });

    it("launches runtime playtest when current BGM JSON is valid", async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

        render(<BgmComposerToolExample />);

        await user.click(
            screen.getByRole("button", { name: "Open in runtime playtest" }),
        );

        expect(openSpy).toHaveBeenCalledTimes(1);

        await waitFor(() => {
            const autosaveRaw = window.localStorage.getItem(
                BGM_AUTOSAVE_STORAGE_KEY,
            );
            expect(autosaveRaw).not.toBeNull();

            const envelope = JSON.parse(autosaveRaw ?? "{}") as {
                payloadRaw?: string;
            };
            expect(envelope.payloadRaw).toContain('"version": "um-bgm-v1"');
        });

        openSpy.mockRestore();
    });

    it("blocks runtime playtest launch when JSON is invalid", async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

        render(<BgmComposerToolExample />);

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;
        await user.clear(payload);
        await user.type(payload, "bad-json");

        await user.click(
            screen.getByRole("button", { name: "Open in runtime playtest" }),
        );

        expect(openSpy).not.toHaveBeenCalled();
        expect(
            screen.getByText(
                "Playtest launch failed: Validation failed: invalid JSON.",
            ),
        ).toBeInTheDocument();

        openSpy.mockRestore();
    });

    it("verifies BGM round-trip payload without semantic drift", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        await user.click(
            screen.getByRole("button", { name: "Verify round-trip" }),
        );

        expect(
            screen.getByText(
                "Round-trip verification passed: no semantic drift detected.",
            ),
        ).toBeInTheDocument();
    });

    it("reports BGM round-trip verification failure for invalid JSON", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;
        await user.clear(payload);
        await user.type(payload, "bad-json");

        await user.click(
            screen.getByRole("button", { name: "Verify round-trip" }),
        );

        expect(
            screen.getByText(
                "Round-trip verification failed: Validation failed: invalid JSON.",
            ),
        ).toBeInTheDocument();
    });

    it("writes autosave snapshot while editing", async () => {
        const user = userEvent.setup();
        render(<BgmComposerToolExample />);

        const payload = screen.getByLabelText(
            "BGM composition JSON",
        ) as HTMLTextAreaElement;

        await user.type(payload, " ");

        await waitFor(() => {
            const autosaveRaw = window.localStorage.getItem(
                BGM_AUTOSAVE_STORAGE_KEY,
            );
            expect(autosaveRaw).not.toBeNull();

            const envelope = JSON.parse(autosaveRaw ?? "{}") as {
                version?: string;
                toolKey?: string;
                payloadRaw?: string;
            };

            expect(envelope.version).toBe(TOOL_RECOVERY_SNAPSHOT_VERSION);
            expect(envelope.toolKey).toBe("bgm");
            expect(envelope.payloadRaw).toBe(payload.value);
        });
    });
});
