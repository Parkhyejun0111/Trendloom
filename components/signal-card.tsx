"use client";

import type { SourceStatus } from "@/lib/naver-trend";
import type { LifecycleStage } from "@/lib/trend-engine";

export function SourceBadge({ label, status }: { label: string; status?: SourceStatus }) {
  const s = status ?? "unavailable";
  const dot = s === "live" ? "●" : s === "demo" ? "○" : "—";
  const text = s === "live" ? "LIVE" : s === "demo" ? "DEMO" : "UNAVAILABLE";
  const tone = s === "live" ? "text-trend-positive" : s === "demo" ? "text-white/70" : "text-white/40";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[9.5px] font-semibold tracking-wider text-white/70">
      {label}
      <span className={tone}>
        {dot} {text}
      </span>
    </span>
  );
}

export function SignalRow({ label, value }: { label: string; value: number | null }) {
  const up = (value ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-trend-navy/70">{label}</span>
      <span className={`font-bold ${value === null ? "text-trend-navy/40" : up ? "text-trend-positive" : "text-trend-negative"}`}>
        {value === null ? "연결 대기" : `${up ? "+" : ""}${value}%`}
      </span>
    </div>
  );
}

const DOWN_STAGES: LifecycleStage[] = ["DECLINING", "SATURATED"];

/** 대시보드용 "라이브 티커 바" — 연핑크 알약형 바 하나로 오늘의 시그널을 압축해서 보여준다 */
export function HeroSignalCard({
  name,
  lifecycle,
  momentum,
  onClick,
}: {
  name: string;
  lifecycle: LifecycleStage;
  momentum: number;
  onClick?: () => void;
}) {
  const up = !DOWN_STAGES.includes(lifecycle);
  return (
    <button
      type="button"
      onClick={onClick}
      className="trend-pink glass-bead-pink-static flex w-full items-center gap-2.5 rounded-full py-3 pl-4 pr-5 text-left transition hover:brightness-[0.97]"
    >
      <span className="pulse-dot size-2 shrink-0 rounded-full bg-trend-navy" />
      <span className="shrink-0 text-[10px] font-extrabold tracking-widest text-trend-navy/55">
        TODAY&apos;S SIGNAL
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold tracking-tight text-trend-navy">
        {name}
      </span>
      <span className={`text-xs font-bold ${up ? "text-trend-positive" : "text-trend-negative"}`}>
        {up ? "▲" : "▼"}
      </span>
      <span className="text-lg font-extrabold tabular-nums text-trend-navy">{Math.round(momentum)}</span>
    </button>
  );
}
