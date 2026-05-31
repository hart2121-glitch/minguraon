"use client";

import type { ItemView, StatView } from "@/game/types";

function StatRow({ s }: { s: StatView }) {
  return (
    <div className="flex items-center justify-between text-sm py-0.5">
      <span className="text-ink-dim">{s.name}</span>
      <span className="text-ink-text tabular-nums">
        {"▰".repeat(Math.min(s.value, 8))}
        <span className="text-ink-border">{"▱".repeat(Math.max(0, 5 - s.value))}</span>
        <span className="ml-2 text-ink-accent">{s.value}</span>
      </span>
    </div>
  );
}

export function SidePanel({
  name,
  stats,
  inventory,
  spiritLevel,
  partnerName,
  partnerConnected,
}: {
  name: string;
  stats: StatView[];
  inventory: ItemView[];
  spiritLevel: number;
  partnerName: string | null;
  partnerConnected: boolean;
}) {
  const action = stats.filter((s) => s.kind === "action");
  const sense = stats.filter((s) => s.kind === "sense");

  return (
    <div className="bg-ink-panel border border-ink-border rounded-lg p-4 space-y-4 text-sm">
      <div>
        <div className="text-ink-text font-semibold">{name || "이름 없음"}</div>
        <div className="text-ink-dim text-xs mt-0.5">
          {partnerName ? (
            <>
              파트너: {partnerName}{" "}
              <span className={partnerConnected ? "text-ink-spirit" : "text-ink-warn"}>
                ●
              </span>
            </>
          ) : (
            <span className="text-ink-warn">파트너 대기 중…</span>
          )}
        </div>
      </div>

      <div>
        <div className="text-ink-dim text-xs uppercase tracking-wider mb-1">행동</div>
        {action.map((s) => (
          <StatRow key={s.key} s={s} />
        ))}
      </div>

      <div>
        <div className="text-ink-dim text-xs uppercase tracking-wider mb-1">감각 · 지식</div>
        {sense.map((s) => (
          <StatRow key={s.key} s={s} />
        ))}
      </div>

      <div>
        <div className="text-ink-dim text-xs uppercase tracking-wider mb-1">소지품</div>
        {inventory.length === 0 ? (
          <div className="text-ink-border text-xs">— 비어 있음 —</div>
        ) : (
          <ul className="space-y-1">
            {inventory.map((it, i) => (
              <li key={`${it.id}-${i}`} className="text-ink-text" title={it.desc}>
                · {it.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-2 border-t border-ink-border">
        <div className="flex items-center justify-between">
          <span className="text-ink-dim text-xs">심령 활동 수위</span>
          <span className="text-ink-spirit tabular-nums">{spiritLevel}</span>
        </div>
        <div className="mt-1 h-1.5 bg-ink-bg rounded overflow-hidden">
          <div
            className="h-full bg-ink-spirit/70 transition-all"
            style={{ width: `${Math.min(100, spiritLevel * 12)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
