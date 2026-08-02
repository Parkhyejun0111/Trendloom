"use client";

import { useState } from "react";
import type { MarketSnapshot, TrendSeries } from "@/lib/naver";

/** 검증 완료된 카테고리 팔레트 (dark, surface #131316) — 순서 고정, 순환 금지 */
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181"];

const W = 760;
const H = 280;
const PAD = { t: 18, r: 92, b: 34, l: 40 };

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const shortMonth = (p: string) => `${p.slice(2, 4)}.${p.slice(5, 7)}`;

/* ------------------------------------------------------------------ */
/* 검색 수요 추이 — 다중 선형 차트                                       */
/* ------------------------------------------------------------------ */

export function TrendChart({ series }: { series: TrendSeries[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const valid = series.filter((s) => s.data.length > 0);
  if (!valid.length) return null;

  const periods = valid[0].data.map((d) => d.period);
  const n = periods.length;
  const max = Math.max(...valid.flatMap((s) => s.data.map((d) => d.ratio)), 10);
  const yMax = Math.ceil(max / 10) * 10;

  const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));
  const directLabel = valid.length <= 4;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
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
        {/* 격자 — 후퇴색 */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              stroke="#26262b"
              strokeWidth={1}
            />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#8b8b95">
              {t}
            </text>
          </g>
        ))}

        {/* x축 라벨 — 격월 */}
        {periods.map((p, i) =>
          i % 2 === 0 ? (
            <text
              key={p}
              x={x(i)}
              y={H - 12}
              textAnchor="middle"
              fontSize={10}
              fill="#8b8b95"
            >
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
            stroke="#35353d"
            strokeWidth={1}
          />
        )}

        {/* 시리즈 */}
        {valid.map((s, si) => {
          const c = SERIES[si % SERIES.length];
          const d = s.data
            .map((pt, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(pt.ratio)}`)
            .join(" ");
          const last = s.data[n - 1];
          return (
            <g key={s.keyword}>
              <path d={d} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" />
              {hover !== null && s.data[hover] && (
                <circle
                  cx={x(hover)}
                  cy={y(s.data[hover].ratio)}
                  r={4.5}
                  fill={c}
                  stroke="#131316"
                  strokeWidth={2}
                />
              )}
              {directLabel && last && (
                <text
                  x={W - PAD.r + 8}
                  y={y(last.ratio) + 4}
                  fontSize={11}
                  fill="#c9c9c2"
                >
                  {s.keyword.length > 7 ? `${s.keyword.slice(0, 7)}…` : s.keyword}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 툴팁 */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[150px] rounded-lg border border-line-2 bg-ink-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            top: 6,
            transform:
              hover > n / 2 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
          }}
        >
          <div className="mb-1 font-mono text-muted">{periods[hover]?.slice(0, 7)}</div>
          {valid.map((s, si) => (
            <div key={s.keyword} className="flex items-center gap-2 py-0.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: SERIES[si % SERIES.length] }}
              />
              <span className="flex-1 truncate text-paper/80">{s.keyword}</span>
              <span className="font-mono tabular-nums">{s.data[hover]?.ratio ?? "-"}</span>
            </div>
          ))}
        </div>
      )}

      <Legend items={valid.map((s) => s.keyword)} />
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        검색지수는 기간 내 최대값을 100으로 환산한 <strong className="text-paper/70">상대값</strong>이며
        절대 검색량이 아닙니다. 키워드 간 절대 비교가 아니라 추세·시즌성 판단에 사용하세요.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 가격 분포 — 키워드별 레인지 바                                        */
/* ------------------------------------------------------------------ */

export function PriceRangeChart({ markets }: { markets: MarketSnapshot[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!markets.length) return null;

  const lo = Math.min(...markets.map((m) => m.price.min));
  const hi = Math.max(...markets.map((m) => m.price.p75 * 1.15));
  const span = Math.max(1, hi - lo);
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100));

  return (
    <div className="space-y-3">
      {markets.map((m, i) => {
        const c = SERIES[i % SERIES.length];
        const p = m.price;
        return (
          <div
            key={m.keyword}
            className="relative"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                <span className="size-2 rounded-full" style={{ background: c }} />
                {m.keyword}
              </span>
              <span className="font-mono text-xs text-muted">
                중앙 <span className="text-paper">{won(p.median)}</span>
              </span>
            </div>

            <div className="relative h-6 rounded-md bg-ink-2">
              {/* min–max 위스커 */}
              <div
                className="absolute top-1/2 h-px -translate-y-1/2 bg-line-2"
                style={{ left: `${pct(p.min)}%`, width: `${pct(p.max) - pct(p.min)}%` }}
              />
              {/* p25–p75 코어 밴드 */}
              <div
                className="absolute inset-y-1 rounded"
                style={{
                  left: `${pct(p.p25)}%`,
                  width: `${Math.max(0.8, pct(p.p75) - pct(p.p25))}%`,
                  background: c,
                  opacity: 0.85,
                }}
              />
              {/* 중앙값 — 2px 서피스 링 */}
              <div
                className="absolute inset-y-0.5 w-[3px] rounded-full bg-paper ring-2 ring-ink-2"
                style={{ left: `${pct(p.median)}%` }}
              />
            </div>

            {hover === i && (
              <div className="absolute -top-1 left-0 z-10 -translate-y-full rounded-lg border border-line-2 bg-ink-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono tabular-nums">
                  <span className="text-muted">최저</span>
                  <span>{won(p.min)}</span>
                  <span className="text-muted">하위 25%</span>
                  <span>{won(p.p25)}</span>
                  <span className="text-muted">중앙</span>
                  <span>{won(p.median)}</span>
                  <span className="text-muted">상위 25%</span>
                  <span>{won(p.p75)}</span>
                  <span className="text-muted">최고</span>
                  <span>{won(p.max)}</span>
                  <span className="text-muted">평균</span>
                  <span>{won(p.avg)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-muted">
        진한 구간 = 하위 25%~상위 25% (실제 상품의 절반이 모인 가격대) · 흰 선 = 중앙가 · 얇은 선 =
        최저~최고
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Legend({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((label, i) => (
        <span key={label} className="flex items-center gap-2 text-xs text-paper/80">
          <span
            className="size-2.5 rounded-full"
            style={{ background: SERIES[i % SERIES.length] }}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

/** 브랜드/카테고리 점유 — 단순 순위 바 */
export function ShareBars({
  data,
  color = "#3987e5",
}: {
  data: { name: string; count: number; share: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.share), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-3 text-xs">
          <span className="w-32 shrink-0 truncate text-paper/80" title={d.name}>
            {d.name}
          </span>
          <div className="h-2.5 flex-1 rounded-sm bg-ink-2">
            <div
              className="h-full rounded-sm"
              style={{ width: `${(d.share / max) * 100}%`, background: color }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono tabular-nums text-muted">
            {d.share}%
          </span>
        </div>
      ))}
    </div>
  );
}
