import type { EntityType, Position } from "@/logic/entity/Entity";
import type { WorldSpawnAnchorsResult } from "./tileToWorld";

export type SpawnEntityTag = "player-start" | "objective" | "enemy" | "item";

export type DataBusSpawnEntityPayload = {
    id: string;
    name: string;
    type: EntityType;
    tag: SpawnEntityTag;
    position: Position;
    roomIndex: number;
    tileId?: number;
};

export type DataBusSpawnTypeMap = Partial<Record<SpawnEntityTag, EntityType>>;

export type CreateDataBusSpawnPayloadOptions = {
    anchors: WorldSpawnAnchorsResult;
    idPrefix?: string;
    namePrefix?: string;
    typeMap?: DataBusSpawnTypeMap;
};

const DEFAULT_TYPE_MAP: Record<SpawnEntityTag, EntityType> = {
    "player-start": "player",
    objective: "object",
    enemy: "enemy",
    item: "object",
};

function resolveType(tag: SpawnEntityTag, typeMap?: DataBusSpawnTypeMap) {
    return typeMap?.[tag] ?? DEFAULT_TYPE_MAP[tag];
}

function createPayload(
    tag: SpawnEntityTag,
    index: number,
    {
        x,
        y,
        roomIndex,
        tileId,
    }: {
        x: number;
        y: number;
        roomIndex: number;
        tileId?: number;
    },
    {
        idPrefix,
        namePrefix,
        typeMap,
    }: {
        idPrefix: string;
        namePrefix: string;
        typeMap?: DataBusSpawnTypeMap;
    },
): DataBusSpawnEntityPayload {
    const normalizedTag = tag.replace("-", "_");

    return {
        id: `${idPrefix}:${normalizedTag}:${index}`,
        name: `${namePrefix}_${normalizedTag}_${index}`,
        type: resolveType(tag, typeMap),
        tag,
        position: { x, y },
        roomIndex,
        tileId,
    };
}

export function createDataBusSpawnPayloads({
    anchors,
    idPrefix = "wg",
    namePrefix = "wg",
    typeMap,
}: CreateDataBusSpawnPayloadOptions): DataBusSpawnEntityPayload[] {
    const payloads: DataBusSpawnEntityPayload[] = [];

    payloads.push(
        createPayload("player-start", 0, anchors.playerStart, {
            idPrefix,
            namePrefix,
            typeMap,
        }),
    );
    payloads.push(
        createPayload("objective", 0, anchors.objective, {
            idPrefix,
            namePrefix,
            typeMap,
        }),
    );

    anchors.enemySpawns.forEach((anchor, index) => {
        payloads.push(
            createPayload("enemy", index, anchor, {
                idPrefix,
                namePrefix,
                typeMap,
            }),
        );
    });

    anchors.itemSpawns.forEach((anchor, index) => {
        payloads.push(
            createPayload("item", index, anchor, {
                idPrefix,
                namePrefix,
                typeMap,
            }),
        );
    });

    return payloads;
}

export function createDataBusSpawnPayloadRecord(
    options: CreateDataBusSpawnPayloadOptions,
): Record<string, DataBusSpawnEntityPayload> {
    return createDataBusSpawnPayloads(options).reduce<
        Record<string, DataBusSpawnEntityPayload>
    >((accumulator, payload) => {
        accumulator[payload.id] = payload;
        return accumulator;
    }, {});
}
