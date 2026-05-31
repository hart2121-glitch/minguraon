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
    <main className="min-h-screen flex items-center justify-center p-6 font-serif overflow-auto">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <h1 className="font-display font-extrabold text-[38px] tracking-[0.18em] text-ink-text mb-4">
            령안
          </h1>
          <p className="font-serif text-sm text-ink-soft leading-relaxed">
            둘이 함께 보는 것이 다르다.
            <br />
            종로 3가, 보이지 않는 것들의 세계.
          </p>
        </div>

        <div className="border border-ink-border rounded-ink bg-ink-panel p-6 space-y-5">
          <label className="block">
            <span className="font-mono text-[11px] tracking-label uppercase text-ink-dim">이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              placeholder="당신의 이름"
              maxLength={16}
              className="mt-2 w-full bg-ink-panel2 border border-ink-border rounded-ink px-3 py-2.5 text-ink-text font-serif placeholder:text-[#5c514b] outline-none focus:border-[#4a3a32] transition-colors"
            />
          </label>

          <button
            onClick={createSession}
            disabled={busy}
            className="choice justify-center disabled:opacity-50"
          >
            <span className="txt">{busy ? "세션 생성 중…" : "새 세션 만들기"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-border" />
            <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-ink-dim">또는 코드로 참가</span>
            <div className="h-px flex-1 bg-ink-border" />
          </div>

          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinSession()}
              placeholder="세션 코드"
              maxLength={5}
              className="flex-1 bg-ink-panel2 border border-ink-border rounded-ink px-3 py-2.5 text-ink-text font-mono tracking-[0.3em] text-center placeholder:text-[#5c514b] outline-none focus:border-[#4a3a32] transition-colors"
            />
            <button
              onClick={joinSession}
              className="flex-shrink-0 border border-ink-border rounded-ink px-4 font-mono text-[11px] tracking-[0.14em] text-ink-soft hover:border-ink-accent hover:text-ink-accent transition-colors"
            >
              참가
            </button>
          </div>
        </div>

        <p className="font-mono text-[10px] tracking-[0.08em] text-ink-dim text-center mt-6 leading-relaxed">
          2인 협력 전용. 세션을 만들어 코드를 친구에게 전하세요.
          <br />
          둘 다 접속해야 이야기가 시작됩니다.
        </p>
      </div>
    </main>
  );
}
