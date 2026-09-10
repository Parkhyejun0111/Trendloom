"use client";

import { LIFECYCLE_LABEL_KR, type LifecycleStage } from "@/lib/trend-engine";
import type { TrendSummary } from "@/lib/trend-db";
import { Card, Pill } from "./ui";

const LIFECYCLE_TONE: Record<LifecycleStage, "default" | "accent" | "warn"> = {
  DISCOVERY: "default",
  EMERGING: "accent",
  RISING: "accent",
  MAINSTREAM: "default",
  SATURATED: "warn",
  DECLINING: "warn",
};

/** TREND RANKING — 표는 정확한 숫자 비교 영역. 선을 최소화하고 행 간격을 넓게 둔다 */
export function TrendTable({
  trends,
  onSelect,
}: {
  trends: TrendSummary[];
  onSelect: (slug: string) => void;
}) {
  return (
    <Card title="TREND RANKING" hint="Momentum 기준 정렬">
      <div className="space-y-1">
        {trends.map((t, i) => (
          <button
            key={t.slug}
            type="button"
            onClick={() => onSelect(t.slug)}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-ink-2"
          >
            <span className="w-5 shrink-0 text-xs font-bold text-muted">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-paper">{t.name}</span>
              <span className="mt-0.5 block">
                <Pill tone={LIFECYCLE_TONE[t.lifecycle]}>{LIFECYCLE_LABEL_KR[t.lifecycle]}</Pill>
              </span>
            </span>
            <span className="shrink-0 text-right text-lg font-extrabold tabular-nums text-trend-navy">
              {Math.round(t.momentum)}
            </span>
          </button>
        ))}
        {!trends.length && <p className="py-6 text-center text-sm text-muted">조건에 맞는 트렌드가 없습니다.</p>}
      </div>
    </Card>
  );
}
