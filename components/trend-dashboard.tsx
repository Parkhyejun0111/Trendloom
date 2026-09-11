"use client";

import { useEffect, useState } from "react";
import type { TrendSnapshot } from "@/lib/trend-db";
import { TrendDetail } from "./trend-detail";
import { TrendRadar } from "./trend-radar";
import { TrendTable } from "./trend-table";
import { HeroSignalCard } from "./signal-card";
import { Card, Skeleton } from "./ui";

const RANKING_PREVIEW = 6;

/** Trend Dashboard — 앱의 핵심 화면. 3초 안에 "지금 뭐가 움직이는지" 보여주는 것이 목표.
    필터·검색 없이 딱 세 덩어리(오늘의 시그널 / 레이더 / 랭킹)만 보여줘 한눈에 읽히게 한다. */
export function Trend() {
  const [data, setData] = useState<TrendSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showAllRanking, setShowAllRanking] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/trends${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as TrendSnapshot);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 진입 시 트렌드 스냅샷을 가져오는 표준 fetch-on-mount
    load();
  }, []);

  if (selectedSlug) {
    return <TrendDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;
  }

  const trends = data?.trends ?? [];
  const hero = trends[0];
  const updatedTime = data ? new Date(data.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const updatedDate = data
    ? new Date(data.updatedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="fade-up space-y-5">
      <div className="page-hero-trend -mx-5 rounded-b-[26px] px-5 pb-5 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-white/60">TODAY&apos;S MARKET SIGNAL</p>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-white">{updatedDate}</h2>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="trend-pink shrink-0 rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-60"
          >
            {refreshing ? "업데이트 중…" : "↻ 업데이트"}
          </button>
        </div>
        <p className="mt-2 text-[10.5px] text-white/45">NAVER + PINTEREST · LAST UPDATED {updatedTime}</p>
      </div>

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

      {!loading && hero && (
        <HeroSignalCard
          name={hero.name}
          lifecycle={hero.lifecycle}
          momentum={hero.momentum}
          onClick={() => setSelectedSlug(hero.slug)}
        />
      )}

      {!loading && !!trends.length && (
        <Card className="elev-hi">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-base font-extrabold tracking-tight text-trend-navy">TREND RADAR</h3>
            <span className="text-[10px] text-muted">탭하면 상세로</span>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            현재 관심도(가로) × 성장 속도(세로) · 원 크기 = Momentum
          </p>
          <TrendRadar trends={trends.slice(0, 30)} onSelect={setSelectedSlug} />
        </Card>
      )}

      {!loading && !!trends.length && (
        <>
          <TrendTable trends={showAllRanking ? trends : trends.slice(0, RANKING_PREVIEW)} onSelect={setSelectedSlug} />
          {trends.length > RANKING_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllRanking((v) => !v)}
              className="w-full rounded-xl border border-line-2 py-2.5 text-xs font-semibold text-muted transition hover:text-paper"
            >
              {showAllRanking ? "접기" : `전체 ${trends.length}개 보기`}
            </button>
          )}
        </>
      )}

      {!loading && !trends.length && (
        <Card>
          <p className="py-6 text-center text-sm text-muted">아직 시장 신호가 충분하지 않습니다. 데이터를 새로고침해 주세요.</p>
        </Card>
      )}
    </div>
  );
}
