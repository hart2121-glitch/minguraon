"use client";

import { useEffect, useRef } from "react";
import type { ItemView, StatView } from "@/game/types";

const SPIRIT_STAGES = ["정적", "발현 단계", "침식 단계", "위험 단계"];

function spiritStage(level: number): string {
  if (level >= 6) return SPIRIT_STAGES[3];
  if (level >= 4) return SPIRIT_STAGES[2];
  if (level >= 2) return SPIRIT_STAGES[1];
  return SPIRIT_STAGES[0];
}

function SpiritGauge({ level }: { level: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const stateRef = useRef({ t: 0, val: 0, target: 0, swellHold: 0, last: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const targetVal = Math.min(level / 8, 1);
    const s = stateRef.current;
    s.target = targetVal;

    const el = canvas;
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const W = el.clientWidth;
      const H = el.clientHeight;
      el.width = W * dpr;
      el.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const COL = { spirit: "#9aac4e", warn: "#c5503a", bone: "#d7ccc2", dim: "#6f635c", track: "#2c2320" };
    const A0 = Math.PI * 1.12, A1 = Math.PI * 1.88;
    const ang = (v: number) => A0 + v * (A1 - A0);

    function step(ts: number) {
      rafRef.current = requestAnimationFrame(step);
      if (ts - s.last < 33) return;
      s.last = ts;
      s.t += 0.018;

      if (s.swellHold <= 0 && Math.random() < 0.004 && level > 0) {
        s.target = targetVal * 0.9 + Math.random() * 0.2;
        s.swellHold = 60;
      }
      if (s.swellHold > 0) { s.swellHold--; }
      else { s.target = targetVal + Math.sin(s.t * 0.5) * 0.03; }
      s.val += (s.target - s.val) * 0.06;
      const tremor = (Math.sin(s.t * 7) + (Math.random() - 0.5) * 0.6) * 0.012;
      const v = Math.max(0, Math.min(1, s.val + tremor));

      const W = el.clientWidth, H = el.clientHeight;
      const cx = W / 2, cy = H * 0.92, R = Math.min(W * 0.42, H * 0.82);

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0b0908";
      ctx.fillRect(0, 0, W, H);

      ctx.lineCap = "butt"; ctx.lineWidth = 2; ctx.strokeStyle = COL.track;
      ctx.beginPath(); ctx.arc(cx, cy, R, A0, A1); ctx.stroke();

      ctx.strokeStyle = COL.warn; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, ang(0.8), A1); ctx.stroke();
      ctx.globalAlpha = 1;

      for (let i = 0; i <= 10; i++) {
        const a = ang(i / 10), inner = i % 5 === 0 ? R - 8 : R - 4;
        ctx.strokeStyle = i >= 8 ? COL.warn : COL.dim;
        ctx.globalAlpha = i % 5 === 0 ? 0.9 : 0.45;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.lineTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = COL.spirit; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, R, A0, ang(v)); ctx.stroke();

      const a = ang(v), nl = R - 3;
      ctx.strokeStyle = v > 0.78 ? COL.warn : COL.bone;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a + Math.PI) * 9, cy + Math.sin(a + Math.PI) * 9);
      ctx.lineTo(cx + Math.cos(a) * nl, cy + Math.sin(a) * nl);
      ctx.stroke();

      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = COL.bone; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [level]);

  const segs = Math.min(Math.floor(level / 1.6), 5);

  return (
    <div className="border border-ink-border rounded-ink bg-[#0b0908]">
      <div className="flex items-baseline justify-between px-3 pt-[9px] pb-1.5">
        <span className="font-serif text-[13px] tracking-[0.1em] text-ink-spirit whitespace-nowrap">
          {spiritStage(level)}
        </span>
        <span className="font-mono text-[11px] text-ink-dim whitespace-nowrap">
          {level.toFixed(1)} μT
        </span>
      </div>
      <canvas ref={canvasRef} className="block w-full h-24" />
      <div className="flex gap-[3px] px-3 pb-[11px]">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 h-1 ${i < segs ? "bg-ink-spirit opacity-85" : "bg-ink-border"}`}
          />
        ))}
      </div>
    </div>
  );
}

function PanelHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 font-mono text-[11px] tracking-[0.22em] uppercase text-ink-dim after:content-[''] after:flex-1 after:h-px after:bg-ink-border">
      {label}
    </div>
  );
}

function StatRow({ s }: { s: StatView }) {
  const filled = Math.min(s.value, 5);
  const isSpirit = s.key === "spiritSight";
  return (
    <div className="flex items-center gap-3 py-[5px]">
      <span className="text-sm text-ink-text w-16 shrink-0">{s.name}</span>
      <span className="flex gap-1 flex-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <i
            key={i}
            className={`w-3.5 h-[5px] rounded-[1px] ${
              i < filled
                ? isSpirit ? "bg-ink-spirit" : "bg-ink-soft"
                : "bg-ink-border"
            }`}
          />
        ))}
      </span>
      <span className="font-mono text-[11px] text-ink-dim w-[34px] text-right">
        {s.value}/5
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
  const sense  = stats.filter((s) => s.kind === "sense");

  return (
    <aside className="order-[-1] flex flex-col min-h-0 bg-ink-panel border-r border-ink-border overflow-y-auto p-5">
      {/* 플레이어 / 파트너 */}
      <div className="mb-5">
        <PanelHeader label={name || "이름 없음"} />
        <div className="font-mono text-[11px] text-ink-dim">
          {partnerName ? (
            <>
              파트너: {partnerName}{" "}
              <span className={partnerConnected ? "text-ink-spirit" : "text-ink-warn"}>●</span>
            </>
          ) : (
            <span className="text-ink-warn">파트너 대기 중…</span>
          )}
        </div>
      </div>

      {/* 스탯 */}
      <div className="mb-5">
        <PanelHeader label="스탯" />
        <div className="mb-4">
          <div className="font-serif text-[13px] tracking-[0.18em] text-ink-soft mb-2">행동</div>
          {action.map((s) => <StatRow key={s.key} s={s} />)}
        </div>
        <div>
          <div className="font-serif text-[13px] tracking-[0.18em] text-ink-soft mb-2">감각</div>
          {sense.map((s) => <StatRow key={s.key} s={s} />)}
        </div>
      </div>

      {/* 소지품 */}
      <div className="mb-5">
        <PanelHeader label="소지품" />
        {inventory.length === 0 ? (
          <div className="font-mono text-[11px] text-ink-dim">— 비어 있음 —</div>
        ) : (
          inventory.map((it, i) => (
            <div
              key={`${it.id}-${i}`}
              className="flex items-baseline gap-2.5 py-[7px] border-b border-ink-border/60 last:border-b-0"
              title={it.desc}
            >
              <span className="text-sm text-ink-text">{it.name}</span>
              <span className="ml-auto font-mono text-[11px] text-ink-dim">×1</span>
            </div>
          ))
        )}
      </div>

      {/* 심령 게이지 */}
      <div>
        <PanelHeader label="심령 활동 수위" />
        <SpiritGauge level={spiritLevel} />
      </div>
    </aside>
  );
}
