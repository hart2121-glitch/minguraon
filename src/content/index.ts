import type { ItemDef, Scene } from "../game/types";
import ep1json from "./data/episodes/ep1.json";
import encjson from "./data/encounters/random.json";
import { adaptEpisode, adaptEncounters } from "./adapter";
import { HUB_SCENES } from "./hub";

export { STAT_DEFS, STAT_BY_KEY, emptyStats } from "./stats";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const episode = adaptEpisode(ep1json as any);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const encounters = adaptEncounters(encjson as any);

export const START_SCENE_ID = episode.startSceneId;

const ALL_SCENES: Scene[] = [...episode.scenes, ...encounters.scenes, ...HUB_SCENES];

export const SCENE_BY_ID: Record<string, Scene> = Object.fromEntries(
  ALL_SCENES.map((s) => [s.id, s]),
);

// "@random" 네비게이션이 고르는 인카운터 풀
export const ENCOUNTER_POOL: string[] = encounters.encounterIds;

const ALL_ITEMS: ItemDef[] = [...episode.items, ...encounters.items];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ALL_ITEMS.map((i) => [i.id, i]),
);

export const ITEM_DEFS = ALL_ITEMS;

export function getScene(id: string): Scene | undefined {
  return SCENE_BY_ID[id];
}
