"use client";

import { useEffect, useState } from "react";
import { Logo } from "./brand";

/** 로고 등장 → 로딩 바 → 페이드 아웃까지의 시간(ms) */
const HOLD = 1500;
const FADE = 450;

/**
 * 진입 스플래시 — 로고와 "AI FOR MD" 를 띄우고 로딩 바가 찬 뒤 사라진다.
 * 모션을 줄이도록 설정한 사용자에게는 거의 즉시 걷힌다.
 */
export function Splash() {
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduce ? 250 : HOLD;

    const toOut = setTimeout(() => setPhase("out"), hold);
    const toDone = setTimeout(() => setPhase("done"), hold + FADE);
    return () => {
      clearTimeout(toOut);
      clearTimeout(toDone);
    };
  }, []);

  // 스플래시가 떠 있는 동안은 뒤쪽 스크롤을 막는다
  useEffect(() => {
    if (phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      role="status"
      aria-label="Trendloom 로딩 중"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink ${
        phase === "out" ? "splash-out" : ""
      }`}
    >
      {/* 상단 라임 글로우 — 본문과 같은 분위기 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(55% 100% at 50% 0%, rgba(223,242,76,0.28), transparent 72%)",
        }}
      />

      <div className="splash-rise relative flex flex-col items-center">
        <Logo size={72} />

        <h1 className="mt-5 text-2xl font-medium tracking-tight text-paper">
          Trendloom
        </h1>

        <p className="mt-2.5 text-xs font-extralight uppercase tracking-[0.42em] text-accent-soft">
          AI for MD
        </p>

        <span
          aria-hidden="true"
          className="mt-8 block h-px w-44 overflow-hidden rounded-full bg-line-2"
        >
          <span className="splash-bar block h-full w-full origin-left bg-gradient-to-r from-accent-deep to-accent-soft" />
        </span>
      </div>
    </div>
  );
}
