import type { ItemDef } from "../game/types";

export const ITEM_DEFS: ItemDef[] = [
  {
    id: "diary",
    name: "낡은 일기장",
    desc: "다이얼 자물쇠가 풀린 일기장. 사라진 아이의 마지막 나날이 적혀 있다.",
    consumable: false,
  },
  {
    id: "cold_coin",
    name: "차가운 동전",
    desc: "쥐고 있으면 손끝이 시리다. 망자의 노잣돈이라 한다.",
    consumable: false,
  },
  {
    id: "crumpled_bill",
    name: "구겨진 만 원",
    desc: "골목에서 주운 지폐. 어디든 쓸모는 있다.",
    consumable: true,
  },
  {
    id: "talisman",
    name: "관리인의 부적",
    desc: "유천당 관리인이 쥐여준 노란 부적. 한 번은 너를 지켜줄 것이다.",
    consumable: true,
  },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEM_DEFS.map((i) => [i.id, i]),
) as Record<string, ItemDef>;
