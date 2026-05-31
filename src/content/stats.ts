import type { StatDef, StatKey, Stats } from "../game/types";

export const STAT_DEFS: StatDef[] = [
  // 행동 스탯 — 무엇을 할 수 있는가 (두 플레이어 공통 성장 가능)
  { key: "combat", name: "전투력", kind: "action", desc: "맞서 싸우고 버티는 힘." },
  { key: "investigation", name: "탐색력", kind: "action", desc: "흔적을 찾고 단서를 읽어내는 눈." },
  { key: "negotiation", name: "교섭력", kind: "action", desc: "말로 풀고 사람을 움직이는 능력." },
  // 감각/지식 스탯 — 무엇을 인식·해석할 수 있는가 (루팅으로 분화)
  { key: "spiritSight", name: "령안", kind: "sense", desc: "보이지 않는 것을 보는 감각." },
  { key: "occultLore", name: "오컬트 지식", kind: "sense", desc: "괴이의 정체와 규칙을 아는 지식." },
  { key: "psychology", name: "심리 분석", kind: "sense", desc: "사람의 속내와 거짓을 읽는 통찰." },
];

export const STAT_BY_KEY: Record<StatKey, StatDef> = Object.fromEntries(
  STAT_DEFS.map((s) => [s.key, s]),
) as Record<StatKey, StatDef>;

export function emptyStats(): Stats {
  return {
    combat: 0,
    investigation: 0,
    negotiation: 0,
    spiritSight: 0,
    occultLore: 0,
    psychology: 0,
  };
}
