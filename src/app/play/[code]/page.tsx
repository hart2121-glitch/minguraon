"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useGameSocket } from "@/lib/useGameSocket";
import { SidePanel } from "@/components/SidePanel";
import { Chat } from "@/components/Chat";

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const { connected, view, slot, joinError, actionError, submit, restart, sendChat } =
    useGameSocket(code);
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (joinError) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-ink-warn">{joinError}</p>
          <Link href="/" className="text-ink-accent underline">
            로비로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink-dim animate-pulse">
          {connected ? "세션에 합류하는 중…" : "서버에 연결하는 중…"}
        </p>
      </main>
    );
  }

  const scene = view.scene;
  const waiting = scene?.waitingForPartner ?? false;

  return (
    <main className="min-h-screen p-3 md:p-5 max-w-6xl mx-auto">
      {/* 헤더 */}
      <header className="flex items-center justify-between mb-4 text-sm">
        <Link href="/" className="text-ink-dim hover:text-ink-text tracking-[0.25em]">
          유천당
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={copyCode}
            className="text-ink-dim hover:text-ink-text border border-ink-border rounded px-3 py-1"
            title="세션 코드 복사"
          >
            코드 <span className="text-ink-text tracking-[0.2em]">{code}</span>
            {copied && <span className="text-ink-spirit ml-2">복사됨</span>}
          </button>
          <span
            className={`text-xs ${connected ? "text-ink-spirit" : "text-ink-warn"}`}
            title={connected ? "연결됨" : "연결 끊김"}
          >
            ●
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* 본문 */}
        <section className="space-y-5">
          {view.status === "paused" && (
            <div className="bg-ink-warn/10 border border-ink-warn/40 rounded-lg px-4 py-3 text-ink-warn text-sm">
              파트너의 접속이 끊겼습니다. 둘 다 접속하면 이야기가 재개됩니다.
            </div>
          )}

          <article className="bg-ink-panel border border-ink-border rounded-lg p-6">
            {scene?.title && (
              <h2 className="text-ink-dim text-sm tracking-wider mb-4">{scene.title}</h2>
            )}
            <p className="narrative text-ink-text whitespace-pre-wrap">{scene?.text}</p>
          </article>

          {/* 결말 */}
          {view.status === "ending" && (
            <div className="text-center space-y-4 py-4">
              <p className="text-ink-spirit tracking-widest">— 막을 내립니다 —</p>
              <Link href="/" className="inline-block text-ink-accent underline">
                로비로 돌아가기
              </Link>
            </div>
          )}

          {/* 게임 오버 */}
          {view.status === "gameover" && (
            <div className="text-center space-y-4 py-4">
              <p className="text-ink-warn tracking-widest">— 실패 —</p>
              <button
                onClick={restart}
                className="bg-ink-warn/15 border border-ink-warn/50 text-ink-text rounded px-6 py-2.5 hover:bg-ink-warn/25 transition"
              >
                마지막 거점에서 다시 도전
              </button>
            </div>
          )}

          {/* 선택지 */}
          {view.status === "playing" && scene && (
            <div className="space-y-2">
              {waiting ? (
                <div className="text-ink-dim text-sm py-3 animate-pulse">
                  선택을 마쳤습니다. 파트너의 선택을 기다리는 중…
                </div>
              ) : scene.choices.length === 0 ? (
                <div className="text-ink-dim text-sm py-3">
                  이 장면에서 당신이 할 수 있는 일은 없습니다. 파트너에게 맡기세요.
                </div>
              ) : (
                scene.choices.map((c) => (
                  <button
                    key={c.id}
                    disabled={c.locked}
                    onClick={() => submit(c.id)}
                    className={`block w-full text-left rounded px-4 py-3 border transition ${
                      c.locked
                        ? "border-ink-border text-ink-dim cursor-not-allowed opacity-60"
                        : "border-ink-border text-ink-text hover:border-ink-accent hover:bg-ink-accent/10"
                    }`}
                  >
                    <span className="text-ink-accent mr-2">▸</span>
                    {c.label}
                    {c.locked && c.lockedHint && (
                      <span className="text-ink-warn text-xs ml-2">[{c.lockedHint}]</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {actionError && (
            <div className="text-ink-warn text-sm">{actionError}</div>
          )}
        </section>

        {/* 사이드: 상태 + 채팅 */}
        <aside className="flex flex-col gap-4 lg:h-[calc(100vh-7rem)]">
          <SidePanel
            name={view.you.name}
            stats={view.you.stats}
            inventory={view.you.inventory}
            spiritLevel={view.world.spiritLevel}
            partnerName={view.partner?.name ?? null}
            partnerConnected={view.partner?.connected ?? false}
          />
          <div className="flex-1 min-h-[260px]">
            <Chat messages={view.chat} mySlot={slot} onSend={sendChat} />
          </div>
        </aside>
      </div>
    </main>
  );
}
