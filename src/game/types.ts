// 도메인 타입 정의 — 클라이언트/서버 공유 (type-only import는 양쪽 모두 안전)

export type Slot = 0 | 1;

// 능력치: 행동 스탯(공통 성장) + 감각/지식 스탯(루팅 분화)
export type StatKey =
  | "combat" // 전투력
  | "investigation" // 탐색력
  | "negotiation" // 교섭력
  | "spiritSight" // 령안
  | "occultLore" // 오컬트 지식
  | "psychology"; // 심리 분석

export type StatKind = "action" | "sense";

export interface StatDef {
  key: StatKey;
  name: string;
  kind: StatKind;
  desc: string;
}

export type Stats = Record<StatKey, number>;

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  consumable: boolean;
}

export interface PlayerState {
  playerId: string; // 재접속 시 슬롯 복구용 영속 ID (클라이언트가 보관)
  slot: Slot;
  name: string;
  connected: boolean;
  stats: Stats;
  inventory: string[]; // item id 목록 (소모품 중복 허용)
}

export type FlagVal = boolean | number | string;

// 선택지 해금 조건. 나열된 항목은 모두 충족(AND). itemsAnyPlayer는 페어 내 OR.
export interface Requirement {
  stats?: Partial<Stats>; // 보는 플레이어가 이 임계치 이상이어야 함
  itemsSelf?: string[]; // 본인이 모두 보유
  itemsAnyPlayer?: string[]; // 둘 중 한 명이라도 보유 (OR)
  flags?: Record<string, FlagVal>; // 세션 플래그가 이 값과 일치
  notFlags?: string[]; // 이 플래그들이 falsy여야 함
}

export type EffectTarget = Slot | "self" | "both" | "actor";

export interface Effect {
  type: "stat" | "giveItem" | "consumeItem" | "spiritLevel" | "flag" | "gameover";
  stat?: StatKey;
  delta?: number;
  target?: EffectTarget; // 기본값 "self"
  itemId?: string;
  flag?: string;
  value?: FlagVal;
  reason?: string; // gameover 사유
}

export type ChoiceVisibility = Slot | "both";

export interface Choice {
  id: string;
  slot: ChoiceVisibility; // 누구에게 보이는가
  label: string;
  requires?: Requirement; // 미충족 시 숨김 (lockedHint 있으면 잠금 표시)
  lockedHint?: string;
  effects?: Effect[];
  goto?: string; // "either" 모드 전용. "both" 모드에서는 resolution이 결정.
}

export interface SceneText {
  shared?: string; // 양쪽 공유
  perSlot?: [string, string]; // [slot0 서술, slot1 서술] — 비대칭 연출
}

export type SceneMode = "either" | "both";

// "both" 모드 결합 해소 규칙. "*"는 와일드카드. 위에서부터 첫 일치 적용.
export interface CoopResolution {
  when: [string | "*", string | "*"]; // [slot0 선택 id, slot1 선택 id]
  goto: string;
  effects?: Effect[];
}

export interface Scene {
  id: string;
  title?: string;
  text: SceneText;
  choices: Choice[];
  mode: SceneMode; // either: 한 명의 선택으로 진행 / both: 둘 다 제출해야 진행
  resolution?: CoopResolution[]; // both 모드 결합 규칙
  defaultGoto?: string; // both 모드에서 매칭 실패 시
  checkpoint?: boolean; // 진입 시 체크포인트 저장 (게임오버 복귀 지점)
  ending?: boolean; // 종료 장면
}

export type GameStatus = "playing" | "paused" | "gameover" | "ending";

export interface ChatMessage {
  id: string;
  slot: Slot | "system";
  name: string;
  text: string;
  ts: number;
}

export interface StateSnapshot {
  players: [PlayerState | null, PlayerState | null];
  world: { spiritLevel: number };
  currentSceneId: string;
  flags: Record<string, FlagVal>;
}

export interface GameState {
  sessionId: string;
  status: GameStatus;
  players: [PlayerState | null, PlayerState | null];
  world: { spiritLevel: number };
  currentSceneId: string;
  pending: [string | null, string | null]; // 슬롯별 제출 선택 id
  flags: Record<string, FlagVal>;
  chat: ChatMessage[];
  gameoverReason?: string;
  checkpoint?: StateSnapshot; // 게임오버 시 복원
}

// ===== 클라이언트로 전송되는 슬롯별 뷰 (비밀 정보 누출 방지) =====

export interface ItemView {
  id: string;
  name: string;
  desc: string;
}

export interface ChoiceView {
  id: string;
  label: string;
  locked: boolean;
  lockedHint?: string;
}

export interface StatView {
  key: StatKey;
  name: string;
  kind: StatKind;
  value: number;
}

export interface SceneView {
  id: string;
  title?: string;
  text: string; // 이 슬롯용으로 합성된 서술
  choices: ChoiceView[]; // 이 슬롯에게 보이는 선택지만
  mode: SceneMode;
  youSubmitted: boolean;
  waitingForPartner: boolean;
  ending: boolean;
}

export interface PlayerView {
  sessionId: string;
  status: GameStatus;
  you: {
    slot: Slot;
    name: string;
    stats: StatView[];
    inventory: ItemView[];
  };
  partner: {
    slot: Slot;
    name: string;
    connected: boolean;
  } | null;
  world: { spiritLevel: number };
  scene: SceneView | null;
  chat: ChatMessage[];
  gameoverReason?: string;
}
