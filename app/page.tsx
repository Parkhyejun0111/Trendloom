"use client";

import { useState } from "react";
import { Planner } from "@/components/planner";
import { ReviewAnalyzer } from "@/components/review-analyzer";
import { ProductTagger } from "@/components/product-tagger";
import { StyleBoard } from "@/components/style-board";
import { Logo, TrendCat } from "@/components/brand";

const TABS = [
  {
    id: "board",
    label: "스타일 보드",
    desc: "레퍼런스를 핀터레스트처럼 모아 놓고, 시즌 팔레트와 실루엣을 뽑아내기",
  },
  {
    id: "plan",
    label: "발주 · 가격",
    desc: "원가와 예상 수요로 발주량과 판매가를 잡고, 판매율·재고·영업이익까지 시뮬레이션",
  },
  {
    id: "review",
    label: "리뷰 분석",
    desc: "쌓인 리뷰에서 사이즈·소재·불량 이슈를 뽑고 재생산 판단까지",
  },
  {
    id: "tagger",
    label: "상품 태거",
    desc: "이미지 한 장으로 속성 태깅 · 머천다이징 판단 · 커머스 카피",
  },
] as const;

export default function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("board");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <main className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-10">
      <header className="mb-10 flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <Logo />
            <h1 className="text-2xl font-semibold tracking-tight">Trendloom</h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            패션 MD의 시즌 기획 → 발주·가격 결정 → 리뷰 피드백까지, 데이터와 AI로.
          </p>
        </div>
        <TrendCat size={96} bob preload className="hidden sm:block" />
      </header>

      <nav className="mb-8 flex gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-3 text-sm transition ${
              tab === t.id
                ? "border-accent font-semibold text-paper"
                : "border-transparent text-muted hover:text-paper/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <p className="mb-6 text-sm text-muted">{active.desc}</p>

      {tab === "board" && <StyleBoard />}
      {tab === "plan" && <Planner />}
      {tab === "review" && <ReviewAnalyzer />}
      {tab === "tagger" && <ProductTagger />}

      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        레퍼런스: 네이버 이미지 검색 API · 분석: Claude. 발주·가격 시뮬레이션의 수치는 입력값에서
        산식으로 계산되며, 특히 주당 예상 판매량과 가격탄력성 가정이 결과를 좌우합니다. AI 출력은
        의사결정 보조용이며 발주 전 실제 매출·원가·재고 데이터로 검증하세요.
      </footer>
    </main>
  );
}
