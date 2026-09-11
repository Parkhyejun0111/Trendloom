"use client";

import { LIFECYCLE_COLOR } from "@/lib/trend-engine";
import type { TrendSummary } from "@/lib/trend-db";
import { Card } from "./ui";

/** TREND RANKING — 롤리팝(점+선) 차트. 선 길이 = Momentum, 점 색 = Lifecycle */
export function TrendTable({
  trends,
  onSelect,
}: {
  trends: TrendSummary[];
  onSelect: (slug: string) => void;
}) {
  return (
    <Card title="TREND RANKING" hint="Momentum 기준 정렬 · 점 색 = Lifecycle">
      <div className="space-y-1">
        {trends.map((t, i) => {
          const color = LIFECYCLE_COLOR[t.lifecycle];
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => onSelect(t.slug)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-ink-2"
            >
              <span className="w-4 shrink-0 text-[11px] font-bold text-muted">{i + 1}</span>
              <span className="w-[84px] shrink-0 truncate text-[13px] font-semibold text-paper">{t.name}</span>
              <span className="relative h-3 min-w-0 flex-1">
                <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-line-2/50" />
                <span
                  className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full"
                  style={{ width: `${Math.max(2, t.momentum)}%`, background: color }}
                />
                <span
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                  style={{ left: `${t.momentum}%`, background: color, borderColor: "rgba(2,7,93,0.18)" }}
                />
              </span>
              <span className="w-7 shrink-0 text-right text-sm font-extrabold tabular-nums text-trend-navy">
                {Math.round(t.momentum)}
              </span>
            </button>
          );
        })}
        {!trends.length && <p className="py-6 text-center text-sm text-muted">조건에 맞는 트렌드가 없습니다.</p>}
      </div>
    </Card>
  );
}
