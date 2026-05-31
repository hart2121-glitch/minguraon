import type { ChatMessage, GameState, PlayerState, Slot } from "./types";
import { START_SCENE_ID, emptyStats } from "../content";

// 인메모리 세션 스토어 (MVP). 프로세스 메모리에만 존재.
const sessions = new Map<string, GameState>();

function genCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O/1/I 제외
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 5; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  } while (sessions.has(code));
  return code;
}

export function createSession(): GameState {
  const sessionId = genCode();
  const state: GameState = {
    sessionId,
    status: "playing",
    players: [null, null],
    world: { spiritLevel: 0 },
    currentSceneId: START_SCENE_ID,
    pending: [null, null],
    flags: {},
    chat: [],
  };
  sessions.set(sessionId, state);
  return state;
}

export function getSession(sessionId: string): GameState | undefined {
  return sessions.get(sessionId);
}

function makePlayer(playerId: string, slot: Slot, name: string): PlayerState {
  return {
    playerId,
    slot,
    name,
    connected: true,
    stats: emptyStats(),
    inventory: [],
  };
}

export interface JoinResult {
  ok: boolean;
  slot?: Slot;
  error?: string;
}

export function joinSession(sessionId: string, playerId: string, name: string): JoinResult {
  const s = sessions.get(sessionId);
  if (!s) return { ok: false, error: "존재하지 않는 세션입니다." };

  // 재접속
  for (const slot of [0, 1] as Slot[]) {
    const p = s.players[slot];
    if (p && p.playerId === playerId) {
      p.connected = true;
      if (name) p.name = name;
      resumeIfReady(s);
      return { ok: true, slot };
    }
  }

  // 신규 입장 — 빈 슬롯 배정
  for (const slot of [0, 1] as Slot[]) {
    if (!s.players[slot]) {
      s.players[slot] = makePlayer(playerId, slot, name || `플레이어 ${slot + 1}`);
      resumeIfReady(s);
      return { ok: true, slot };
    }
  }

  return { ok: false, error: "세션이 가득 찼습니다 (2인 정원)." };
}

function bothConnected(s: GameState): boolean {
  return !!s.players[0]?.connected && !!s.players[1]?.connected;
}

function resumeIfReady(s: GameState) {
  if (s.status === "paused" && bothConnected(s)) {
    s.status = "playing";
  }
}

export function markDisconnected(sessionId: string, playerId: string): Slot | null {
  const s = sessions.get(sessionId);
  if (!s) return null;
  for (const slot of [0, 1] as Slot[]) {
    const p = s.players[slot];
    if (p && p.playerId === playerId) {
      p.connected = false;
      if (s.status === "playing") s.status = "paused";
      return slot;
    }
  }
  return null;
}

export function addChat(sessionId: string, slot: Slot, text: string): ChatMessage | null {
  const s = sessions.get(sessionId);
  if (!s) return null;
  const player = s.players[slot];
  if (!player) return null;
  const trimmed = text.trim().slice(0, 500);
  if (!trimmed) return null;
  const msg: ChatMessage = {
    id: globalThis.crypto.randomUUID(),
    slot,
    name: player.name,
    text: trimmed,
    ts: Date.now(),
  };
  s.chat.push(msg);
  if (s.chat.length > 200) s.chat.shift();
  return msg;
}

export function systemChat(sessionId: string, text: string): ChatMessage | null {
  const s = sessions.get(sessionId);
  if (!s) return null;
  const msg: ChatMessage = {
    id: globalThis.crypto.randomUUID(),
    slot: "system",
    name: "시스템",
    text,
    ts: Date.now(),
  };
  s.chat.push(msg);
  if (s.chat.length > 200) s.chat.shift();
  return msg;
}
