"use client";

import { useEffect, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { trendInsightSchema } from "@/lib/schemas";
import { LIFECYCLE_LABEL_KR, type LifecycleStage, type TrendDirection } from "@/lib/trend-engine";
import type { VisualReference } from "@/lib/pinterest-trend";
import type { StyleImage } from "@/lib/naver";
import { segmentLabel, segmentToQueryString, type Segment } from "@/lib/segment";
import { HorizontalBarChart, SignalBars, TrendLineChart } from "./charts";
import { VisualSignal } from "./visual-signal";
import { SourceBadge } from "./signal-card";
import { Card, Pill, PrimaryButton, Skeleton } from "./ui";

type Detail = {
  trend: { slug: string; name: string; momentum: number; lifecycle: LifecycleStage; trendDirection: TrendDirection; changeRate: number };
  search: { status: "live" | "demo" | "unavailable"; change4w: number; change12w: number; series: number[] };
  shopping: { status: "live" | "demo" | "unavailable"; change4w: number; series: number[] };
  pinterest: { status: "live" | "demo" | "unavailable"; changeMom: number | null; series: number[] };
  segments: { label: string; growth: number }[];
  device: { mobilePct: number; pcPct: number };
  visuals: VisualReference[];
  relatedKeywords: string[];
  pinterestQueries: string[];
  interimVisuals: { source: "naver" | "demo"; images: StyleImage[] };
};

const DECISIONS = ["관심 있음", "보류", "무관"] as const;

const DIRECTION_LABEL: Record<TrendDirection, string> = {
  RISING: "상승",
  STABLE: "유지",
  FALLING: "하락",
};

export function TrendDetail({ slug, segment, onBack }: { slug: string; segment: Segment; onBack: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [decision, setDecision] = useState<(typeof DECISIONS)[number] | null>(null);

  const { object: insight, submit, isLoading: thinking, error: aiError } = useObject({
    api: "/api/trends/insight",
    schema: trendInsightSchema,
  });

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- slug/segment 변경 시 상세 데이터를 다시 가져오는 표준 fetch-on-mount
    setLoading(true);
    setErr(null);
    fetch(`/api/trends/${slug}?${segmentToQueryString(segment)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Detail) => {
        if (cancelled) return;
        setDetail(data);
        submit({
          trend: data.trend.name,
          lifecycle: data.trend.lifecycle,
          search: { growth: data.search.change4w },
          shopping: { growth: data.shopping.change4w },
          visual: { growth: data.pinterest.changeMom },
        });
      })
      .catch((e) => !cancelled && setErr((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, segment.gender, segment.ageCode, segment.weeks]);

  const strongestSegment = detail?.segments.slice().sort((a, b) => b.growth - a.growth)[0];

  return (
    <div className="fade-up space-y-5">
      {(loading || err) && (
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-paper">
          ← TREND DETAIL
        </button>
      )}

      {loading && (
        <Card>
          <Skeleton lines={4} />
        </Card>
      )}
      {err && (
        <Card>
          <p className="text-xs text-trend-negative">시장 데이터를 불러오지 못했습니다: {err}</p>
        </Card>
      )}

      {detail && (
        <>
          <div className="page-hero-trend -mx-5 rounded-b-[26px] px-5 pb-5 pt-1">
            <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white">
              ← TREND DETAIL
            </button>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight text-white">{detail.trend.name}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Pill>{LIFECYCLE_LABEL_KR[detail.trend.lifecycle]}</Pill>
              <Pill>{segmentLabel(segment)} 검색 관심도 {DIRECTION_LABEL[detail.trend.trendDirection]}</Pill>
            </div>
            <div className="mt-4 text-center">
              <p className="text-5xl font-extrabold tracking-tight text-white">{Math.round(detail.trend.momentum)}</p>
              <p className="mt-0.5 text-[11px] font-bold tracking-widest text-white/60">TREND MOMENTUM</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <SourceBadge label="NAVER SEARCH" status={detail.search.status} />
              <SourceBadge label="NAVER SHOPPING" status={detail.shopping.status} />
              <SourceBadge label="PINTEREST" status={detail.pinterest.status} />
            </div>
          </div>

          <Card title="INTEREST TREND" hint={`${segmentLabel(segment)} · 최근 12주 상대 검색 관심도 (구간 내 최고값 = 100)`}>
            <TrendLineChart series={detail.search.series} />
            <p className="mt-2 text-center text-xs text-muted">
              12W CHANGE <span className="font-bold text-paper">{detail.search.change12w >= 0 ? "+" : ""}{detail.search.change12w}%</span>
            </p>
          </Card>

          <Card title="MARKET SIGNALS" hint="채널별 성장률 — 합이 100%가 아니므로 막대로 비교한다">
            <SignalBars
              items={[
                { label: "Search", value: detail.search.change4w, color: "#02075D" },
                { label: "Shopping", value: detail.shopping.change4w, color: "#02075D" },
                { label: "Visual", value: detail.pinterest.changeMom, color: "#FFD6E3" },
              ]}
            />
          </Card>

          {!!detail.relatedKeywords.length && (
            <Card title="RELATED KEYWORDS" hint="함께 검색되거나 인접한 스타일 키워드">
              <div className="flex flex-wrap gap-2">
                {detail.relatedKeywords.map((k) => (
                  <Pill key={k}>{k}</Pill>
                ))}
              </div>
            </Card>
          )}

          <Card
            title="WHO IS MOVING?"
            hint={strongestSegment ? `${strongestSegment.label} · STRONGEST SEGMENT (데모 — 세그먼트 간 비교 API 미연결)` : undefined}
          >
            <HorizontalBarChart items={detail.segments.map((s) => ({ label: s.label, value: s.growth }))} />
          </Card>

          <Card title="DEVICE SIGNAL">
            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-[11px] text-muted">MOBILE</p>
                <p className="text-xl font-extrabold text-paper">{detail.device.mobilePct}%</p>
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-muted">PC</p>
                <p className="text-xl font-extrabold text-paper">{detail.device.pcPct}%</p>
              </div>
            </div>
            <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-trend-gray/50">
              <div className="h-full bg-trend-navy" style={{ width: `${detail.device.mobilePct}%` }} />
            </div>
          </Card>

          <VisualSignal
            status={detail.pinterest.status}
            changeMom={detail.pinterest.changeMom}
            visuals={detail.visuals}
            pinterestQueries={detail.pinterestQueries}
            interimVisuals={detail.interimVisuals}
          />

          <Card title="TREND READ" className="card-ai">
            {thinking && !insight && <Skeleton lines={2} />}
            {insight?.summary && (
              <div className="space-y-1.5">
                <p className="text-sm leading-relaxed text-paper">&ldquo;{insight.summary}&rdquo;</p>
                {insight.reason && <p className="text-xs leading-relaxed text-paper/70">{insight.reason}</p>}
                {insight.mdQuestion && (
                  <p className="mt-2 text-xs font-semibold text-trend-navy">{insight.mdQuestion}</p>
                )}
              </div>
            )}
            {aiError && (
              <p className="text-xs text-trend-negative">AI 호출 실패: {aiError.message}. ANTHROPIC_API_KEY 를 확인하세요.</p>
            )}
          </Card>

          <Card title="YOUR DECISION" hint="관심 있는 스타일인가요?">
            <div className="flex flex-wrap gap-2">
              {DECISIONS.map((d) => (
                <PrimaryButton key={d} className={decision === d ? "bg-trend-navy! text-white!" : ""} onClick={() => setDecision(d)}>
                  {d}
                </PrimaryButton>
              ))}
            </div>
            {decision && (
              <p className="mt-3 text-xs text-muted">
                &ldquo;{decision}&rdquo;(으)로 표시했습니다 — 프로토타입이라 실제 저장소에는 연결되어 있지 않습니다.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
