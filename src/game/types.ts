// 도메인 타입 정의 — 클라이언트/서버 공유 (type-only import는 양쪽 모두 안전)

export type Slot = 0 | 1;

// 능력치: 행동 스탯(공통 성장) + 감각/지식 스탯(루팅 분화)
export type StatKey =
  // 행동 스탯
  | "combat" // 전투력
  | "investigation" // 탐색력
  | "negotiation" // 교섭력
  | "agility" // 민첩
  | "strength" // 근력
  | "hacking" // 해킹
  | "deception" // 거짓말
  // 감각/지식 스탯
  | "spiritSight" // 령안
  | "occultLore" // 오컬트 지식
  | "psychology" // 심리 분석
  | "intuition" // 직감
  | "medical"; // 응급처치

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
  // 조건부 효과: 이 플래그가 일치할 때만 적용 (value 생략 시 truthy 검사)
  condition?: { flag: string; value?: FlagVal };
}

export type ChoiceVisibility = Slot | "both";

export interface Choice {
  id: string;
  slot: ChoiceVisibility; // 누구에게 보이는가
  label: string;
  requires?: Requirement; // 미충족 시 숨김 (lockedHint 있으면 잠금 표시)
  lockedHint?: string;
  effects?: Effect[];
  goto?: string; // "either" 모드 전용. "both" 모드에서는 resolution/defaultGoto가 결정.
  // 선택 직후 본인에게만 보이는 결과 서술. 다음 장면 상단에 표시됨.
  resultNarrative?: string;
  // 스탯 조건 충족 시 추가로 붙는 결과 서술.
  resultIfStat?: { stat: StatKey; min: number; text: string };
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

// 서버 전용 분기 장면 — UI 없이 플래그로 즉시 라우팅.
export interface BranchLogic {
  ifBoth: string[]; // 모든 플래그 truthy → then
  then: string;
  elseIfOne: string[]; // 위가 아니고, 이 중 하나라도 truthy → partial
  partial: string;
  fallback: string; // 그 외
}

export interface Scene {
  id: string;
  title?: string;
  text: SceneText;
  choices: Choice[];
  mode: SceneMode; // either: 한 명의 선택으로 진행 / both: 둘 다 제출해야 진행
  resolution?: CoopResolution[]; // both 모드 결합 규칙
  defaultGoto?: string; // both 모드 네비게이션 / 매칭 실패 시
  onEnter?: Effect[]; // 장면 진입 시 적용되는 효과 (보상 등)
  branch?: BranchLogic; // 서버 전용 분기 장면 (즉시 라우팅, 화면 없음)
  checkpoint?: boolean; // 진입 시 체크포인트 저장 (게임오버 복귀 지점)
  ending?: boolean; // 종료 장면
  gameover?: boolean; // 게임 오버 장면 (재시작 UI 노출)
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
  lastResult?: [string | null, string | null]; // 직전 선택의 슬롯별 결과 서술
}

// ===== 클라이언트로 전송되는 슬롯별 뷰 (비밀 정보 누출 방지) =====

export interface ItemView {
  id: string;
  name: string;
  desc: string;
}

// 선택지 해금에 관여하는 스탯 요구조건 1건 (UI 색상 표시용)
export interface ChoiceStatReq {
  key: StatKey;
  name: string; // 한글 스탯명
  need: number; // 요구 수치
  met: boolean; // 보는 플레이어가 충족했는지
}

export interface ChoiceView {
  id: string;
  label: string;
  locked: boolean;
  lockedHint?: string;
  stats?: ChoiceStatReq[]; // 이 선택지가 요구하는 스탯들 (있으면 색칠해 표시)
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
  waitingForPartner: boolean; // 내가 제출했고 파트너를 기다리는 중
  partnerWaiting: boolean; // 파트너가 먼저 제출했고 내 선택을 기다리는 중
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
