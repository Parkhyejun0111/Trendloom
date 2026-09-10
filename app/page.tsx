"use client";

import { useState } from "react";
import { Planner } from "@/components/planner";
import { ReviewAnalyzer } from "@/components/review-analyzer";
import { ProductTagger } from "@/components/product-tagger";
import { StyleBoard } from "@/components/style-board";
import { Home } from "@/components/home";
import { BottomNav, type ToolId } from "@/components/bottom-nav";
import { Logo } from "@/components/brand";

const TOOL_META: Record<ToolId, { label: string; desc: string }> = {
  board: {
    label: "스타일 보드",
    desc: "레퍼런스를 핀터레스트처럼 모아 놓고, 시즌 팔레트와 실루엣을 뽑아내기",
  },
  plan: {
    label: "발주 · 가격",
    desc: "원가와 예상 수요로 발주량과 판매가를 잡고, 판매율·재고·영업이익까지 시뮬레이션",
  },
  review: {
    label: "리뷰 분석",
    desc: "쌓인 리뷰에서 사이즈·소재·불량 이슈를 뽑고 재생산 판단까지",
  },
  tagger: {
    label: "상품 태거",
    desc: "이미지 한 장으로 속성 태깅 · 머천다이징 판단 · 커머스 카피",
  },
};

type Screen = "home" | ToolId;

export default function Page() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <main className="@container relative z-10 w-full px-5 pb-28 pt-8">
      <header className="mb-8">
        <button type="button" onClick={() => setScreen("home")} className="text-left">
          <div className="flex items-center gap-3">
            <Logo size={30} />
            <h1 className="text-xl font-extrabold tracking-tight">Trendloom</h1>
          </div>
        </button>
      </header>

      {screen === "home" ? (
        <Home onNavigate={setScreen} />
      ) : (
        <>
          <p className="mb-6 text-sm text-muted">{TOOL_META[screen].desc}</p>
          {screen === "board" && <StyleBoard />}
          {screen === "plan" && <Planner />}
          {screen === "review" && <ReviewAnalyzer />}
          {screen === "tagger" && <ProductTagger />}
        </>
      )}

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        레퍼런스: 네이버 이미지 검색 API · 분석: Claude. 발주·가격 시뮬레이션의 수치는 입력값에서
        산식으로 계산되며, 특히 주당 예상 판매량과 가격탄력성 가정이 결과를 좌우합니다. AI 출력은
        의사결정 보조용이며 발주 전 실제 매출·원가·재고 데이터로 검증하세요.
      </footer>

      <BottomNav active={screen} onChange={setScreen} />
    </main>
  );
}
