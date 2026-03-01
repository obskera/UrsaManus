import {
    type CutsceneSequenceDefinition,
    type CutsceneStep,
} from "@/services/cutsceneSequence";

export type DialogueChoiceDefinition = {
    id: string;
    label: string;
    next: string;
    tags?: string[];
};

export type DialogueNodeDefinition = {
    id: string;
    text: string;
    speakerId?: string;
    speakerName?: string;
    portrait?: string;
    emotion?: string;
    voiceCue?: string;
    awaitInput?: boolean;
    speedMs?: number;
    choices?: DialogueChoiceDefinition[];
    next?: string;
    tags?: string[];
};

export type DialogueConversationDefinition = {
    id: string;
    speakerId?: string;
    speakerName?: string;
    nodes: DialogueNodeDefinition[];
    startId: string;
};

export type DialogueValidationResult =
    | {
          ok: true;
          value: DialogueConversationDefinition;
          warnings: string[];
      }
    | {
          ok: false;
          errors: string[];
      };

export type DialogueResolveChoice = (input: {
    conversationId: string;
    node: DialogueNodeDefinition;
    choices: DialogueChoiceDefinition[];
}) => string;

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function asString(value: unknown): string {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim();
}

function asOptionalString(value: unknown): string | undefined {
    const normalized = asString(value);
    return normalized ? normalized : undefined;
}

function asOptionalStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const normalized = value.map((entry) => asString(entry)).filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
    if (typeof value !== "boolean") {
        return undefined;
    }

    return value;
}

function asOptionalNumber(value: unknown): number | undefined {
    if (!Number.isFinite(value)) {
        return undefined;
    }

    return Math.max(0, Math.floor(value as number));
}

function parseChoices(
    rawValue: unknown,
    errors: string[],
): DialogueChoiceDefinition[] | undefined {
    if (rawValue === undefined) {
        return undefined;
    }

    if (!Array.isArray(rawValue)) {
        errors.push("choices must be an array when provided.");
        return undefined;
    }

    const parsed: DialogueChoiceDefinition[] = [];
    const choiceIds = new Set<string>();
    for (const entry of rawValue) {
        const choice = asObject(entry);
        if (!choice) {
            errors.push("choice entries must be objects.");
            continue;
        }

        const id = asString(choice.id);
        const label = asString(choice.label);
        const next = asString(choice.next);
        if (!id || !label || !next) {
            errors.push("choice entries require id, label, and next.");
            continue;
        }

        if (choiceIds.has(id)) {
            errors.push(`duplicate choice id '${id}'.`);
            continue;
        }

        choiceIds.add(id);
        parsed.push({
            id,
            label,
            next,
            ...(asOptionalStringArray(choice.tags)
                ? { tags: asOptionalStringArray(choice.tags) }
                : {}),
        });
    }

    return parsed;
}

function parseNode(
    rawNode: unknown,
    index: number,
    errors: string[],
): DialogueNodeDefinition | null {
    const node = asObject(rawNode);
    if (!node) {
        errors.push(`node at index ${index} must be an object.`);
        return null;
    }

    const id = asString(node.id);
    const text = asString(node.text);

    if (!id || !text) {
        errors.push(`node at index ${index} requires non-empty id and text.`);
        return null;
    }

    const parsedChoices = parseChoices(node.choices, errors);

    return {
        id,
        text,
        ...(asOptionalString(node.speakerId)
            ? { speakerId: asOptionalString(node.speakerId) }
            : {}),
        ...(asOptionalString(node.speakerName)
            ? { speakerName: asOptionalString(node.speakerName) }
            : {}),
        ...(asOptionalString(node.portrait)
            ? { portrait: asOptionalString(node.portrait) }
            : {}),
        ...(asOptionalString(node.emotion)
            ? { emotion: asOptionalString(node.emotion) }
            : {}),
        ...(asOptionalString(node.voiceCue)
            ? { voiceCue: asOptionalString(node.voiceCue) }
            : {}),
        ...(asOptionalBoolean(node.awaitInput) === undefined
            ? {}
            : { awaitInput: asOptionalBoolean(node.awaitInput) }),
        ...(asOptionalNumber(node.speedMs) === undefined
            ? {}
            : { speedMs: asOptionalNumber(node.speedMs) }),
        ...(parsedChoices ? { choices: parsedChoices } : {}),
        ...(asOptionalString(node.next)
            ? { next: asOptionalString(node.next) }
            : {}),
        ...(asOptionalStringArray(node.tags)
            ? { tags: asOptionalStringArray(node.tags) }
            : {}),
    };
}

export function parseDialogueConversation(
    payload: unknown,
): DialogueValidationResult {
    const root = asObject(payload);
    if (!root) {
        return {
            ok: false,
            errors: ["dialogue payload must be an object."],
        };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const id = asString(root.id) || "dialogue";
    const speakerName = asOptionalString(root.speakerName ?? root.character);
    const speakerId = asOptionalString(root.speakerId);

    if (Array.isArray(root.dialogues) && !Array.isArray(root.nodes)) {
        const legacyLines = root.dialogues
            .map((entry) => asString(entry))
            .filter(Boolean);

        if (legacyLines.length === 0) {
            return {
                ok: false,
                errors: [
                    "legacy dialogues payload must include non-empty lines.",
                ],
            };
        }

        warnings.push("converted legacy { character, dialogues } payload.");
        const nodes = legacyLines.map((line, index) => {
            const nodeId = `${id}-line-${index + 1}`;
            const next =
                index < legacyLines.length - 1
                    ? `${id}-line-${index + 2}`
                    : undefined;
            return {
                id: nodeId,
                text: line,
                ...(speakerName ? { speakerName } : {}),
                ...(speakerId ? { speakerId } : {}),
                ...(next ? { next } : {}),
            };
        });

        return {
            ok: true,
            warnings,
            value: {
                id,
                ...(speakerName ? { speakerName } : {}),
                ...(speakerId ? { speakerId } : {}),
                nodes,
                startId: nodes[0].id,
            },
        };
    }

    if (!Array.isArray(root.nodes)) {
        return {
            ok: false,
            errors: ["dialogue payload requires a nodes array."],
        };
    }

    const nodes: DialogueNodeDefinition[] = [];
    const nodeIds = new Set<string>();
    for (let index = 0; index < root.nodes.length; index += 1) {
        const parsed = parseNode(root.nodes[index], index, errors);
        if (!parsed) {
            continue;
        }

        if (nodeIds.has(parsed.id)) {
            errors.push(`duplicate node id '${parsed.id}'.`);
            continue;
        }

        nodeIds.add(parsed.id);
        nodes.push(parsed);
    }

    if (nodes.length === 0) {
        errors.push("dialogue payload requires at least one valid node.");
    }

    const startId = asString(root.startId) || (nodes[0] ? nodes[0].id : "");
    if (!startId) {
        errors.push("dialogue payload requires startId or first valid node.");
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    if (startId && !nodeMap.has(startId)) {
        errors.push(`startId '${startId}' does not reference a node.`);
    }

    for (const node of nodes) {
        if (node.next && !nodeMap.has(node.next)) {
            errors.push(
                `node '${node.id}' references unknown next '${node.next}'.`,
            );
        }

        for (const choice of node.choices ?? []) {
            if (!nodeMap.has(choice.next)) {
                errors.push(
                    `choice '${choice.id}' in node '${node.id}' references unknown next '${choice.next}'.`,
                );
            }
        }
    }

    if (errors.length > 0) {
        return {
            ok: false,
            errors,
        };
    }

    return {
        ok: true,
        warnings,
        value: {
            id,
            ...(speakerName ? { speakerName } : {}),
            ...(speakerId ? { speakerId } : {}),
            nodes,
            startId,
        },
    };
}

export function resolveDialoguePath(
    conversation: DialogueConversationDefinition,
    options?: {
        startId?: string;
        resolveChoice?: DialogueResolveChoice;
        maxSteps?: number;
    },
): DialogueNodeDefinition[] {
    const maxSteps = Math.max(1, Math.floor(options?.maxSteps ?? 500));
    const nodeMap = new Map(conversation.nodes.map((node) => [node.id, node]));
    const nodesByOrder = [...conversation.nodes];
    const fallbackOrderIndex = new Map<string, number>(
        nodesByOrder.map((node, index) => [node.id, index]),
    );

    const startId = options?.startId?.trim() || conversation.startId;
    const firstNode = nodeMap.get(startId);
    if (!firstNode) {
        return [];
    }

    const resolved: DialogueNodeDefinition[] = [];
    const seen = new Set<string>();
    let current: DialogueNodeDefinition | undefined = firstNode;

    for (let step = 0; step < maxSteps && current; step += 1) {
        resolved.push(current);

        if (seen.has(current.id)) {
            break;
        }
        seen.add(current.id);

        if (current.choices && current.choices.length > 0) {
            const choiceId =
                options?.resolveChoice?.({
                    conversationId: conversation.id,
                    node: current,
                    choices: [...current.choices],
                }) ?? current.choices[0].id;

            const chosen =
                current.choices.find((choice) => choice.id === choiceId) ??
                current.choices[0];
            current = nodeMap.get(chosen.next);
            continue;
        }

        if (current.next) {
            current = nodeMap.get(current.next);
            continue;
        }

        const orderIndex = fallbackOrderIndex.get(current.id) ?? -1;
        if (orderIndex >= 0 && orderIndex + 1 < nodesByOrder.length) {
            current = nodesByOrder[orderIndex + 1];
            continue;
        }

        current = undefined;
    }

    return resolved;
}

export function dialoguePathToCutsceneSteps(
    nodes: DialogueNodeDefinition[],
): CutsceneStep[] {
    return nodes.map((node) => ({
        type: "text",
        text: node.text,
        ...(node.speakerName ? { speakerName: node.speakerName } : {}),
        ...(node.portrait ? { portrait: node.portrait } : {}),
        ...(node.emotion ? { emotion: node.emotion } : {}),
        ...(node.voiceCue ? { voiceCue: node.voiceCue } : {}),
        ...(node.awaitInput === undefined
            ? {}
            : { awaitInput: node.awaitInput }),
        ...(Number.isFinite(node.speedMs) ? { speedMs: node.speedMs } : {}),
    }));
}

export function dialoguePayloadToCutsceneSequence(
    payload: unknown,
    options?: {
        sequenceId?: string;
        resolveChoice?: DialogueResolveChoice;
        startId?: string;
        skipPolicy?: CutsceneSequenceDefinition["skipPolicy"];
    },
):
    | {
          ok: true;
          sequence: CutsceneSequenceDefinition;
          warnings: string[];
      }
    | {
          ok: false;
          errors: string[];
      } {
    const parsed = parseDialogueConversation(payload);
    if (!parsed.ok) {
        return {
            ok: false,
            errors: parsed.errors,
        };
    }

    const path = resolveDialoguePath(parsed.value, {
        ...(options?.startId ? { startId: options.startId } : {}),
        ...(options?.resolveChoice
            ? { resolveChoice: options.resolveChoice }
            : {}),
    });
    const steps = dialoguePathToCutsceneSteps(path);

    if (steps.length === 0) {
        return {
            ok: false,
            errors: ["dialogue path resolved to zero steps."],
        };
    }

    return {
        ok: true,
        warnings: parsed.warnings,
        sequence: {
            id: options?.sequenceId?.trim() || `${parsed.value.id}-cutscene`,
            steps,
            ...(options?.skipPolicy ? { skipPolicy: options.skipPolicy } : {}),
        },
    };
}
