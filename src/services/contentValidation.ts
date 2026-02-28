import { createVersionedSchemaMigration } from "@/services/schemaMigration";
import {
    createQuestMissionService,
    type QuestMissionDefinition,
} from "@/services/questMissions";
import {
    createLootEconomyService,
    type LootAffixPool,
    type LootDropTableDefinition,
    type LootEconomyTableDefinition,
    type LootRewardBundleDefinition,
} from "@/services/lootEconomy";
import { createWorldEntityPlacementService } from "@/services/worldEntityPlacement";

export type AuthoredContentDomain = "dialogue" | "quest" | "loot" | "placement";

export type ContentValidationIssue = {
    path: string;
    message: string;
};

export type ContentValidationReport = {
    domain: AuthoredContentDomain;
    ok: boolean;
    issues: ContentValidationIssue[];
};

type DialogueChoice = {
    id: string;
    label: string;
    next: string;
};

type DialogueNode = {
    id: string;
    text: string;
    next?: string;
    choices?: DialogueChoice[];
};

type DialogueConversation = {
    id: string;
    start: string;
    nodes: DialogueNode[];
};

type DialoguePayloadV1 = {
    version: 1;
    conversations: DialogueConversation[];
};

type QuestPayloadV1 = {
    version: 1;
    missions: QuestMissionDefinition[];
};

type LootPayloadV1 = {
    version: 1;
    dropTables?: LootDropTableDefinition[];
    affixPools?: LootAffixPool[];
    economyTables?: LootEconomyTableDefinition[];
    rewardBundles?: LootRewardBundleDefinition[];
};

const DIALOGUE_CURRENT_VERSION = 1;
const QUEST_CURRENT_VERSION = 1;
const LOOT_CURRENT_VERSION = 1;

const isObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

const isString = (value: unknown): value is string => {
    return typeof value === "string";
};

const dialogueMigration = createVersionedSchemaMigration<DialoguePayloadV1>({
    currentVersion: DIALOGUE_CURRENT_VERSION,
    validateCurrent: (payload: unknown): payload is DialoguePayloadV1 => {
        if (!isObject(payload)) {
            return false;
        }

        if (payload.version !== DIALOGUE_CURRENT_VERSION) {
            return false;
        }

        return Array.isArray(payload.conversations);
    },
});

const questMigration = createVersionedSchemaMigration<QuestPayloadV1>({
    currentVersion: QUEST_CURRENT_VERSION,
    validateCurrent: (payload: unknown): payload is QuestPayloadV1 => {
        if (!isObject(payload)) {
            return false;
        }

        if (payload.version !== QUEST_CURRENT_VERSION) {
            return false;
        }

        return Array.isArray(payload.missions);
    },
});

const lootMigration = createVersionedSchemaMigration<LootPayloadV1>({
    currentVersion: LOOT_CURRENT_VERSION,
    validateCurrent: (payload: unknown): payload is LootPayloadV1 => {
        if (!isObject(payload)) {
            return false;
        }

        if (payload.version !== LOOT_CURRENT_VERSION) {
            return false;
        }

        if (
            payload.dropTables !== undefined &&
            !Array.isArray(payload.dropTables)
        ) {
            return false;
        }

        if (
            payload.affixPools !== undefined &&
            !Array.isArray(payload.affixPools)
        ) {
            return false;
        }

        if (
            payload.economyTables !== undefined &&
            !Array.isArray(payload.economyTables)
        ) {
            return false;
        }

        if (
            payload.rewardBundles !== undefined &&
            !Array.isArray(payload.rewardBundles)
        ) {
            return false;
        }

        return true;
    },
});

function parseJson(raw: string):
    | { ok: true; value: unknown }
    | {
          ok: false;
          issue: ContentValidationIssue;
      } {
    try {
        return {
            ok: true,
            value: JSON.parse(raw) as unknown,
        };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Invalid JSON payload.";
        return {
            ok: false,
            issue: {
                path: "$",
                message: `Invalid JSON: ${message}`,
            },
        };
    }
}

function validateDialoguePayload(
    payload: DialoguePayloadV1,
): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const conversationIds = new Set<string>();

    if (payload.conversations.length === 0) {
        issues.push({
            path: "$.conversations",
            message: "At least one conversation is required.",
        });
        return issues;
    }

    payload.conversations.forEach((conversation, conversationIndex) => {
        const conversationPath = `$.conversations[${conversationIndex}]`;

        if (!isObject(conversation)) {
            issues.push({
                path: conversationPath,
                message: "Conversation must be an object.",
            });
            return;
        }

        if (!isString(conversation.id) || conversation.id.trim().length === 0) {
            issues.push({
                path: `${conversationPath}.id`,
                message: "Conversation id is required.",
            });
            return;
        }

        if (conversationIds.has(conversation.id)) {
            issues.push({
                path: `${conversationPath}.id`,
                message: `Duplicate conversation id "${conversation.id}".`,
            });
            return;
        }

        conversationIds.add(conversation.id);

        if (
            !isString(conversation.start) ||
            conversation.start.trim().length === 0
        ) {
            issues.push({
                path: `${conversationPath}.start`,
                message: "Conversation start node id is required.",
            });
        }

        if (
            !Array.isArray(conversation.nodes) ||
            conversation.nodes.length === 0
        ) {
            issues.push({
                path: `${conversationPath}.nodes`,
                message: "Conversation nodes must be a non-empty array.",
            });
            return;
        }

        const nodeIds = new Set<string>();
        conversation.nodes.forEach((node, nodeIndex) => {
            const nodePath = `${conversationPath}.nodes[${nodeIndex}]`;
            if (!isObject(node)) {
                issues.push({
                    path: nodePath,
                    message: "Node must be an object.",
                });
                return;
            }

            if (!isString(node.id) || node.id.trim().length === 0) {
                issues.push({
                    path: `${nodePath}.id`,
                    message: "Node id is required.",
                });
                return;
            }

            if (nodeIds.has(node.id)) {
                issues.push({
                    path: `${nodePath}.id`,
                    message: `Duplicate node id "${node.id}".`,
                });
                return;
            }

            nodeIds.add(node.id);

            if (!isString(node.text) || node.text.trim().length === 0) {
                issues.push({
                    path: `${nodePath}.text`,
                    message: "Node text is required.",
                });
            }

            if (
                node.next !== undefined &&
                (!isString(node.next) || node.next.trim().length === 0)
            ) {
                issues.push({
                    path: `${nodePath}.next`,
                    message:
                        "Node next id must be a non-empty string when provided.",
                });
            }

            if (node.choices !== undefined) {
                if (!Array.isArray(node.choices)) {
                    issues.push({
                        path: `${nodePath}.choices`,
                        message: "Node choices must be an array when provided.",
                    });
                } else {
                    node.choices.forEach((choice, choiceIndex) => {
                        const choicePath = `${nodePath}.choices[${choiceIndex}]`;
                        if (!isObject(choice)) {
                            issues.push({
                                path: choicePath,
                                message: "Choice must be an object.",
                            });
                            return;
                        }

                        if (
                            !isString(choice.id) ||
                            choice.id.trim().length === 0
                        ) {
                            issues.push({
                                path: `${choicePath}.id`,
                                message: "Choice id is required.",
                            });
                        }

                        if (
                            !isString(choice.label) ||
                            choice.label.trim().length === 0
                        ) {
                            issues.push({
                                path: `${choicePath}.label`,
                                message: "Choice label is required.",
                            });
                        }

                        if (
                            !isString(choice.next) ||
                            choice.next.trim().length === 0
                        ) {
                            issues.push({
                                path: `${choicePath}.next`,
                                message: "Choice next node id is required.",
                            });
                        }
                    });
                }
            }
        });

        if (isString(conversation.start) && !nodeIds.has(conversation.start)) {
            issues.push({
                path: `${conversationPath}.start`,
                message: `Start node "${conversation.start}" is not defined in nodes.`,
            });
        }

        conversation.nodes.forEach((node, nodeIndex) => {
            const nodePath = `${conversationPath}.nodes[${nodeIndex}]`;

            if (isString(node.next) && !nodeIds.has(node.next)) {
                issues.push({
                    path: `${nodePath}.next`,
                    message: `Node next id "${node.next}" does not exist.`,
                });
            }

            if (Array.isArray(node.choices)) {
                node.choices.forEach((choice, choiceIndex) => {
                    if (isString(choice.next) && !nodeIds.has(choice.next)) {
                        issues.push({
                            path: `${nodePath}.choices[${choiceIndex}].next`,
                            message: `Choice next id "${choice.next}" does not exist.`,
                        });
                    }
                });
            }
        });
    });

    return issues;
}

function validateQuestPayload(
    payload: QuestPayloadV1,
): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const service = createQuestMissionService();

    if (payload.missions.length === 0) {
        issues.push({
            path: "$.missions",
            message: "At least one mission is required.",
        });
        return issues;
    }

    const seenMissionIds = new Set<string>();
    payload.missions.forEach((mission, index) => {
        const missionPath = `$.missions[${index}]`;

        if (!isObject(mission)) {
            issues.push({
                path: missionPath,
                message: "Mission must be an object.",
            });
            return;
        }

        if (!isString(mission.id) || mission.id.trim().length === 0) {
            issues.push({
                path: `${missionPath}.id`,
                message: "Mission id is required.",
            });
            return;
        }

        if (seenMissionIds.has(mission.id)) {
            issues.push({
                path: `${missionPath}.id`,
                message: `Duplicate mission id "${mission.id}".`,
            });
            return;
        }

        seenMissionIds.add(mission.id);

        if (
            !Array.isArray(mission.objectives) ||
            mission.objectives.length === 0
        ) {
            issues.push({
                path: `${missionPath}.objectives`,
                message: "Mission objectives must be a non-empty array.",
            });
            return;
        }

        if (!service.registerMission(mission)) {
            issues.push({
                path: missionPath,
                message:
                    "Mission definition failed runtime registration checks (ids, objective graph, or start objective references).",
            });
        }
    });

    return issues;
}

function validateLootPayload(payload: LootPayloadV1): ContentValidationIssue[] {
    const issues: ContentValidationIssue[] = [];
    const service = createLootEconomyService();

    const dropTables = payload.dropTables ?? [];
    const affixPools = payload.affixPools ?? [];
    const economyTables = payload.economyTables ?? [];
    const rewardBundles = payload.rewardBundles ?? [];

    if (
        dropTables.length === 0 &&
        affixPools.length === 0 &&
        economyTables.length === 0 &&
        rewardBundles.length === 0
    ) {
        issues.push({
            path: "$",
            message:
                "Payload must include at least one of dropTables, affixPools, economyTables, or rewardBundles.",
        });
        return issues;
    }

    const registeredDropTables = new Set<string>();
    const registeredAffixPools = new Set<string>();

    affixPools.forEach((pool, index) => {
        const path = `$.affixPools[${index}]`;
        if (!service.registerAffixPool(pool)) {
            issues.push({
                path,
                message: "Affix pool failed runtime registration checks.",
            });
            return;
        }

        const id = pool.id.trim();
        if (id) {
            registeredAffixPools.add(id);
        }
    });

    dropTables.forEach((table, tableIndex) => {
        const tablePath = `$.dropTables[${tableIndex}]`;
        if (!service.registerDropTable(table)) {
            issues.push({
                path: tablePath,
                message: "Drop table failed runtime registration checks.",
            });
            return;
        }

        const tableId = table.id.trim();
        if (tableId) {
            registeredDropTables.add(tableId);
        }

        table.entries.forEach((entry, entryIndex) => {
            entry.affixPoolIds?.forEach((affixPoolId, affixPoolIndex) => {
                if (!registeredAffixPools.has(affixPoolId.trim())) {
                    issues.push({
                        path: `${tablePath}.entries[${entryIndex}].affixPoolIds[${affixPoolIndex}]`,
                        message: `Referenced affix pool "${affixPoolId}" is not defined.`,
                    });
                }
            });
        });
    });

    economyTables.forEach((table, index) => {
        if (!service.registerEconomyTable(table)) {
            issues.push({
                path: `$.economyTables[${index}]`,
                message: "Economy table failed runtime registration checks.",
            });
        }
    });

    rewardBundles.forEach((bundle, bundleIndex) => {
        const bundlePath = `$.rewardBundles[${bundleIndex}]`;
        if (!service.registerRewardBundle(bundle)) {
            issues.push({
                path: bundlePath,
                message: "Reward bundle failed runtime registration checks.",
            });
            return;
        }

        bundle.dropTables?.forEach((reference, referenceIndex) => {
            if (!registeredDropTables.has(reference.tableId.trim())) {
                issues.push({
                    path: `${bundlePath}.dropTables[${referenceIndex}].tableId`,
                    message: `Referenced drop table "${reference.tableId}" is not defined.`,
                });
            }
        });
    });

    return issues;
}

function validatePlacementPayload(raw: string): ContentValidationIssue[] {
    const parserResult = parseJson(raw);
    if (!parserResult.ok) {
        return [parserResult.issue];
    }

    const service = createWorldEntityPlacementService();
    const importResult = service.importPayload(raw);
    if (importResult.ok) {
        return [];
    }

    return [
        {
            path: "$",
            message:
                importResult.message ??
                "Placement payload failed runtime import validation.",
        },
    ];
}

export function inferContentDomainFromPath(
    inputPath: string,
): AuthoredContentDomain | null {
    const normalized = inputPath.trim().toLowerCase();
    if (!normalized.endsWith(".json")) {
        return null;
    }

    if (
        normalized.includes("dialogue") ||
        normalized.includes("conversation")
    ) {
        return "dialogue";
    }

    if (normalized.includes("quest") || normalized.includes("mission")) {
        return "quest";
    }

    if (
        normalized.includes("loot") ||
        normalized.includes("economy") ||
        normalized.includes("drop-table")
    ) {
        return "loot";
    }

    if (
        normalized.includes("placement") ||
        normalized.includes("level") ||
        normalized.includes("editor") ||
        normalized.includes("map")
    ) {
        return "placement";
    }

    return null;
}

export function validateAuthoredContent(
    domain: AuthoredContentDomain,
    raw: string,
): ContentValidationReport {
    if (domain === "placement") {
        const issues = validatePlacementPayload(raw);
        return {
            domain,
            ok: issues.length === 0,
            issues,
        };
    }

    const parserResult = parseJson(raw);
    if (!parserResult.ok) {
        return {
            domain,
            ok: false,
            issues: [parserResult.issue],
        };
    }

    if (domain === "dialogue") {
        const migrated = dialogueMigration.migrate(parserResult.value);
        if (!migrated.ok) {
            return {
                domain,
                ok: false,
                issues: [
                    {
                        path: "$.version",
                        message: migrated.message,
                    },
                ],
            };
        }

        const issues = validateDialoguePayload(migrated.value);
        return {
            domain,
            ok: issues.length === 0,
            issues,
        };
    }

    if (domain === "quest") {
        const migrated = questMigration.migrate(parserResult.value);
        if (!migrated.ok) {
            return {
                domain,
                ok: false,
                issues: [
                    {
                        path: "$.version",
                        message: migrated.message,
                    },
                ],
            };
        }

        const issues = validateQuestPayload(migrated.value);
        return {
            domain,
            ok: issues.length === 0,
            issues,
        };
    }

    const migrated = lootMigration.migrate(parserResult.value);
    if (!migrated.ok) {
        return {
            domain,
            ok: false,
            issues: [
                {
                    path: "$.version",
                    message: migrated.message,
                },
            ],
        };
    }

    const issues = validateLootPayload(migrated.value);
    return {
        domain,
        ok: issues.length === 0,
        issues,
    };
}
