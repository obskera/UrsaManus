import { mkdirSync, readFileSync, writeFileSync } from "fs";
import {
    assembleTileMapPayload,
    splitTileMapPayload,
    type TileMapSplitPayloadParts,
} from "../src/services/tileMapSplitPayload";
import type { TileMapPlacementPayload } from "../src/services/tileMapPlacement";

type Mode = "split" | "assemble";

const parseArg = (flag: string): string | undefined => {
    const index = process.argv.findIndex((entry) => entry === flag);
    if (index < 0) {
        return undefined;
    }

    return process.argv[index + 1];
};

const mode = (parseArg("--mode") ?? "split") as Mode;
const inputPath = parseArg("--input");
const outDir = parseArg("--out-dir") ?? "./tmp/tilemap-split";
const outputPath = parseArg("--output") ?? "./tmp/tilemap-assembled.json";

if (!inputPath) {
    console.error("Missing required --input path.");
    process.exit(1);
}

const readJson = <TValue>(path: string): TValue => {
    return JSON.parse(readFileSync(path, "utf8")) as TValue;
};

if (mode === "split") {
    const payload = readJson<TileMapPlacementPayload>(inputPath);
    const parts = splitTileMapPayload(payload);

    mkdirSync(outDir, { recursive: true });
    writeFileSync(
        `${outDir}/tilemap.core.json`,
        JSON.stringify(parts.core, null, 2),
    );
    writeFileSync(
        `${outDir}/tilemap.layers.json`,
        JSON.stringify(parts.layers, null, 2),
    );
    writeFileSync(
        `${outDir}/tilemap.overlays.json`,
        JSON.stringify(parts.overlays, null, 2),
    );

    console.log(`Split tilemap payload into ${outDir}`);
    process.exit(0);
}

const parts = {
    core: readJson<TileMapSplitPayloadParts["core"]>(
        `${inputPath}/tilemap.core.json`,
    ),
    layers: readJson<TileMapSplitPayloadParts["layers"]>(
        `${inputPath}/tilemap.layers.json`,
    ),
    overlays: readJson<TileMapSplitPayloadParts["overlays"]>(
        `${inputPath}/tilemap.overlays.json`,
    ),
};

const assembled = assembleTileMapPayload(parts);
mkdirSync(outputPath.split("/").slice(0, -1).join("/") || ".", {
    recursive: true,
});
writeFileSync(outputPath, JSON.stringify(assembled, null, 2));
console.log(`Assembled tilemap payload to ${outputPath}`);
