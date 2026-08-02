"use client";

import { useId, useState } from "react";
import type { TrendSeries } from "@/lib/naver";

/**
 * 검증 완료된 카테고리 팔레트 (dark, surface #141417) — 순서 고정, 순환 금지.
 * violet → aqua → blue → yellow → magenta
 * adjacent CVD ΔE 13.2 · normal-vision ΔE 19.3 · 전 슬롯 contrast ≥ 3:1
 * (dataviz validate_palette.js --mode dark --surface "#141417" 통과)
 */
export const SERIES = ["#9085e9", "#199e70", "#3987e5", "#c98500", "#d55181"];

const SURFACE = "#141417";
const GRID = "#26262d";
const AXIS = "#35353f";
const INK_MUTED = "#85858f";
const INK_2 = "#c3c2c8";

const shortMonth = (p: string) => `${p.slice(2, 4)}.${p.slice(5, 7)}`;

/** 사람이 읽기 좋은 축 눈금 (1 / 2 / 2.5 / 5 × 10^n) */
function niceTicks(lo: number, hi: number, target = 5) {
  const span = Math.max(1, hi - lo);
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * mag >= raw)! * mag;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 0.001; v += step) if (v >= lo - step * 0.001) out.push(v);
  return out;
}

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

/* ================================================================== */
/* 검색 수요 추이 — 다중 선형 차트                                      */
/* ================================================================== */

const W = 880;
const H = 330;
const PAD = { t: 20, r: 118, b: 40, l: 48 };

export function TrendChart({ series }: { series: TrendSeries[] }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const valid = series.filter((s) => s.data.length > 0);
  if (!valid.length) return null;

  const periods = valid[0].data.map((d) => d.period);
  const n = periods.length;
  const max = Math.max(...valid.flatMap((s) => s.data.map((d) => d.ratio)), 10);
  const ticks = niceTicks(0, max * 1.08, 5);
  const yMax = ticks[ticks.length - 1];

  const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

  // 끝점 직접 라벨 — 겹치면 위아래로 밀고 리더 라인으로 연결
  const labels = valid
    .map((s, si) => ({
      si,
      keyword: s.keyword,
      color: SERIES[si],
      anchor: y(s.data[n - 1]?.ratio ?? 0),
      ly: y(s.data[n - 1]?.ratio ?? 0),
    }))
    .sort((a, b) => a.anchor - b.anchor);
  const GAP = 15;
  for (let i = 1; i < labels.length; i++) {
    if (labels[i].ly - labels[i - 1].ly < GAP) labels[i].ly = labels[i - 1].ly + GAP;
  }
  const overflow = labels.length ? labels[labels.length - 1].ly - (H - PAD.b) : 0;
  if (overflow > 0) labels.forEach((l) => (l.ly -= overflow));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        role="img"
        aria-label="키워드별 월간 상대 검색지수 추이"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const f = (px - PAD.l) / (W - PAD.l - PAD.r);
          setHover(Math.max(0, Math.min(n - 1, Math.round(f * (n - 1)))));
        }}
      >
        <defs>
          {/* 선 아래 그라디언트 워시 — 면적으로 깊이를 준다 */}
          {valid.map((s, si) => (
            <linearGradient key={s.keyword} id={`ar-${id}-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[si]} stopOpacity="0.26" />
              <stop offset="100%" stopColor={SERIES[si]} stopOpacity="0" />
            </linearGradient>
          ))}
          {/* 선을 서피스에서 살짝 띄우는 소프트 섀도우 */}
          <filter id={`lift-${id}`} x="-20%" y="-40%" width="140%" height="200%">
            <feDropShadow dy="2.5" stdDeviation="3" floodColor="#000" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* 격자 — 후퇴색 헤어라인 */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? AXIS : GRID}
              strokeWidth={1}
            />
            <text x={PAD.l - 10} y={y(t) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
              {t}
            </text>
          </g>
        ))}

        {/* x축 라벨 — 격월 */}
        {periods.map((p, i) =>
          i % 2 === 0 ? (
            <text key={p} x={x(i)} y={H - 14} textAnchor="middle" fontSize={11} fill={INK_MUTED}>
              {shortMonth(p)}
            </text>
          ) : null,
        )}

        {/* 크로스헤어 */}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.t}
            y2={H - PAD.b}
            stroke={AXIS}
            strokeWidth={1}
          />
        )}

        {/* 면적 — 선보다 먼저 깔아 겹침을 부드럽게 */}
        {valid.map((s, si) => {
          const dim = focus !== null && focus !== s.keyword;
          const d = s.data.map((pt, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(pt.ratio)}`).join(" ");
          return (
            <path
              key={`a-${s.keyword}`}
              d={`${d} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`}
              fill={`url(#ar-${id}-${si})`}
              opacity={dim ? 0.12 : 1}
              style={{ transition: "opacity .2s" }}
            />
          );
        })}

        {/* 선 */}
        {valid.map((s, si) => {
          const c = SERIES[si];
          const dim = focus !== null && focus !== s.keyword;
          const d = s.data.map((pt, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(pt.ratio)}`).join(" ");
          return (
            <g
              key={s.keyword}
              opacity={dim ? 0.2 : 1}
              style={{ transition: "opacity .2s" }}
              filter={dim ? undefined : `url(#lift-${id})`}
            >
              <path
                d={d}
                fill="none"
                stroke={c}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className="draw"
                style={{ ["--len" as string]: "2600", animationDelay: `${si * 90}ms` }}
              />
              {/* 끝점 마커 — 2px 서피스 링 */}
              <circle
                cx={x(n - 1)}
                cy={y(s.data[n - 1]?.ratio ?? 0)}
                r={4}
                fill={c}
                stroke={SURFACE}
                strokeWidth={2}
              />
              {hover !== null && s.data[hover] && (
                <circle
                  cx={x(hover)}
                  cy={y(s.data[hover].ratio)}
                  r={5}
                  fill={c}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}

        {/* 끝점 직접 라벨 + 리더 라인 */}
        {labels.map((l) => (
          <g key={`l-${l.keyword}`} opacity={focus !== null && focus !== l.keyword ? 0.25 : 1}>
            <path
              d={`M${x(n - 1) + 6},${l.anchor} L${W - PAD.r + 16},${l.ly}`}
              stroke={l.color}
              strokeWidth={1}
              strokeOpacity={0.55}
              fill="none"
            />
            <circle cx={W - PAD.r + 20} cy={l.ly} r={3} fill={l.color} />
            <text x={W - PAD.r + 27} y={l.ly + 4} fontSize={11.5} fill={INK_2}>
              {l.keyword.length > 8 ? `${l.keyword.slice(0, 8)}…` : l.keyword}
            </text>
          </g>
        ))}
      </svg>

      {/* 툴팁 */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[168px] rounded-xl border border-line-2 bg-ink-3/95 px-3 py-2.5 text-xs shadow-2xl backdrop-blur"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: 8,
            transform: hover > n / 2 ? "translateX(calc(-100% - 14px))" : "translateX(14px)",
          }}
        >
          <div className="mb-1.5 font-mono text-[11px] text-muted">
            {periods[hover]?.slice(0, 7)}
          </div>
          {valid
            .map((s, si) => ({ s, si, v: s.data[hover]?.ratio ?? 0 }))
            .sort((a, b) => b.v - a.v)
            .map(({ s, si, v }) => (
              <div key={s.keyword} className="flex items-center gap-2 py-0.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: SERIES[si] }}
                />
                <span className="flex-1 truncate text-paper/80">{s.keyword}</span>
                <span className="font-mono tabular-nums">{v}</span>
              </div>
            ))}
        </div>
      )}

      <Legend
        items={valid.map((s) => s.keyword)}
        focus={focus}
        onFocus={setFocus}
      />
      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        검색지수는 기간 내 최대값을 100으로 환산한{" "}
        <strong className="font-medium text-paper/70">상대값</strong>이며 절대 검색량이 아닙니다.
        키워드 간 절대 비교가 아니라 추세·시즌성 판단에 사용하세요.
      </p>
    </div>
  );
}

/* ================================================================== */

export function Legend({
  items,
  focus,
  onFocus,
}: {
  items: string[];
  focus?: string | null;
  onFocus?: (k: string | null) => void;
}) {
  if (items.length < 2) return null;
  return (
    <div className="mt-3.5 flex flex-wrap gap-x-1.5 gap-y-1.5">
      {items.map((label, i) => {
        const dim = focus != null && focus !== label;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onFocus?.(focus === label ? null : label)}
            onMouseEnter={() => onFocus?.(label)}
            onMouseLeave={() => onFocus?.(null)}
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
              dim
                ? "border-transparent text-muted"
                : "border-line-2 bg-ink-3/60 text-paper/90"
            }`}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: SERIES[i], opacity: dim ? 0.35 : 1 }}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
