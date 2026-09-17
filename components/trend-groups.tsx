"use client";

import type { TrendDirection } from "@/lib/trend-engine";
import type { TrendSummary } from "@/lib/trend-db";
import { Card } from "./ui";

const GROUP_META: Record<TrendDirection, { label: string; hint: string; color: string }> = {
  RISING: { label: "RISING", hint: "검색 관심도가 뚜렷하게 오르는 키워드", color: "text-trend-positive" },
  STABLE: { label: "STABLE", hint: "큰 변화 없이 유지되는 키워드", color: "text-muted" },
  FALLING: { label: "FALLING", hint: "검색 관심도가 뚜렷하게 내리는 키워드", color: "text-trend-negative" },
};

const ORDER: TrendDirection[] = ["RISING", "STABLE", "FALLING"];

/** Rising / Stable / Falling — 기획서 12·21장의 핵심 화면. 선택한 성별·연령 검색 관심도
    변화율만으로 그룹핑한다(Momentum 은 다른 채널까지 섞은 종합 지표라 별도 섹션에 둔다). */
export function TrendGroups({
  trends,
  onSelect,
}: {
  trends: TrendSummary[];
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="space-y-4">
      {ORDER.map((direction) => {
        const items = trends
          .filter((t) => t.trendDirection === direction)
          .sort((a, b) => b.changeRate - a.changeRate);
        const meta = GROUP_META[direction];
        return (
          <Card key={direction} title={meta.label} hint={meta.hint}>
            {items.length ? (
              <ol className="space-y-0.5">
                {items.map((t, i) => (
                  <li key={t.slug}>
                    <button
                      type="button"
                      onClick={() => onSelect(t.slug)}
                      className="flex w-full items-center justify-between rounded-xl px-2 py-2.5 text-left transition hover:bg-ink-2"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="w-5 shrink-0 text-[11px] font-bold text-muted">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate text-[13px] font-semibold text-paper">{t.name}</span>
                      </span>
                      <span className={`shrink-0 text-sm font-extrabold tabular-nums ${meta.color}`}>
                        {t.changeRate >= 0 ? "+" : ""}
                        {t.changeRate}%
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-3 text-center text-xs text-muted">해당하는 키워드가 없습니다.</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
