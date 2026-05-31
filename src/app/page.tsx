"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { getName, setName as persistName } from "@/lib/identity";

export default function Lobby() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(getName());
  }, []);

  function saveName() {
    persistName(name.trim());
  }

  function createSession() {
    saveName();
    setBusy(true);
    const socket = io({ transports: ["websocket", "polling"] });
    socket.emit("session:create", (res: { sessionId: string }) => {
      socket.disconnect();
      router.push(`/play/${res.sessionId}`);
    });
  }

  function joinSession() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    saveName();
    router.push(`/play/${c}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-3xl tracking-[0.3em] text-ink-text mb-3">유 천 당</h1>
          <p className="text-ink-dim text-sm leading-relaxed">
            둘이 함께 보는 것이 다르다.
            <br />
            종로 3가, 보이지 않는 것들의 세계.
          </p>
        </div>

        <div className="bg-ink-panel border border-ink-border rounded-lg p-6 space-y-5">
          <label className="block">
            <span className="text-ink-dim text-xs">이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              placeholder="당신의 이름"
              maxLength={16}
              className="mt-1 w-full bg-ink-bg border border-ink-border rounded px-3 py-2 text-ink-text outline-none focus:border-ink-accent"
            />
          </label>

          <button
            onClick={createSession}
            disabled={busy}
            className="w-full bg-ink-accent/20 border border-ink-accent text-ink-text rounded py-2.5 hover:bg-ink-accent/30 transition disabled:opacity-50"
          >
            {busy ? "세션 생성 중…" : "새 세션 만들기"}
          </button>

          <div className="flex items-center gap-3 text-ink-dim text-xs">
            <div className="h-px flex-1 bg-ink-border" />
            또는 코드로 참가
            <div className="h-px flex-1 bg-ink-border" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinSession()}
              placeholder="세션 코드"
              maxLength={5}
              className="flex-1 bg-ink-bg border border-ink-border rounded px-3 py-2 text-ink-text tracking-[0.3em] text-center outline-none focus:border-ink-accent"
            />
            <button
              onClick={joinSession}
              className="px-5 bg-ink-bg border border-ink-border rounded hover:border-ink-accent transition"
            >
              참가
            </button>
          </div>
        </div>

        <p className="text-ink-dim text-xs text-center mt-6 leading-relaxed">
          2인 협력 전용. 세션을 만들어 코드를 친구에게 전하세요.
          <br />
          둘 다 접속해야 이야기가 시작됩니다.
        </p>
      </div>
    </main>
  );
}
