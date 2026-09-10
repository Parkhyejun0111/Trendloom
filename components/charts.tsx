"use client";

import { useId } from "react";

/** Trend Intelligence 전용 시리즈 컬러 — 네이비 고정. 차트마다 색을 무작위로 바꾸지 않는다 */
export const TREND_LINE_COLOR = "#02075D";

/**
 * 브랜드 팔레트 그대로 쓰는 카테고리 컬러 (light, surface #ffffff) — 순서 고정, 순환 금지.
 * 네이비(메인) → 잉크블랙 → 딥핑크 → 그레이 → 슬레이트 네이비
 */
export const SERIES = ["#02075D", "#12120f", "#D6739A", "#8B94A3", "#5B6E9E"];

const SURFACE = "#ffffff";


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
        <span className="text-2xl font-extrabold tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </p>

      {delta !== undefined && (
        <p className="mt-1 flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            className={up ? "text-[#1a7a34]" : "text-[#b3261e]"}
          >
            {up ? "▲" : "▼"}
          </span>
          <span className={up ? "text-[#1a7a34]" : "text-[#b3261e]"}>
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

/* ================================================================== */
/* Trend Intelligence — Interest Line Chart (축/단위를 숨기지 않는다)   */
/* ================================================================== */

export function TrendLineChart({
  series,
  color = TREND_LINE_COLOR,
}: {
  /** 최근 N주 관심도(0~100), 오래된 값이 먼저 온다 */
  series: number[];
  color?: string;
}) {
  const id = useId();
  const w = 320;
  const h = 140;
  const padTop = 10;
  const padBottom = 20;
  const innerH = h - padTop - padBottom;
  const x = (i: number) => (i / Math.max(1, series.length - 1)) * w;
  const y = (v: number) => padTop + innerH - (v / 100) * innerH;
  const line = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[140px] w-full" role="img" aria-label="관심도 추이 라인 차트">
        <defs>
          <linearGradient id={`tl-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={0} x2={w} y1={y(g)} y2={y(g)} stroke="rgba(2, 7, 93,0.1)" strokeWidth={1} />
            <text x={2} y={y(g) - 3} fontSize={8} fill="#737983">
              {g}
            </text>
          </g>
        ))}
        <path d={`${line} L${w},${y(0)} L0,${y(0)} Z`} fill={`url(#tl-${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {series.length > 0 && (
          <circle cx={x(series.length - 1)} cy={y(series[series.length - 1])} r={3} fill={color} stroke="#fff" strokeWidth={1.6} />
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>W1</span>
        <span>W{Math.ceil(series.length / 2)}</span>
        <span>W{series.length}</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Trend Intelligence — Horizontal Bar (순위/세그먼트 비교)             */
/* ================================================================== */

export function HorizontalBarChart({
  items,
  color = TREND_LINE_COLOR,
  suffix = "%",
}: {
  items: { label: string; value: number }[];
  color?: string;
  suffix?: string;
}) {
  const max = Math.max(1, ...items.map((it) => Math.abs(it.value)));
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-paper/80">{it.label}</span>
            <span className="font-bold text-paper">
              {it.value >= 0 ? "+" : ""}
              {it.value}
              {suffix}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-trend-gray/50">
            <div
              className="grow-x h-full rounded-full"
              style={{ width: `${(Math.abs(it.value) / max) * 100}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Trend Intelligence — Signal Bars (Search/Shopping/Visual 비교)      */
/* 합계가 100%가 아닌 값이므로 donut/pie 는 쓰지 않는다 — 큰 숫자 + 막대 + 라벨 */
/* ================================================================== */

export function SignalBars({
  items,
}: {
  items: { label: string; value: number | null; color?: string }[];
}) {
  const available = items.filter((it) => it.value !== null).map((it) => Math.abs(it.value as number));
  const max = Math.max(1, ...available, 60);
  return (
    <div className="space-y-3.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold tracking-wide text-muted">{it.label.toUpperCase()}</span>
            <span className="text-lg font-extrabold tabular-nums text-paper">
              {it.value === null ? "—" : `${it.value >= 0 ? "+" : ""}${it.value}%`}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-trend-gray/50">
            {it.value !== null && (
              <div
                className="grow-x h-full rounded-full"
                style={{ width: `${(Math.abs(it.value) / max) * 100}%`, background: it.color ?? TREND_LINE_COLOR }}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
