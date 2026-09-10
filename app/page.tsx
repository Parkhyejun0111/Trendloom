"use client";

import { useState } from "react";
import { Planner } from "@/components/planner";
import { ProductTagger } from "@/components/product-tagger";
import { StyleBoard } from "@/components/style-board";
import { Home } from "@/components/home";
import { Trend } from "@/components/trend-dashboard";
import { BottomNav, type ToolId } from "@/components/bottom-nav";
import { Logo } from "@/components/brand";

const TOOL_META: Record<Exclude<ToolId, "trend">, { label: string; title: string; hint: string }> = {
  board: {
    label: "스타일 보드",
    title: "어떤 무드를 찾고 계세요?",
    hint: "키워드 최대 4개 · 네이버 이미지 검색으로 레퍼런스를 모으고, 마음에 드는 컷을 핀하면 AI가 무드 브리프로 정리합니다",
  },
  plan: {
    label: "발주 · 가격",
    title: "발주 수량과 판매가를 정합니다",
    hint: "입력을 바꾸면 16개 조합이 즉시 다시 계산됩니다 · 숫자는 전부 산식으로 나옵니다",
  },
  tagger: {
    label: "상품 태거",
    title: "상품 이미지",
    hint: "사입 후보, 샘플 촬영본, 경쟁사 상품 어떤 것이든",
  },
};

type Screen = "home" | ToolId;

export default function Page() {
  const [screen, setScreen] = useState<Screen>("home");
  const isTrend = screen === "trend";
  // board 카드는 이제 네이비(어두운 색)라 안의 글자를 흰색으로 바꿔야 읽힌다
  const heroDark = screen === "board";

  return (
    <main className="@container relative z-10 w-full px-5 pb-28 pt-8">
      <header
        className={
          isTrend
            ? "page-hero-trend -mx-5 -mt-8 px-5 pb-5 pt-8"
            : "mb-8"
        }
      >
        <button type="button" onClick={() => setScreen("home")} className="text-left">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <h1 className={`text-xl font-extrabold tracking-tight ${isTrend ? "text-white" : ""}`}>
              Trendloom
            </h1>
          </div>
        </button>
      </header>

      {screen === "home" && <Home onNavigate={setScreen} />}
      {screen === "trend" && <Trend />}
      {screen !== "home" && screen !== "trend" && (
        <>
          <div className={`page-hero-${screen} glass-bead-soft-static mb-6 rounded-[26px] px-4 pb-4 pt-4`}>
            <p className={`text-sm font-extrabold tracking-tight ${heroDark ? "text-white" : "text-paper"}`}>
              {TOOL_META[screen].label}
            </p>
            <h2 className={`mt-2 text-base font-extrabold tracking-tight ${heroDark ? "text-white" : "text-paper"}`}>
              {TOOL_META[screen].title}
            </h2>
            <p className={`mt-1.5 text-xs leading-relaxed ${heroDark ? "text-white/70" : "text-paper/65"}`}>
              {TOOL_META[screen].hint}
            </p>
          </div>
          {screen === "board" && <StyleBoard />}
          {screen === "plan" && <Planner />}
          {screen === "tagger" && <ProductTagger />}
        </>
      )}

      <footer className="mt-32 border-t border-line pt-5 text-[10px] leading-relaxed text-muted/60">
        레퍼런스: 네이버 이미지 검색 API · 분석: Claude. 발주·가격 시뮬레이션의 수치는 입력값에서
        산식으로 계산되며, 특히 주당 예상 판매량과 가격탄력성 가정이 결과를 좌우합니다. AI 출력은
        의사결정 보조용이며 발주 전 실제 매출·원가·재고 데이터로 검증하세요.
      </footer>

      <BottomNav active={screen} onChange={setScreen} />
    </main>
  );
}
