"use client";

import { useId } from "react";

/**
 * 검증 완료된 카테고리 팔레트 (dark, surface #141417) — 순서 고정, 순환 금지.
 * violet → aqua → blue → yellow → magenta
 * adjacent CVD ΔE 13.2 · normal-vision ΔE 19.3 · 전 슬롯 contrast ≥ 3:1
 * (dataviz validate_palette.js --mode dark --surface "#141417" 통과)
 */
export const SERIES = ["#9085e9", "#199e70", "#3987e5", "#c98500", "#d55181"];

const SURFACE = "#141417";


/* ================================================================== */
/* 스탯 타일 — 차트를 읽기 전에 결론부터                                */
/* ================================================================== */

export function StatTile({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  spark,
  color = SERIES[0],
}: {
  label: string;
  value: string;
  unit?: string;
  /** 양수 = 상승 */
  delta?: number;
  deltaLabel?: string;
  spark?: number[];
  color?: string;
}) {
  const up = (delta ?? 0) > 0;
  return (
    <div className="elev relative overflow-hidden rounded-xl border border-line p-4">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <p className="text-[11px] font-medium tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </p>

      {delta !== undefined && (
        <p className="mt-1 flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            className={up ? "text-[#0ca30c]" : "text-[#e66767]"}
          >
            {up ? "▲" : "▼"}
          </span>
          <span className={up ? "text-[#0ca30c]" : "text-[#e66767]"}>
            {up ? "+" : ""}
            {delta}%
          </span>
          {deltaLabel && <span className="text-muted">{deltaLabel}</span>}
        </p>
      )}

      {spark && spark.length > 1 && <Sparkline data={spark} color={color} />}
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const id = useId();
  const w = 132;
  const h = 30;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const span = Math.max(1e-6, hi - lo);
  const x = (i: number) => (i / (data.length - 1)) * w;
  const y = (v: number) => h - 3 - ((v - lo) / span) * (h - 8);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2.5 h-[30px] w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <circle
        cx={x(data.length - 1)}
        cy={y(data[data.length - 1])}
        r={2.6}
        fill={color}
        stroke={SURFACE}
        strokeWidth={1.6}
      />
    </svg>
  );
}
