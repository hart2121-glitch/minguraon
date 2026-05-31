import type {
  BranchLogic,
  Choice,
  ChoiceStatReq,
  ChoiceView,
  Effect,
  GameState,
  PlayerView,
  Requirement,
  Scene,
  Slot,
  StatKey,
  StateSnapshot,
  StatView,
} from "./types";
import {
  ENCOUNTER_POOL,
  START_SCENE_ID,
  STAT_BY_KEY,
  STAT_DEFS,
  ITEM_BY_ID,
  emptyStats,
  getScene,
} from "../content";

// ───────────────────────── 조건 평가 ─────────────────────────

export function meetsRequirement(state: GameState, slot: Slot, req?: Requirement): boolean {
  if (!req) return true;
  const me = state.players[slot];
  if (!me) return false;

  if (req.stats) {
    for (const [k, v] of Object.entries(req.stats)) {
      if (me.stats[k as keyof typeof me.stats] < (v as number)) return false;
    }
  }
  if (req.itemsSelf) {
    for (const id of req.itemsSelf) {
      if (!me.inventory.includes(id)) return false;
    }
  }
  if (req.itemsAnyPlayer) {
    const pool = [
      ...(state.players[0]?.inventory ?? []),
      ...(state.players[1]?.inventory ?? []),
    ];
    for (const id of req.itemsAnyPlayer) {
      if (!pool.includes(id)) return false;
    }
  }
  if (req.flags) {
    for (const [k, v] of Object.entries(req.flags)) {
      if (state.flags[k] !== v) return false;
    }
  }
  if (req.notFlags) {
    for (const k of req.notFlags) {
      if (state.flags[k]) return false;
    }
  }
  return true;
}

interface VisibleChoice {
  choice: Choice;
  locked: boolean;
}

function visibleChoicesFor(state: GameState, slot: Slot, scene: Scene): VisibleChoice[] {
  const out: VisibleChoice[] = [];
  for (const c of scene.choices) {
    if (c.slot !== slot && c.slot !== "both") continue;
    const met = meetsRequirement(state, slot, c.requires);
    if (met) out.push({ choice: c, locked: false });
    // 미충족: lockedHint가 있거나 스탯 요구조건이 있으면 잠금 상태로 노출
    // (스탯 게이팅은 어떤 능력치가 막고 있는지 빨간색으로 보여주기 위해 숨기지 않는다)
    else if (c.lockedHint || c.requires?.stats) out.push({ choice: c, locked: true });
  }
  return out;
}

function submittableIds(state: GameState, slot: Slot, scene: Scene): Set<string> {
  return new Set(
    visibleChoicesFor(state, slot, scene)
      .filter((v) => !v.locked)
      .map((v) => v.choice.id),
  );
}

function presentSlots(state: GameState): Slot[] {
  const s: Slot[] = [];
  if (state.players[0]) s.push(0);
  if (state.players[1]) s.push(1);
  return s;
}

// 제출이 필요한 슬롯 = 현재 접속해 있고 선택 가능한 선택지가 1개 이상인 슬롯
function requiredSubmitters(state: GameState, scene: Scene): Slot[] {
  return presentSlots(state).filter((slot) => submittableIds(state, slot, scene).size > 0);
}

// ───────────────────────── 효과 적용 ─────────────────────────

function targetSlots(state: GameState, target: Effect["target"], actor: Slot | null): Slot[] {
  if (target === "both") return presentSlots(state);
  if (target === 0 || target === 1) return state.players[target] ? [target] : [];
  // "self" | "actor" | undefined
  return actor != null && state.players[actor] ? [actor] : [];
}

function conditionMet(state: GameState, e: Effect): boolean {
  if (!e.condition) return true;
  const want = e.condition.value ?? true;
  return state.flags[e.condition.flag] === want;
}

export function applyEffects(state: GameState, effects: Effect[] | undefined, actor: Slot | null) {
  if (!effects) return;
  for (const e of effects) {
    if (!conditionMet(state, e)) continue;
    switch (e.type) {
      case "stat": {
        if (!e.stat) break;
        for (const slot of targetSlots(state, e.target, actor)) {
          const p = state.players[slot]!;
          p.stats[e.stat] = Math.max(0, p.stats[e.stat] + (e.delta ?? 0));
        }
        break;
      }
      case "giveItem": {
        if (!e.itemId) break;
        for (const slot of targetSlots(state, e.target, actor)) {
          state.players[slot]!.inventory.push(e.itemId);
        }
        break;
      }
      case "consumeItem": {
        if (!e.itemId) break;
        for (const slot of targetSlots(state, e.target, actor)) {
          const inv = state.players[slot]!.inventory;
          const i = inv.indexOf(e.itemId);
          if (i >= 0) inv.splice(i, 1);
        }
        break;
      }
      case "spiritLevel": {
        state.world.spiritLevel = Math.max(0, state.world.spiritLevel + (e.delta ?? 0));
        break;
      }
      case "flag": {
        if (e.flag) state.flags[e.flag] = e.value ?? true;
        break;
      }
      case "gameover": {
        state.status = "gameover";
        state.gameoverReason = e.reason ?? "게임 오버";
        break;
      }
    }
  }
}

// ───────────────────────── 네비게이션 ─────────────────────────

function snapshot(state: GameState): StateSnapshot {
  return structuredClone({
    players: state.players,
    world: state.world,
    currentSceneId: state.currentSceneId,
    flags: state.flags,
  });
}

function resolveTarget(target: string): string {
  if (target === "@random") {
    return ENCOUNTER_POOL[Math.floor(Math.random() * ENCOUNTER_POOL.length)];
  }
  return target;
}

function evalBranch(state: GameState, b: BranchLogic): string {
  if (b.ifBoth.every((f) => state.flags[f])) return b.then;
  if (b.elseIfOne.some((f) => state.flags[f])) return b.partial;
  return b.fallback;
}

function enterScene(state: GameState, sceneId: string, depth = 0) {
  if (depth > 50) throw new Error("scene navigation loop");
  const target = resolveTarget(sceneId);
  const scene = getScene(target);
  if (!scene) throw new Error(`unknown scene: ${target}`);

  // 서버 전용 분기 장면: 화면 없이 즉시 다음으로 라우팅
  if (scene.branch) {
    enterScene(state, evalBranch(state, scene.branch), depth + 1);
    return;
  }

  state.currentSceneId = target;
  state.pending = [null, null];

  if (scene.checkpoint) state.checkpoint = snapshot(state);

  applyEffects(state, scene.onEnter, null);

  if (scene.gameover) {
    state.status = "gameover";
    state.gameoverReason = scene.title ?? "게임 오버";
  } else if (scene.ending) {
    state.status = "ending";
  } else if (scene.choices.length === 0) {
    // 선택지도 분기도 없는 장면 = 막다른 길 → 게임 오버로 처리(안전망)
    state.status = "gameover";
    state.gameoverReason = scene.title ?? "막다른 길";
  } else {
    state.status = "playing";
  }
}

function matchToken(token: string, value: string | null): boolean {
  if (token === "*") return true;
  return token === value;
}

// 선택 직후 본인에게 보일 결과 서술 (효과 적용 전 스탯 기준)
function computeResult(state: GameState, slot: Slot, choice: Choice): string | null {
  let txt = choice.resultNarrative ?? null;
  if (choice.resultIfStat) {
    const p = state.players[slot];
    if (p && p.stats[choice.resultIfStat.stat] >= choice.resultIfStat.min) {
      txt = txt ? `${txt}\n\n${choice.resultIfStat.text}` : choice.resultIfStat.text;
    }
  }
  return txt;
}

// "both" 모드 결합 해소
function resolveBoth(state: GameState, scene: Scene) {
  const c0 = state.pending[0];
  const c1 = state.pending[1];

  // 결과 서술은 효과 적용 전에 계산 (resultIfStat이 직전 스탯을 반영하도록)
  const results: [string | null, string | null] = [null, null];
  for (const slot of [0, 1] as Slot[]) {
    const cid = state.pending[slot];
    if (!cid) continue;
    const choice = scene.choices.find((c) => c.id === cid);
    if (choice) results[slot] = computeResult(state, slot, choice);
  }

  // 제출된 각 선택지의 효과 적용 (actor = 제출한 슬롯)
  for (const slot of [0, 1] as Slot[]) {
    const cid = state.pending[slot];
    if (!cid) continue;
    const choice = scene.choices.find((c) => c.id === cid);
    applyEffects(state, choice?.effects, slot);
  }

  state.lastResult = results;

  if (scene.resolution) {
    for (const r of scene.resolution) {
      if (matchToken(r.when[0], c0) && matchToken(r.when[1], c1)) {
        applyEffects(state, r.effects, 0);
        enterScene(state, r.goto);
        return;
      }
    }
  }
  if (scene.defaultGoto) {
    enterScene(state, scene.defaultGoto);
    return;
  }
  // 갈 곳이 없으면 제자리 (이론상 도달 안 함)
  state.pending = [null, null];
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export function submitChoice(state: GameState, slot: Slot, choiceId: string): SubmitResult {
  if (state.status !== "playing") return { ok: false, error: "지금은 진행할 수 없습니다." };
  const scene = getScene(state.currentSceneId);
  if (!scene) return { ok: false, error: "장면을 찾을 수 없습니다." };

  // 시작 장면은 세션 생성 시 직접 세팅되어 enterScene을 거치지 않으므로,
  // 체크포인트(에피소드 진입 상태) 스냅샷을 첫 상호작용 시점에 확보한다.
  if (!state.checkpoint && scene.checkpoint) state.checkpoint = snapshot(state);

  if (!submittableIds(state, slot, scene).has(choiceId)) {
    return { ok: false, error: "선택할 수 없는 항목입니다." };
  }

  state.pending[slot] = choiceId;

  if (scene.mode === "either") {
    const choice = scene.choices.find((c) => c.id === choiceId)!;
    const result = computeResult(state, slot, choice);
    applyEffects(state, choice.effects, slot);
    state.lastResult = slot === 0 ? [result, null] : [null, result];
    enterScene(state, choice.goto ?? scene.defaultGoto ?? state.currentSceneId);
    return { ok: true };
  }

  // mode === "both": 필요한 모든 슬롯이 제출했는지 확인
  const required = requiredSubmitters(state, scene);
  const allIn = required.every((s) => state.pending[s] != null);
  if (allIn) resolveBoth(state, scene);
  return { ok: true };
}

export function restartFromCheckpoint(state: GameState): SubmitResult {
  if (state.status !== "gameover") return { ok: false, error: "재시작할 상태가 아닙니다." };
  if (state.checkpoint) {
    const cp = structuredClone(state.checkpoint);
    state.players = cp.players;
    state.world = cp.world;
    state.flags = cp.flags;
    state.pending = [null, null];
    state.gameoverReason = undefined;
    state.currentSceneId = cp.currentSceneId;
    state.status = "playing";
    state.lastResult = undefined;
  } else {
    state.currentSceneId = START_SCENE_ID;
    state.status = "playing";
    state.pending = [null, null];
    state.gameoverReason = undefined;
    state.lastResult = undefined;
  }
  return { ok: true };
}

// ───────────────────────── 슬롯별 뷰 투영 ─────────────────────────

function composeText(state: GameState, scene: Scene, slot: Slot): string {
  const parts: string[] = [];
  const result = state.lastResult?.[slot];
  if (result) parts.push(`» ${result}\n\n────────`);
  if (scene.text.shared) parts.push(scene.text.shared);
  if (scene.text.perSlot && scene.text.perSlot[slot]) parts.push(scene.text.perSlot[slot]);
  return parts.join("\n\n");
}

function statViews(stats: Record<string, number>): StatView[] {
  return STAT_DEFS.map((d) => ({
    key: d.key,
    name: d.name,
    kind: d.kind,
    value: stats[d.key] ?? 0,
  }));
}

export function projectView(state: GameState, slot: Slot): PlayerView {
  const me = state.players[slot];
  const otherSlot: Slot = slot === 0 ? 1 : 0;
  const other = state.players[otherSlot];
  const scene = getScene(state.currentSceneId);

  let sceneView: PlayerView["scene"] = null;
  if (scene) {
    const vis = visibleChoicesFor(state, slot, scene);
    const choices: ChoiceView[] = vis.map((v) => {
      const reqStats = v.choice.requires?.stats;
      let stats: ChoiceStatReq[] | undefined;
      if (reqStats) {
        stats = Object.entries(reqStats).map(([k, need]) => {
          const key = k as StatKey;
          return {
            key,
            name: STAT_BY_KEY[key]?.name ?? key,
            need: need as number,
            met: (me?.stats[key] ?? 0) >= (need as number),
          };
        });
      }
      return {
        id: v.choice.id,
        label: v.choice.label,
        locked: v.locked,
        lockedHint: v.locked ? v.choice.lockedHint : undefined,
        stats,
      };
    });
    const required = requiredSubmitters(state, scene);
    const youSubmitted = state.pending[slot] != null;
    const waitingForPartner =
      scene.mode === "both" &&
      youSubmitted &&
      required.some((s) => s !== slot && state.pending[s] == null);
    // 파트너가 먼저 제출했고, 내가 아직 안 골랐으며, 내 제출이 필요한 상태
    const partnerWaiting =
      scene.mode === "both" &&
      !youSubmitted &&
      required.includes(slot) &&
      required.some((s) => s !== slot && state.pending[s] != null);

    sceneView = {
      id: scene.id,
      title: scene.title,
      text: composeText(state, scene, slot),
      choices,
      mode: scene.mode,
      youSubmitted,
      waitingForPartner,
      partnerWaiting,
      ending: !!scene.ending,
    };
  }

  return {
    sessionId: state.sessionId,
    status: state.status,
    you: me
      ? {
          slot,
          name: me.name,
          stats: statViews(me.stats),
          inventory: me.inventory.map((id) => ({
            id,
            name: ITEM_BY_ID[id]?.name ?? id,
            desc: ITEM_BY_ID[id]?.desc ?? "",
          })),
        }
      : { slot, name: "", stats: statViews(emptyStats()), inventory: [] },
    partner: other
      ? { slot: otherSlot, name: other.name, connected: other.connected }
      : null,
    world: state.world,
    scene: sceneView,
    chat: state.chat,
    gameoverReason: state.gameoverReason,
  };
}

// STAT_BY_KEY는 향후 확장(상세 패널 등)을 위해 재노출
export { STAT_BY_KEY };
