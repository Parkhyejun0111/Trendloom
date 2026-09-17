"use client";

import { IconHome, IconTrend } from "./icons";

export type NavId = "home" | "trend";

const ITEMS: { id: NavId; label: string; Icon: typeof IconHome }[] = [
  { id: "home", label: "홈", Icon: IconHome },
  { id: "trend", label: "트렌드", Icon: IconTrend },
];

/** 하단 고정 메뉴바 — 블랙 바 위에 연핑크 알약(유리알 입체감)으로 활성 탭을 표시한다 */
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
            className={`flex flex-col items-center gap-1 rounded-3xl px-4 py-2 text-[10.5px] font-medium transition ${
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
