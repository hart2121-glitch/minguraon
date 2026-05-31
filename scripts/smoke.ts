// 2인 플레이 흐름 종단 검증. 서버가 :3000에서 떠 있어야 함.
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(c: Client, pred: (v: PlayerView) => boolean, label: string, ms = 4000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (c.view && pred(c.view)) return;
    await sleep(40);
  }
  throw new Error(`TIMEOUT waiting for: ${label} (${c.name}) — scene=${c.view?.scene?.id} status=${c.view?.status}`);
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
  return new Promise((res) => c.socket.emit("session:create", (r: { sessionId: string }) => res(r.sessionId)));
}
function join(c: Client, sessionId: string, playerId: string): Promise<{ ok: boolean; slot?: number; error?: string }> {
  return new Promise((res) =>
    c.socket.emit("session:join", { sessionId, playerId, name: c.name }, (r: any) => res(r)),
  );
}

async function happyPath() {
  console.log("\n=== HAPPY PATH ===");
  const A = connect("가현");
  const B = connect("나림");
  await sleep(300);

  const code = await createSession(A);
  console.log(`  session: ${code}`);
  const ja = await join(A, code, "pid-A");
  const jb = await join(B, code, "pid-B");
  assert(ja.ok && ja.slot === 0, `A joined as slot 0 (got ${ja.slot})`);
  assert(jb.ok && jb.slot === 1, `B joined as slot 1 (got ${jb.slot})`);

  // 1. arrival (both)
  await waitFor(A, (v) => v.scene?.id === "ep1_arrival", "arrival");
  A.socket.emit("game:submit", { choiceId: "enter0" });
  await sleep(150);
  assert(A.view?.scene?.waitingForPartner === true, "A waits for partner at arrival");
  B.socket.emit("game:submit", { choiceId: "enter1" });

  // 2. meet (both) — 각자 다른 감각 스탯
  await waitFor(A, (v) => v.scene?.id === "ep1_meet", "meet");
  A.socket.emit("game:submit", { choiceId: "meet_eye" }); // 령안+1
  B.socket.emit("game:submit", { choiceId: "meet_charm" }); // 오컬트+1

  // 3. brief (either) — 둘 다 부적 받기
  await waitFor(A, (v) => v.scene?.id === "ep1_brief", "brief");
  const aSpirit = A.view!.you.stats.find((s) => s.key === "spiritSight")!.value;
  const bOccult = B.view!.you.stats.find((s) => s.key === "occultLore")!.value;
  assert(aSpirit === 1, `A 령안 = 1 (got ${aSpirit})`);
  assert(bOccult === 1, `B 오컬트 지식 = 1 (got ${bOccult})`);
  A.socket.emit("game:submit", { choiceId: "brief_go" });

  // 4. hub (either, checkpoint) — 부적 둘 다 보유
  await waitFor(A, (v) => v.scene?.id === "hub", "hub");
  assert(A.view!.you.inventory.some((i) => i.id === "talisman"), "A has talisman");
  assert(B.view!.you.inventory.some((i) => i.id === "talisman"), "B has talisman (target both in either mode)");
  A.socket.emit("game:submit", { choiceId: "hub_case" });

  // 5. goshiwon (both) — 비대칭 서술 + 정답 코드
  await waitFor(A, (v) => v.scene?.id === "ep1_goshiwon", "goshiwon");
  assert(A.view!.scene!.text.includes("손자국"), "A sees spirit clues (손자국)");
  assert(B.view!.scene!.text.includes("자물쇠"), "B sees the lock (자물쇠)");
  assert(!A.view!.scene!.text.includes("자물쇠"), "A does NOT see B's clue (asymmetry holds)");
  A.socket.emit("game:submit", { choiceId: "ep1_relay" });
  B.socket.emit("game:submit", { choiceId: "code_5392" });

  // 6. resolve_good (either) → rewards → ending
  await waitFor(A, (v) => v.scene?.id === "ep1_resolve_good", "resolve_good");
  A.socket.emit("game:submit", { choiceId: "good_back" });
  await waitFor(A, (v) => v.status === "ending", "ending");
  assert(B.view!.you.inventory.some((i) => i.id === "diary"), "B has diary reward");
  const aOccultEnd = A.view!.you.stats.find((s) => s.key === "occultLore")!.value;
  assert(aOccultEnd === 1, `A 오컬트 지식 +1 from reward (got ${aOccultEnd})`);
  assert(A.view!.scene!.ending === true, "scene flagged ending");

  A.socket.disconnect();
  B.socket.disconnect();
}

async function failAndRestart() {
  console.log("\n=== FAIL + RESTART ===");
  const A = connect("가현");
  const B = connect("나림");
  await sleep(300);
  const code = await createSession(A);
  await join(A, code, "pid-A2");
  await join(B, code, "pid-B2");

  // 빠르게 hub까지
  await waitFor(A, (v) => v.scene?.id === "ep1_arrival", "arrival");
  A.socket.emit("game:submit", { choiceId: "enter0" });
  B.socket.emit("game:submit", { choiceId: "enter1" });
  await waitFor(A, (v) => v.scene?.id === "ep1_meet", "meet");
  A.socket.emit("game:submit", { choiceId: "meet_tone" });
  B.socket.emit("game:submit", { choiceId: "meet_tone" });
  await waitFor(A, (v) => v.scene?.id === "ep1_brief", "brief");
  A.socket.emit("game:submit", { choiceId: "brief_go" });
  await waitFor(A, (v) => v.scene?.id === "hub", "hub");
  A.socket.emit("game:submit", { choiceId: "hub_case" });

  // 오답
  await waitFor(A, (v) => v.scene?.id === "ep1_goshiwon", "goshiwon");
  A.socket.emit("game:submit", { choiceId: "ep1_relay" });
  B.socket.emit("game:submit", { choiceId: "code_2935" });
  await waitFor(A, (v) => v.status === "gameover", "gameover");
  assert(A.view!.status === "gameover", "reached gameover on wrong code");

  // 재시작 → 체크포인트(hub)
  A.socket.emit("game:restart");
  await waitFor(A, (v) => v.status === "playing" && v.scene?.id === "hub", "restart→hub");
  assert(A.view!.scene?.id === "hub", "restart returns to hub checkpoint");

  A.socket.disconnect();
  B.socket.disconnect();
}

async function main() {
  await happyPath();
  await failAndRestart();
  console.log(`\n${failures === 0 ? "✅ ALL PASS" : `❌ ${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("SMOKE ERROR:", e.message);
  process.exit(1);
});
