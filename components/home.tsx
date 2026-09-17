"use client";

import { useState } from "react";
import {
  AGE_OPTIONS,
  DEFAULT_SEGMENT,
  GENDER_OPTIONS,
  PERIOD_OPTIONS,
  type Segment,
} from "@/lib/segment";
import { PrimaryButton, Toggle } from "./ui";

/**
 * Home — 성별·연령·기간을 고른 뒤 트렌드 탐색으로 진입한다 (기획서 17장 UX Flow).
 * "무슨 상품이 많이 팔리는가"가 아니라 "요즘 이 사람들은 무엇을 검색하는가"에서
 * 출발한다는 제품 원칙을 첫 화면부터 그대로 반영한다.
 */
export function Home({
  initial,
  onExplore,
}: {
  initial?: Segment;
  onExplore: (segment: Segment) => void;
}) {
  const [gender, setGender] = useState(initial?.gender ?? DEFAULT_SEGMENT.gender);
  const [ageCode, setAgeCode] = useState(initial?.ageCode ?? DEFAULT_SEGMENT.ageCode);
  const [weeks, setWeeks] = useState(initial?.weeks ?? DEFAULT_SEGMENT.weeks);

  return (
    <div className="hero-gradient fade-up -mx-5 flex min-h-[560px] flex-col justify-center gap-7 px-5 py-10">
      <div>
        <p className="text-[11px] font-bold tracking-widest text-trend-navy/55">
          CONSUMER TREND INTELLIGENCE
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-trend-navy">
          요즘 어떤 트렌드가
          <br />
          궁금하세요?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-trend-navy/70">
          같은 성별·연령대 사람들이 요즘 무엇을 검색하는지 살펴보세요.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold tracking-widest text-trend-navy/55">성별</p>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map((g) => (
            <Toggle key={g.code} active={gender === g.code} onClick={() => setGender(g.code)}>
              {g.label}
            </Toggle>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold tracking-widest text-trend-navy/55">연령대</p>
        <div className="flex flex-wrap gap-2">
          {AGE_OPTIONS.map((a) => (
            <Toggle key={a.code} active={ageCode === a.code} onClick={() => setAgeCode(a.code)}>
              {a.label}
            </Toggle>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold tracking-widest text-trend-navy/55">기간</p>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <Toggle key={p.weeks} active={weeks === p.weeks} onClick={() => setWeeks(p.weeks)}>
              {p.label}
            </Toggle>
          ))}
        </div>
      </div>

      <PrimaryButton
        className="trend-navy w-full justify-center py-3.5 text-center text-base"
        onClick={() => onExplore({ gender, ageCode, weeks })}
      >
        트렌드 탐색하기 →
      </PrimaryButton>
    </div>
  );
}
