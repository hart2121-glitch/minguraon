"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useGameSocket } from "@/lib/useGameSocket";
import { SidePanel } from "@/components/SidePanel";
import { Chat } from "@/components/Chat";

interface HistoryEntry {
  key: number;
  sceneId: string;
  title?: string;
  text: string;
}

export default function PlayPage() {
  const params = useParams<{ code: string }>();
  const code = (params.code ?? "").toUpperCase();
  const { connected, view, slot, joinError, actionError, submit, restart, sendChat } =
    useGameSocket(code);
  const [copied, setCopied] = useState(false);

  // 지나온 장면을 누적해서 위로 스크롤하면 이전 내용을 볼 수 있게 한다.
  // 같은 장면이 여러 번 전송돼도(채팅·대기 상태 토글 등) 중복 추가하지 않는다.
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const lastSceneRef = useRef<{ id: string; text: string } | null>(null);
  const keyRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastEntryRef = useRef<HTMLDivElement | null>(null);

  const scene = view?.scene ?? null;
  const sceneId = scene?.id ?? null;
  const sceneText = scene?.text ?? "";

  // 새 장면(또는 같은 장면이라도 결과 서술이 바뀐 경우)만 히스토리에 추가
  useEffect(() => {
    if (!sceneId) return;
    const last = lastSceneRef.current;
    if (last && last.id === sceneId && last.text === sceneText) return;
    lastSceneRef.current = { id: sceneId, text: sceneText };
    setHistory((prev) => {
      // 같은 장면의 텍스트 갱신이면 마지막 항목을 교체, 아니면 새로 append
      if (prev.length > 0 && prev[prev.length - 1].sceneId === sceneId) {
        const next = prev.slice(0, -1);
        next.push({ ...prev[prev.length - 1], title: scene?.title, text: sceneText });
        return next;
      }
      keyRef.current += 1;
      return [...prev, { key: keyRef.current, sceneId, title: scene?.title, text: sceneText }];
    });
  }, [sceneId, sceneText, scene?.title]);

  // 새 장면 진입 시 그 시작 부분이 보이도록 스크롤 (이전 내용은 위로 올려 확인 가능)
  useEffect(() => {
    lastEntryRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [history.length]);

  function copyCode() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (joinError) {
    return (
      <main className="h-screen flex items-center justify-center p-6 font-serif">
        <div className="text-center space-y-4">
          <p className="text-ink-warn">{joinError}</p>
          <Link href="/" className="font-mono text-[11px] tracking-label uppercase text-ink-dim hover:text-ink-text transition-colors">
            ← 로비로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="h-screen flex items-center justify-center font-serif">
        <p className="font-mono text-[11px] tracking-label uppercase text-ink-dim animate-blink">
          {connected ? "세션에 합류하는 중…" : "서버에 연결하는 중…"}
        </p>
      </main>
    );
  }

  const waiting = scene?.waitingForPartner ?? false;
  const partnerWaiting = scene?.partnerWaiting ?? false;

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── 헤더 ── */}
      <header className="flex-shrink-0 flex items-center gap-6 h-[60px] px-6 border-b border-ink-border bg-gradient-to-b from-[#120d0c] to-ink-panel">
        <div className="flex items-baseline gap-3.5">
          <Link
            href="/"
            className="font-display font-extrabold text-[22px] tracking-[0.14em] text-ink-text hover:text-ink-soft transition-colors"
          >
            령안
          </Link>
          {scene?.title && (
            <span className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-dim pl-3.5 border-l border-ink-border">
              {scene.title}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-6">
          <button
            onClick={copyCode}
            className="font-mono text-xs tracking-[0.12em] text-ink-soft hover:text-ink-text transition-colors"
          >
            SESSION{" "}
            <span className="text-ink-text font-medium">{code}</span>
            {copied && <span className="text-ink-spirit ml-2">복사됨</span>}
          </button>
          <div className="flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] text-ink-dim">
            <span
              className={`w-[7px] h-[7px] rounded-full ${
                connected ? "bg-ink-spirit animate-breathe" : "bg-ink-warn"
              }`}
            />
            {connected ? "2인 접속" : "연결 끊김"}
          </div>
        </div>
      </header>

      {/* ── 본문 3열 ── */}
      <div className="flex-1 grid grid-cols-[322px_1fr_360px] min-h-0">

        {/* 좌: 스탯·소지품·게이지 (SidePanel 내부에서 order-[-1]) */}
        <SidePanel
          name={view.you.name}
          stats={view.you.stats}
          inventory={view.you.inventory}
          spiritLevel={view.world.spiritLevel}
          partnerName={view.partner?.name ?? null}
          partnerConnected={view.partner?.connected ?? false}
        />

        {/* 중앙: 내러티브 + 선택지 */}
        <section className="flex flex-col min-h-0 border-r border-ink-border">

          {/* 일시정지 배너 */}
          {view.status === "paused" && (
            <div className="flex-shrink-0 px-[26px] py-2.5 bg-ink-warn/10 border-b border-ink-warn/30">
              <p className="font-mono text-[11px] tracking-[0.1em] text-ink-warn">
                파트너의 접속이 끊겼습니다 — 둘 다 접속하면 이야기가 재개됩니다.
              </p>
            </div>
          )}

          {/* 내러티브 — 지나온 장면 누적. 위로 스크롤하면 이전 내용 확인 가능 */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-[26px] pt-3.5 pb-10 min-h-0">
            {history.map((entry, i) => (
              <div
                key={entry.key}
                ref={i === history.length - 1 ? lastEntryRef : undefined}
                className={i > 0 ? "mt-8 pt-8 border-t border-ink-border/50" : ""}
              >
                {entry.title && (
                  <div className="mb-3 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-dim">
                    {entry.title}
                  </div>
                )}
                <div
                  className={`narrative whitespace-pre-wrap ${
                    i < history.length - 1 ? "text-ink-dim" : ""
                  }`}
                >
                  {entry.text}
                </div>
              </div>
            ))}
          </div>

          {/* 결말 */}
          {view.status === "ending" && (
            <div className="flex-shrink-0 text-center space-y-4 py-6 px-[26px] border-t border-ink-border">
              <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-ink-spirit">
                — 막을 내립니다 —
              </p>
              <Link
                href="/"
                className="inline-block font-mono text-[11px] tracking-label uppercase text-ink-dim hover:text-ink-text transition-colors"
              >
                ← 로비로 돌아가기
              </Link>
            </div>
          )}

          {/* 게임 오버 */}
          {view.status === "gameover" && (
            <div className="flex-shrink-0 text-center space-y-4 py-6 px-[26px] border-t border-ink-border">
              <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-ink-warn">
                — 실패 —
              </p>
              {view.gameoverReason && (
                <p className="font-serif text-sm text-ink-soft">{view.gameoverReason}</p>
              )}
              <button
                onClick={restart}
                className="choice inline-flex max-w-xs mx-auto justify-center"
              >
                <span className="txt">마지막 거점에서 다시 도전</span>
              </button>
            </div>
          )}

          {/* 선택지 */}
          {view.status === "playing" && scene && (
            <div className="flex-shrink-0 px-[26px] pb-[30px]">
              {waiting ? (
                <p className="font-mono text-[11px] tracking-[0.1em] text-ink-dim py-3 animate-blink">
                  선택을 마쳤습니다. 파트너의 선택을 기다리는 중…
                </p>
              ) : scene.choices.length === 0 ? (
                <p className="font-mono text-[11px] tracking-[0.1em] text-ink-dim py-3">
                  이 장면에서 당신이 할 수 있는 일은 없습니다.
                </p>
              ) : (
                <>
                  {partnerWaiting && (
                    <p className="font-mono text-[11px] tracking-[0.1em] text-ink-spirit mb-3 animate-blink">
                      파트너가 선택을 마치고 당신을 기다리고 있습니다…
                    </p>
                  )}
                  <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-ink-dim mb-3">
                    행동을 선택하시오 — 되돌릴 수 없음
                  </p>
                  {scene.choices.map((c, idx) => (
                    <button
                      key={c.id}
                      disabled={c.locked}
                      onClick={() => submit(c.id)}
                      className="choice"
                    >
                      <span className="idx">{String.fromCharCode(65 + idx)}</span>
                      <span className="txt">
                        {c.stats && c.stats.length > 0 && (
                          <span className="mr-1.5 font-mono text-[11px] tracking-[0.04em]">
                            {c.stats.map((st, i) => (
                              <span
                                key={st.key}
                                className={st.met ? "text-ink-spirit" : "text-ink-warn"}
                              >
                                {i > 0 && " "}
                                {st.name}
                              </span>
                            ))}
                          </span>
                        )}
                        <span className={c.locked ? "text-ink-dim" : ""}>{c.label}</span>
                        {c.locked && c.lockedHint && (
                          <span className="sub">{c.lockedHint}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </>
              )}
              {actionError && (
                <p className="font-mono text-[11px] text-ink-warn mt-2">{actionError}</p>
              )}
            </div>
          )}
        </section>

        {/* 우: 무전 채널 */}
        <Chat messages={view.chat} mySlot={slot} onSend={sendChat} />
      </div>
    </div>
  );
}
