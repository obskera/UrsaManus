import { describe, expect, it } from "vitest";
import {
    dialoguePayloadToCutsceneSequence,
    parseDialogueConversation,
    resolveDialoguePath,
} from "@/services/dialogueCutscene";

describe("dialogue cutscene helpers", () => {
    it("parses legacy character/dialogues payload", () => {
        const parsed = parseDialogueConversation({
            id: "legacy-intro",
            character: "Guide",
            dialogues: ["Line 1", "Line 2"],
        });

        expect(parsed.ok).toBe(true);
        if (!parsed.ok) {
            return;
        }

        expect(parsed.value.nodes).toHaveLength(2);
        expect(parsed.value.startId).toBe("legacy-intro-line-1");
        expect(parsed.warnings).toEqual([
            "converted legacy { character, dialogues } payload.",
        ]);
    });

    it("resolves branching path with custom choice resolver", () => {
        const parsed = parseDialogueConversation({
            id: "branchy",
            startId: "start",
            nodes: [
                {
                    id: "start",
                    text: "Choose",
                    choices: [
                        { id: "left", label: "Left", next: "left-node" },
                        { id: "right", label: "Right", next: "right-node" },
                    ],
                },
                { id: "left-node", text: "Left branch", next: "end" },
                { id: "right-node", text: "Right branch", next: "end" },
                { id: "end", text: "Done" },
            ],
        });

        expect(parsed.ok).toBe(true);
        if (!parsed.ok) {
            return;
        }

        const path = resolveDialoguePath(parsed.value, {
            resolveChoice: () => "right",
        });

        expect(path.map((node) => node.id)).toEqual([
            "start",
            "right-node",
            "end",
        ]);
    });

    it("converts validated dialogue payload into cutscene sequence", () => {
        const converted = dialoguePayloadToCutsceneSequence(
            {
                id: "intro",
                startId: "a",
                nodes: [
                    {
                        id: "a",
                        text: "Hello",
                        speakerName: "Narrator",
                        next: "b",
                    },
                    {
                        id: "b",
                        text: "Proceed?",
                        awaitInput: true,
                    },
                ],
            },
            { skipPolicy: "instant" },
        );

        expect(converted.ok).toBe(true);
        if (!converted.ok) {
            return;
        }

        expect(converted.sequence.id).toBe("intro-cutscene");
        expect(converted.sequence.skipPolicy).toBe("instant");
        expect(converted.sequence.steps).toEqual([
            {
                type: "text",
                text: "Hello",
                speakerName: "Narrator",
            },
            {
                type: "text",
                text: "Proceed?",
                awaitInput: true,
            },
        ]);
    });

    it("rejects malformed dialogue payloads", () => {
        const converted = dialoguePayloadToCutsceneSequence({
            id: "bad",
            nodes: [{ id: "a", text: "Hi", next: "missing" }],
            startId: "a",
        });

        expect(converted.ok).toBe(false);
        if (converted.ok) {
            return;
        }

        expect(converted.errors[0]).toContain("references unknown next");
    });
});
