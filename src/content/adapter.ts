// 동료의 JSON 콘텐츠 포맷 → 게임 엔진의 Scene[]/ItemDef[] 변환 어댑터.
// 입력 JSON은 느슨하게 받고(any), 엔진 타입으로 정규화한다.
import type {
  Choice,
  Effect,
  EffectTarget,
  ItemDef,
  Requirement,
  Scene,
  Slot,
  StatKey,
} from "../game/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── 한글 스탯명 → StatKey ──
const STAT_MAP: Record<string, StatKey> = {
  전투력: "combat",
  탐색력: "investigation",
  교섭력: "negotiation",
  령안: "spiritSight",
  오컬트지식: "occultLore",
  심리분석: "psychology",
};

function statKey(name: string): StatKey {
  const norm = String(name).replace(/[ _]/g, "");
  const k = STAT_MAP[norm];
  if (!k) throw new Error(`알 수 없는 스탯명: ${name}`);
  return k;
}

function playerToTarget(who: string | undefined): EffectTarget {
  if (who === "player_A") return 0;
  if (who === "player_B") return 1;
  if (who === "both") return "both";
  return "self";
}

// 아이템은 1인 소유 — shared_or/누락은 slot0에게 지급(획득 후 OR 조건으로 공유 판정).
function itemRecipientTarget(who: string | undefined): EffectTarget {
  if (who === "player_B") return 1;
  if (who === "both") return "both";
  return 0; // player_A | shared_or | undefined
}

function parseCondition(cond: string | undefined): Effect["condition"] {
  if (!cond) return undefined;
  const m = /^flag:(.+)$/.exec(cond);
  if (m) return { flag: m[1], value: true };
  return undefined;
}

function joinLines(arr?: string[]): string | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr.join("\n");
}

function exclusiveText(arr: any[] | undefined, vis: string): string | undefined {
  const e = (arr || []).find((x) => x.visibility === vis);
  if (!e) return undefined;
  return Array.isArray(e.text) ? e.text.join("\n") : e.text;
}

interface Ctx {
  items: Map<string, ItemDef>;
  branchIds: Set<string>;
}

function registerItem(ctx: Ctx, def: ItemDef) {
  if (!ctx.items.has(def.id)) ctx.items.set(def.id, def);
}

function unlockToReq(u: any): Requirement | undefined {
  if (!u) return undefined;
  if (u.type === "stat") return { stats: { [statKey(u.stat)]: u.min } };
  if (u.type === "item") return { itemsAnyPlayer: [u.item_id] };
  return undefined;
}

function convEffect(ctx: Ctx, e: any): Effect | null {
  switch (e.type) {
    case "give_item": {
      let id: string;
      if (e.item) {
        id = e.item.item_id;
        registerItem(ctx, {
          id,
          name: e.item.name ?? id,
          desc: e.item.description ?? "",
          consumable: false,
        });
      } else {
        id = e.item_id;
      }
      return { type: "giveItem", itemId: id, target: itemRecipientTarget(e.recipient) };
    }
    case "set_flag":
      return { type: "flag", flag: e.flag, value: e.value ?? true };
    case "stat_change":
      return { type: "stat", stat: statKey(e.stat), delta: e.delta, target: playerToTarget(e.recipient) };
    case "world_state":
      return e.key === "spiritual_activity_level"
        ? { type: "spiritLevel", delta: e.delta }
        : null;
    default:
      return null;
  }
}

function rewardsToEffects(ctx: Ctx, rewards: any): Effect[] {
  const eff: Effect[] = [];
  for (const st of rewards.stats || []) {
    eff.push({
      type: "stat",
      stat: statKey(st.stat),
      delta: st.delta,
      target: playerToTarget(st.player),
      condition: parseCondition(st.condition),
    });
  }
  for (const it of rewards.items || []) {
    eff.push({ type: "giveItem", itemId: it.item_id, target: itemRecipientTarget(it.recipient) });
  }
  for (const w of rewards.world_state || []) {
    if (w.key === "spiritual_activity_level") eff.push({ type: "spiritLevel", delta: w.delta });
  }
  return eff;
}

function convChoice(ctx: Ctx, c: any, slot: Slot | "both"): Choice {
  const effects = (c.effects || [])
    .map((e: any) => convEffect(ctx, e))
    .filter((e: Effect | null): e is Effect => e !== null);

  const resultParts = [c.npc_response, c.additional_narrative, c.result_narrative].filter(
    (x: any): x is string => typeof x === "string" && x.length > 0,
  );
  const resultIfStat = c.additional_narrative_if_stat
    ? {
        stat: statKey(c.additional_narrative_if_stat.stat),
        min: c.additional_narrative_if_stat.min,
        text: c.additional_narrative_if_stat.text,
      }
    : undefined;

  return {
    id: c.choice_id,
    slot,
    label: c.text,
    requires: unlockToReq(c.unlock),
    effects: effects.length ? effects : undefined,
    goto: c.next_scene ?? undefined,
    resultNarrative: resultParts.length ? resultParts.join("\n\n") : undefined,
    resultIfStat,
  };
}

function collectChoiceGotos(s: any, into: Set<string>) {
  const all: any[] = [
    ...(s.choices || []),
    ...((s.choices_per_player && s.choices_per_player.player_A) || []),
    ...((s.choices_per_player && s.choices_per_player.player_B) || []),
  ];
  for (const c of all) if (c.next_scene) into.add(c.next_scene);
  if (s.next_scene) into.add(s.next_scene);
  if (s.logic) {
    if (s.logic.then) into.add(s.logic.then);
    if (s.logic.else_partial) into.add(s.logic.else_partial);
    if (s.logic.else) into.add(s.logic.else);
  }
}

function convScene(ctx: Ctx, s: any): Scene {
  // 서버 전용 분기 장면
  if (s.type === "branch_check") {
    return {
      id: s.scene_id,
      text: {},
      choices: [],
      mode: "either",
      branch: {
        ifBoth: s.logic.if_both || [],
        then: s.logic.then,
        elseIfOne: s.logic.else_if_one || [],
        partial: s.logic.else_partial,
        fallback: s.logic.else,
      },
    };
  }

  // 게임 오버 장면
  if (s.type === "game_over") {
    return {
      id: s.scene_id,
      title: "실패",
      text: { shared: s.message || "실패했습니다." },
      choices: [],
      mode: "either",
      gameover: true,
    };
  }

  // 일반 장면
  const sharedParts = [
    joinLines(s.narrative_shared_intro),
    joinLines(s.narrative),
    joinLines(s.narrative_continued),
    joinLines(s.narrative_shared),
  ].filter((x): x is string => !!x);
  const shared = sharedParts.length ? sharedParts.join("\n\n") : undefined;

  let perSlot: [string, string] | undefined;
  if (s.narrative_exclusive) {
    perSlot = [
      exclusiveText(s.narrative_exclusive, "player_A") || "",
      exclusiveText(s.narrative_exclusive, "player_B") || "",
    ];
  }

  const choices: Choice[] = [];
  for (const c of s.choices || []) choices.push(convChoice(ctx, c, "both"));
  const cpp = s.choices_per_player;
  if (cpp) {
    for (const c of cpp.player_A || []) choices.push(convChoice(ctx, c, 0));
    for (const c of cpp.player_B || []) choices.push(convChoice(ctx, c, 1));
  }

  let mode: Scene["mode"] = cpp || s.wait_for_both === true ? "both" : "either";

  // both 모드 네비게이션 대상 결정: 분기 장면으로 수렴 > 공통 goto > 첫 goto
  const gotos = choices.map((c) => c.goto).filter((g): g is string => !!g);
  let defaultGoto: string | undefined;
  const branchTarget = gotos.find((g) => ctx.branchIds.has(g));
  if (branchTarget) defaultGoto = branchTarget;
  else if (gotos.length && gotos.every((g) => g === gotos[0])) defaultGoto = gotos[0];
  else defaultGoto = gotos[0];

  let onEnter: Effect[] | undefined = s.rewards ? rewardsToEffects(ctx, s.rewards) : undefined;

  // 선택지 없는 서술 장면 → 합성 "계속" 선택지로 다음 장면 연결
  if (choices.length === 0) {
    const target = s.next_scene ?? (s.episode_end ? "hub" : undefined);
    if (target) {
      choices.push({
        id: `${s.scene_id}__cont`,
        slot: "both",
        label: s.episode_end ? "유천당으로 돌아간다" : "계속 ▸",
        goto: target,
      });
      mode = "either";
      defaultGoto = target;
    }
  }

  // 에피소드 종료 시 스토리 플래그 설정
  if (s.episode_end && Array.isArray(s.story_flags_set)) {
    const flagEffects: Effect[] = s.story_flags_set.map((f: string) => ({
      type: "flag" as const,
      flag: f,
      value: true,
    }));
    onEnter = [...(onEnter || []), ...flagEffects];
  }

  return {
    id: s.scene_id,
    title: s.title,
    text: { shared, perSlot },
    choices,
    mode,
    defaultGoto,
    onEnter: onEnter && onEnter.length ? onEnter : undefined,
  };
}

export interface AdaptedEpisode {
  scenes: Scene[];
  items: ItemDef[];
  startSceneId: string;
}

export function adaptEpisode(json: any): AdaptedEpisode {
  const ctx: Ctx = {
    items: new Map(),
    branchIds: new Set(
      (json.scenes || []).filter((s: any) => s.type === "branch_check").map((s: any) => s.scene_id),
    ),
  };

  // 에피소드 선언 아이템 등록
  for (const it of json.items_available || []) {
    registerItem(ctx, {
      id: it.item_id,
      name: it.name ?? it.item_id,
      desc: it.description ?? "",
      consumable: false,
    });
  }

  const rawScenes: any[] = json.scenes || [];

  // 어떤 장면도 가리키지 않는 player_A / player_B 단독 장면 = 병렬 도입부
  const targets = new Set<string>();
  for (const s of rawScenes) collectChoiceGotos(s, targets);
  const isStart = (s: any) =>
    !targets.has(s.scene_id) && s.type !== "branch_check" && s.type !== "game_over";
  const soloA = rawScenes.filter((s) => s.visibility === "player_A" && isStart(s));
  const soloB = rawScenes.filter((s) => s.visibility === "player_B" && isStart(s));

  const scenes: Scene[] = [];
  let startSceneId: string;
  const merged = new Set<string>();

  if (soloA.length && soloB.length) {
    // 병렬 도입부를 하나의 split 장면으로 병합 (둘 다 도착해야 진행)
    const a = soloA[0];
    const b = soloB[0];
    merged.add(a.scene_id);
    merged.add(b.scene_id);
    const next = (a.choices && a.choices[0] && a.choices[0].next_scene) || b.choices?.[0]?.next_scene;
    const introChoices: Choice[] = [
      ...(a.choices || []).map((c: any) => convChoice(ctx, c, 0)),
      ...(b.choices || []).map((c: any) => convChoice(ctx, c, 1)),
    ];
    scenes.push({
      id: a.scene_id,
      title: a.title || "소집",
      text: { perSlot: [joinLines(a.narrative) || "", joinLines(b.narrative) || ""] },
      choices: introChoices,
      mode: "both",
      defaultGoto: next,
      checkpoint: true, // 에피소드 진입점 = 게임오버 복귀 지점
    });
    startSceneId = a.scene_id;
  } else {
    startSceneId = rawScenes[0]?.scene_id;
  }

  for (const s of rawScenes) {
    if (merged.has(s.scene_id)) continue;
    scenes.push(convScene(ctx, s));
  }

  return { scenes, items: [...ctx.items.values()], startSceneId };
}

export interface AdaptedEncounters {
  scenes: Scene[];
  items: ItemDef[];
  encounterIds: string[];
}

export function adaptEncounters(json: any): AdaptedEncounters {
  const ctx: Ctx = { items: new Map(), branchIds: new Set() };
  const scenes: Scene[] = [];
  const encounterIds: string[] = [];

  for (const enc of json.encounters || []) {
    const choices: Choice[] = [];
    const cpp = enc.choices_per_player || {};
    for (const c of cpp.player_A || []) choices.push(convChoice(ctx, c, 0));
    for (const c of cpp.player_B || []) choices.push(convChoice(ctx, c, 1));

    scenes.push({
      id: enc.encounter_id,
      title: enc.title,
      text: { shared: joinLines(enc.narrative) },
      choices,
      mode: "both",
      defaultGoto: "enc_aftermath", // 해소 후 거점으로 복귀하는 공통 후일담 장면
    });
    encounterIds.push(enc.encounter_id);
  }

  return { scenes, items: [...ctx.items.values()], encounterIds };
}
