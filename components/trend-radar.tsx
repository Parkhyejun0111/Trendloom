"use client";

import { buildTrendRadarPoint, LIFECYCLE_COLOR, RADAR_VIEW_H, RADAR_VIEW_W } from "@/lib/trend-engine";
import type { TrendSummary } from "@/lib/trend-db";

const VIEW_W = RADAR_VIEW_W;
const VIEW_H = RADAR_VIEW_H;

/** Trend Radar — 2축 산점도. X: 현재 관심도 · Y: 성장 속도. 버블 크기 = Momentum */
export function TrendRadar({
  trends,
  onSelect,
}: {
  trends: TrendSummary[];
  onSelect: (slug: string) => void;
}) {
  if (!trends.length) {
    return <p className="py-8 text-center text-xs text-muted">표시할 트렌드가 없습니다.</p>;
  }

  const ranked = trends.slice().sort((a, b) => b.momentum - a.momentum);
  const topLabelSlugs = new Set(ranked.slice(0, 5).map((t) => t.slug));

  return (
    <div>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full" role="img" aria-label="트렌드 레이더 산점도">
        {/* 사분면 구분선 */}
        <line x1={VIEW_W / 2} x2={VIEW_W / 2} y1={0} y2={VIEW_H} stroke="rgba(2, 7, 93,0.1)" strokeWidth={1} strokeDasharray="3 4" />
        <line x1={0} x2={VIEW_W} y1={VIEW_H / 2} y2={VIEW_H / 2} stroke="rgba(2, 7, 93,0.1)" strokeWidth={1} strokeDasharray="3 4" />

        <text x={6} y={14} fontSize={9} fontWeight={700} fill="#737983">
          EMERGING
        </text>
        <text x={VIEW_W - 6} y={14} fontSize={9} fontWeight={700} fill="#737983" textAnchor="end">
          RISING
        </text>
        <text x={6} y={VIEW_H - 6} fontSize={9} fontWeight={700} fill="#737983">
          DISCOVERY
        </text>
        <text x={VIEW_W - 6} y={VIEW_H - 6} fontSize={9} fontWeight={700} fill="#737983" textAnchor="end">
          MAINSTREAM
        </text>

        {trends.slice(0, 30).map((t) => {
          const { x, y, r } = buildTrendRadarPoint(t);
          const showLabel = topLabelSlugs.has(t.slug);
          const color = LIFECYCLE_COLOR[t.lifecycle];
          return (
            <g key={t.slug}>
              <circle
                cx={x}
                cy={y}
                r={22}
                fill="transparent"
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${t.name} — Momentum ${Math.round(t.momentum)}, ${t.lifecycle}`}
                onClick={() => onSelect(t.slug)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(t.slug);
                }}
              />
              <circle cx={x} cy={y} r={r} fill={color} stroke="#ffffff" strokeWidth={1.4} className="pointer-events-none" />
              {showLabel && (
                <text
                  x={Math.min(VIEW_W - 4, Math.max(4, x))}
                  y={Math.max(22, y - r - 4)}
                  fontSize={8.5}
                  fontWeight={700}
                  fill="#02075D"
                  textAnchor="middle"
                  className="pointer-events-none"
                >
                  {t.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
        <span>← 현재 관심도 낮음</span>
        <span>현재 관심도 높음 →</span>
      </div>
    </div>
  );
}
