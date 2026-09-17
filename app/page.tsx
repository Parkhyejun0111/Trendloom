"use client";

import { useState } from "react";
import { Home } from "@/components/home";
import { Trend } from "@/components/trend-dashboard";
import { BottomNav, type NavId } from "@/components/bottom-nav";
import { Logo } from "@/components/brand";
import { DEFAULT_SEGMENT, type Segment } from "@/lib/segment";

export default function Page() {
  const [screen, setScreen] = useState<NavId>("home");
  const [segment, setSegment] = useState<Segment>(DEFAULT_SEGMENT);
  const isTrend = screen === "trend";

  function explore(next: Segment) {
    setSegment(next);
    setScreen("trend");
  }

  return (
    <main className="@container relative z-10 w-full px-5 pb-28 pt-8">
      <header className={isTrend ? "page-hero-trend -mx-5 -mt-8 px-5 pb-5 pt-8" : "mb-8"}>
        <button type="button" onClick={() => setScreen("home")} className="text-left">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <h1 className={`text-xl font-extrabold tracking-tight ${isTrend ? "text-white" : ""}`}>
              Trendloom
            </h1>
          </div>
        </button>
      </header>

      {screen === "home" && <Home initial={segment} onExplore={explore} />}
      {screen === "trend" && <Trend segment={segment} onChangeSegment={() => setScreen("home")} />}

      <footer className="mt-32 border-t border-line pt-5 text-[10px] leading-relaxed text-muted/60">
        데이터 출처: NAVER 검색 트렌드 · 시각 레퍼런스: Pinterest(승인 대기 시 딥링크/NAVER 이미지로 대체). 표시되는
        수치는 검색 관심도(상대 지표)이며 실제 판매량·구매량이 아닙니다. AI 해석은 참고용이며 스타일 판단은
        직접 하세요.
      </footer>

      <BottomNav active={screen} onChange={setScreen} />
    </main>
  );
}
