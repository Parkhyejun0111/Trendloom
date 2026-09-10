"use client";

import type { SourceStatus } from "@/lib/naver-trend";
import { LIFECYCLE_LABEL_KR, type LifecycleStage } from "@/lib/trend-engine";
import { Pill } from "./ui";

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

/** 대시보드용 한 줄 요약 카드 — 상세 신호 breakdown은 Detail 화면 몫이라 여기선 이름/라이프사이클/모멘텀만 */
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="trend-signal card-glass flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition hover:brightness-[0.99]"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-widest text-trend-navy/55">TODAY&apos;S SIGNAL</p>
        <p className="mt-1 truncate text-lg font-extrabold tracking-tight text-trend-navy">{name}</p>
        <span className="mt-1 inline-block">
          <Pill>{LIFECYCLE_LABEL_KR[lifecycle]}</Pill>
        </span>
      </div>
      <div className="shrink-0 text-center">
        <p className="text-4xl font-extrabold tracking-tight text-trend-navy">{Math.round(momentum)}</p>
        <p className="mt-0.5 text-[9.5px] font-bold tracking-widest text-trend-navy/55">MOMENTUM</p>
      </div>
    </button>
  );
}
