// 2인 플레이 흐름 종단 검증 (동료 ep1 JSON 통합본). 서버가 :3000에서 떠 있어야 함.
// 실행: npx tsx scripts/smoke.ts
import { io, type Socket } from "socket.io-client";
import type { PlayerView } from "../src/game/types";

const URL = "http://localhost:3000";

interface Client {
  socket: Socket;
  view: PlayerView | null;
  name: string;
}

function connect(name: string): Client {
  const c: Client = { socket: io(URL, { transports: ["websocket"] }), view: null, name };
  c.socket.on("view", (v: PlayerView) => (c.view = v));
  c.socket.on("game:error", (e: { message: string }) =>
    console.log(`  [${name}] game:error: ${e.message}`),
  );
  return c;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitFor(c: Client, pred: (v: PlayerView) => boolean, label: string, ms = 5000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (c.view && pred(c.view)) return;
    await sleep(40);
  }
  throw new Error(
    `TIMEOUT: ${label} (${c.name}) — scene=${c.view?.scene?.id} status=${c.view?.status}`,
  );
}

async function waitBoth(
  A: Client,
  B: Client,
  pred: (v: PlayerView) => boolean,
  label: string,
) {
  await waitFor(A, pred, label);
  await waitFor(B, pred, label);
}

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    console.log(`  ✗ FAIL: ${msg}`);
    failures++;
  }
}

function createSession(c: Client): Promise<string> {
  return new Promise((res) =>
    c.socket.emit("session:create", (r: { sessionId: string }) => res(r.sessionId)),
  );
}
function join(c: Client, sessionId: string, playerId: string) {
  return new Promise<{ ok: boolean; slot?: number; error?: string }>((res) =>
    c.socket.emit("session:join", { sessionId, playerId, name: c.name }, (r: any) => res(r)),
  );
}
function submit(c: Client, choiceId: string) {
  c.socket.emit("game:submit", { choiceId });
}
function firstChoice(c: Client): string {
  const ch = (c.view?.scene?.choices ?? []).find((x) => !x.locked);
  if (!ch) throw new Error(`no available choice for ${c.name} at ${c.view?.scene?.id}`);
  return ch.id;
}
function stat(c: Client, key: string): number {
  return c.view!.you.stats.find((s) => s.key === key)!.value;
}

async function setup(suffix: string) {
  const A = connect("가현");
  const B = connect("나림");
  await sleep(300);
  const code = await createSession(A);
  await join(A, code, `pid-A-${suffix}`);
  await join(B, code, `pid-B-${suffix}`);
  return { A, B, code };
}

// 도입 → 첫 만남 → 브리핑 → 진입 → 분리 퍼즐 직전(scene_5)까지
async function advanceToPuzzle(A: Client, B: Client) {
  await waitBoth(A, B, (v) => v.scene?.id === "scene_1a", "intro");
  assert(A.view!.scene!.text.includes("자정"), "A sees A-intro");
  assert(B.view!.scene!.text.includes("11시 58분"), "B sees B-intro (different)");
  submit(A, "1a_c1");
  await sleep(120);
  assert(A.view!.scene!.waitingForPartner === true, "A waits for partner at intro");
  submit(B, "1b_c1");

  await waitBoth(A, B, (v) => v.scene?.id === "scene_2", "scene_2");
  // 회귀: 단일 "계속" 장면도 both 모드 — A만 제출하면 진행되면 안 되고,
  //       A는 파트너 대기, B는 "파트너가 기다림" 안내를 받아야 한다.
  submit(A, "2_c1");
  await waitFor(A, (v) => v.scene?.waitingForPartner === true, "A waits at single-choice scene_2");
  assert(A.view!.scene!.id === "scene_2", "한 명만 제출 → 진행하지 않음 (혼자 진행 불가)");
  assert(A.view!.scene!.waitingForPartner === true, "A: 파트너 대기 상태");
  assert(B.view!.scene!.partnerWaiting === true, "B: 파트너가 기다리는 중 안내 표시");
  submit(B, "2_c1");

  await waitBoth(A, B, (v) => v.scene?.id === "scene_3", "scene_3");
  submit(A, "3_a_c1");
  submit(B, "3_b_c1"); // building_map 획득

  await waitBoth(A, B, (v) => v.scene?.id === "scene_4", "scene_4");
  assert(
    B.view!.you.inventory.some((i) => i.id === "building_map"),
    "B has building_map from briefing",
  );
  // 도면 보유 → 4_c3 해금 표시 (둘 다에게 OR 조건으로 보임)
  assert(
    A.view!.scene!.choices.some((c) => c.id === "4_c3" && !c.locked),
    "map-gated choice 4_c3 unlocked (OR across pair)",
  );
  submit(A, "4_c1");
  submit(B, "4_c1");

  await waitBoth(A, B, (v) => v.scene?.id === "scene_5", "scene_5 (split puzzle)");
  assert(A.view!.scene!.text.includes("형체"), "A sees the apparition (perSlot)");
  assert(B.view!.scene!.text.includes("도시락통"), "B sees the lunchbox clue (perSlot)");
  assert(!A.view!.scene!.text.includes("도시락통"), "A does NOT see B's clue (asymmetry)");
}

async function happyPath() {
  console.log("\n=== HAPPY PATH (완전 성공 → 에필로그 → 허브 → 인카운터) ===");
  const { A, B } = await setup("h");
  await advanceToPuzzle(A, B);

  // 정답: A는 말을 건다, B는 7번 문을 연다 → branch_check(server_only) → scene_6a
  submit(A, "5_a_c1");
  submit(B, "5_b_c1");
  await waitBoth(A, B, (v) => v.scene?.id === "scene_6a", "scene_6a (branch routed full success)");
  assert(stat(A, "spiritSight") === 1, `A 령안 +1 reward (got ${stat(A, "spiritSight")})`);
  assert(stat(B, "investigation") === 1, `B 탐색력 +1 reward (got ${stat(B, "investigation")})`);
  // scene_5 선택의 결과 서술(additional_narrative)이 다음 장면 상단에 노출 (B는 기본 서술 보유)
  assert(B.view!.scene!.text.includes("»"), "B sees post-choice result narrative on next scene");

  // 계속 → scene_7a (이제 both 모드: 둘 다 제출해야 진행)
  submit(A, firstChoice(A));
  submit(B, firstChoice(B));
  await waitBoth(A, B, (v) => v.scene?.id === "scene_7a", "scene_7a (epilogue)");
  // 유천당으로 → hub
  submit(A, firstChoice(A));
  submit(B, firstChoice(B));
  await waitBoth(A, B, (v) => v.scene?.id === "hub", "hub");

  // 랜덤 인카운터 (hub도 both 모드)
  submit(A, "hub_walk");
  submit(B, "hub_walk");
  await waitBoth(A, B, (v) => !!v.scene && v.scene.id.startsWith("re_"), "random encounter");
  const encId = A.view!.scene!.id;
  assert(B.view!.scene!.id === encId, "both in the same encounter");
  submit(A, firstChoice(A));
  submit(B, firstChoice(B));
  await waitBoth(A, B, (v) => v.scene?.id === "enc_aftermath", "encounter aftermath");
  submit(A, "enc_aftermath_cont");
  submit(B, "enc_aftermath_cont");
  await waitBoth(A, B, (v) => v.scene?.id === "hub", "back to hub after encounter");

  A.socket.disconnect();
  B.socket.disconnect();
}

async function failAndRestart() {
  console.log("\n=== FAIL (둘 다 오답) → GAME OVER → 체크포인트 재시작 ===");
  const { A, B } = await setup("f");
  await advanceToPuzzle(A, B);

  submit(A, "5_a_c2"); // 잘못된 접근
  submit(B, "5_b_c2");
  // 둘 다 오답 → branch fallback → scene_6c(실패 서술) → 계속 → game_over
  await waitBoth(A, B, (v) => v.scene?.id === "scene_6c", "scene_6c (failure narrative)");
  submit(A, firstChoice(A));
  submit(B, firstChoice(B));
  await waitFor(A, (v) => v.status === "gameover", "gameover");
  assert(A.view!.status === "gameover", "both incorrect → game over");

  A.socket.emit("game:restart");
  await waitFor(A, (v) => v.status === "playing" && v.scene?.id === "scene_1a", "restart → intro");
  assert(A.view!.scene?.id === "scene_1a", "restart returns to episode-entry checkpoint");
  assert(stat(A, "spiritSight") === 0, "stats restored to episode entry (령안 0)");

  A.socket.disconnect();
  B.socket.disconnect();
}

async function partialPath() {
  console.log("\n=== PARTIAL (A만 정답) → branch partial → scene_6b ===");
  const { A, B } = await setup("p");
  await advanceToPuzzle(A, B);
  submit(A, "5_a_c1"); // 정답
  submit(B, "5_b_c2"); // 오답
  await waitFor(A, (v) => v.scene?.id === "scene_6b", "scene_6b (partial)");
  assert(A.view!.scene?.id === "scene_6b", "exactly-one-correct routes to partial success");
  A.socket.disconnect();
  B.socket.disconnect();
}

// 새로 엮은 능력치(직감/거짓말/해킹/근력/민첩/응급처치)가 선택을 통해 실제로 오르는지 검증
async function newStatsPath() {
  console.log("\n=== NEW STATS (직감·거짓말·해킹·근력·민첩 획득 경로) ===");
  const { A, B } = await setup("n");

  await waitBoth(A, B, (v) => v.scene?.id === "scene_1a", "intro");
  submit(A, "1a_c2"); // A 관찰 → 직감 +1
  submit(B, "1b_c1");
  await waitBoth(A, B, (v) => v.scene?.id === "scene_2", "scene_2");
  assert(stat(A, "intuition") === 1, `A 직감 +1 from observe (got ${stat(A, "intuition")})`);

  submit(A, "2_c1");
  submit(B, "2_c1");
  await waitBoth(A, B, (v) => v.scene?.id === "scene_3", "scene_3");
  submit(A, "3_a_c3"); // A 둘러댈 핑계 → 거짓말 +1
  submit(B, "3_b_c3"); // B 기록 뒤지기 → 해킹 +1
  await waitBoth(A, B, (v) => v.scene?.id === "scene_4", "scene_4");
  assert(stat(A, "deception") === 1, `A 거짓말 +1 from cover-story (got ${stat(A, "deception")})`);
  assert(stat(B, "hacking") === 1, `B 해킹 +1 from records dig (got ${stat(B, "hacking")})`);

  assert(
    ["4_c4", "4_c5", "4_c6"].every((id) =>
      A.view!.scene!.choices.some((c) => c.id === id && !c.locked),
    ),
    "scene_4 exposes 근력/민첩/응급처치 approach choices",
  );
  submit(A, "4_c5"); // A 재빨리 살핀다 → 민첩 +1
  submit(B, "4_c4"); // B 잔해 치운다 → 근력 +1
  await waitBoth(A, B, (v) => v.scene?.id === "scene_5", "scene_5");
  assert(stat(A, "agility") === 1, `A 민첩 +1 from scouting (got ${stat(A, "agility")})`);
  assert(stat(B, "strength") === 1, `B 근력 +1 from clearing debris (got ${stat(B, "strength")})`);

  A.socket.disconnect();
  B.socket.disconnect();
}

async function main() {
  await happyPath();
  await failAndRestart();
  await partialPath();
  await newStatsPath();
  console.log(`\n${failures === 0 ? "✅ ALL PASS" : `❌ ${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("SMOKE ERROR:", e.message);
  process.exit(1);
});
