"use client";

import { IconBoard, IconHome, IconPlan, IconTagger, IconTrend } from "./icons";

export type ToolId = "trend" | "board" | "plan" | "tagger";
export type NavId = "home" | ToolId;

const ITEMS: { id: NavId; label: string; Icon: typeof IconBoard }[] = [
  { id: "home", label: "홈", Icon: IconHome },
  { id: "trend", label: "트렌드", Icon: IconTrend },
  { id: "board", label: "스타일 보드", Icon: IconBoard },
  { id: "plan", label: "발주·가격", Icon: IconPlan },
  { id: "tagger", label: "상품 태거", Icon: IconTagger },
];

/** 하단 고정 메뉴바 — 블랙 바 위에 라임 알약(유리알 입체감)으로 활성 탭을 표시한다 */
export function BottomNav({
  active,
  onChange,
}: {
  active: NavId;
  onChange: (id: NavId) => void;
}) {
  return (
    <nav
      aria-label="주요 기능"
      className="nav-glass fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit gap-1 rounded-[32px] p-1.5"
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-3xl px-3 py-2 text-[10.5px] font-medium transition ${
              isActive
                ? "glass-bead-pink bg-trend-pink text-trend-navy"
                : "text-ink-black/50 hover:text-ink-black"
            }`}
          >
            <Icon className="size-[18px] shrink-0" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
