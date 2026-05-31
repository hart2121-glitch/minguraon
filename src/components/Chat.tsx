"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, Slot } from "@/game/types";

export function Chat({
  messages,
  mySlot,
  onSend,
}: {
  messages: ChatMessage[];
  mySlot: Slot | null;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <div className="bg-ink-panel border border-ink-border rounded-lg flex flex-col h-full min-h-0">
      <div className="px-4 py-2 border-b border-ink-border text-ink-dim text-xs uppercase tracking-wider">
        무전 채널
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 text-sm min-h-0">
        {messages.length === 0 && (
          <div className="text-ink-border text-xs">— 파트너와 단서를 나누세요 —</div>
        )}
        {messages.map((m) => {
          if (m.slot === "system") {
            return (
              <div key={m.id} className="text-ink-dim text-xs italic text-center py-0.5">
                {m.text}
              </div>
            );
          }
          const mine = m.slot === mySlot;
          return (
            <div key={m.id} className={mine ? "text-right" : "text-left"}>
              <span className="text-ink-dim text-xs">{m.name}</span>
              <div
                className={`inline-block rounded px-2.5 py-1 mt-0.5 max-w-[85%] break-words ${
                  mine
                    ? "bg-ink-accent/20 border border-ink-accent/40 text-ink-text"
                    : "bg-ink-bg border border-ink-border text-ink-text"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="p-2 border-t border-ink-border flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="메시지…"
          maxLength={500}
          className="flex-1 bg-ink-bg border border-ink-border rounded px-3 py-1.5 text-ink-text text-sm outline-none focus:border-ink-accent"
        />
        <button
          onClick={send}
          className="px-4 bg-ink-bg border border-ink-border rounded text-sm hover:border-ink-accent transition"
        >
          전송
        </button>
      </div>
    </div>
  );
}
