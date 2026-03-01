import {
    createPrefabRegistry,
    type PrefabRegistry,
} from "@/services/prefabCore";
import {
    createEnemyPrefabPack,
    createObjectPrefabPack,
    createPlayerPrefabPack,
} from "@/services/prefabPacks";
import { createRpgPlayerPrefabPreset } from "@/services/prefabRpgPlayer";

export function createDefaultPrefabRegistry(): PrefabRegistry {
    const registry = createPrefabRegistry();

    createRpgPlayerPrefabPreset({ registry });
    createPlayerPrefabPack("arpg-player", { registry });
    createEnemyPrefabPack("melee-chaser", { registry });
    createObjectPrefabPack("loot-chest", { registry });

    return registry;
}
