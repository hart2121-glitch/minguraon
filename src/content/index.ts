import type { Scene } from "../game/types";
import { EP1_SCENES, ENCOUNTER_SCENES } from "./episodes/ep1";

export { STAT_DEFS, STAT_BY_KEY, emptyStats } from "./stats";
export { ITEM_DEFS, ITEM_BY_ID } from "./items";

export const START_SCENE_ID = "ep1_arrival";

const ALL_SCENES: Scene[] = [...EP1_SCENES, ...ENCOUNTER_SCENES];

export const SCENE_BY_ID: Record<string, Scene> = Object.fromEntries(
  ALL_SCENES.map((s) => [s.id, s]),
);

// "@random" 네비게이션이 고르는 인카운터 풀
export const ENCOUNTER_POOL: string[] = ENCOUNTER_SCENES.map((s) => s.id);

export function getScene(id: string): Scene | undefined {
  return SCENE_BY_ID[id];
}
