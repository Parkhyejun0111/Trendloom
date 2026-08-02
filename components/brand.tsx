import Image from "next/image";
import type { ReactNode } from "react";

/**
 * 브랜드 마크 — 옷걸이(패션) + 상승 바(데이터).
 * 무드보드의 "패션과 데이터의 융합" 컨셉을 32px에서도 읽히게 단순화했다.
 */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="lg-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2a2438" />
          <stop offset="100%" stopColor="#121216" />
        </linearGradient>
        <linearGradient id="lg-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#7c5cf0" />
          <stop offset="100%" stopColor="#c9b8ff" />
        </linearGradient>
      </defs>

      <rect x="0.6" y="0.6" width="30.8" height="30.8" rx="9" fill="url(#lg-tile)" />
      <rect
        x="0.6"
        y="0.6"
        width="30.8"
        height="30.8"
        rx="9"
        stroke="#a78bfa"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />

      {/* 옷걸이 */}
      <path
        d="M16 11.4V9.8a2.1 2.1 0 1 0-2.1-2.1"
        stroke="#f4f4f6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 11.4 7.2 18.4h17.6L16 11.4Z"
        stroke="#f4f4f6"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* 상승 바 */}
      <rect x="10.4" y="23" width="2.7" height="3.4" rx="1.2" fill="url(#lg-bar)" />
      <rect x="14.6" y="21" width="2.7" height="5.4" rx="1.2" fill="url(#lg-bar)" />
      <rect x="18.8" y="19" width="2.7" height="7.4" rx="1.2" fill="url(#lg-bar)" />
    </svg>
  );
}

/** TrendCat — 분석적이지만 감각적인 고양이 MD */
export function TrendCat({
  size = 120,
  bob = false,
  glow = true,
  className = "",
  preload = false,
}: {
  size?: number;
  bob?: boolean;
  glow?: boolean;
  className?: string;
  /** Next 16 부터 priority 대신 preload. head 에서 미리 받게 한다 */
  preload?: boolean;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 ${bob ? "bob" : ""} ${className}`}
      style={{ width: size, height: Math.round((size * 739) / 691) }}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
          style={{
            width: size * 1.15,
            height: size * 1.15,
            background:
              "radial-gradient(circle, rgba(124,92,240,0.42), rgba(124,92,240,0) 68%)",
          }}
        />
      )}
      <Image
        src="/trendcat.png"
        alt="TrendCat — 트렌드를 캐치하는 스마트 파트너"
        width={691}
        height={739}
        preload={preload}
        sizes={`${size}px`}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/**
 * 마스코트 + 말풍선. 빈 상태·로딩·안내 문구를 브랜드 톤으로 전달한다.
 */
export function CatSays({
  children,
  size = 96,
  className = "",
}: {
  children: ReactNode;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-5 ${className}`}>
      <TrendCat size={size} bob />
      <div className="relative max-w-sm rounded-2xl border border-line-2 bg-ink-3/80 px-4 py-3 text-sm leading-relaxed text-paper/85">
        <span
          aria-hidden="true"
          className="absolute -left-[7px] top-1/2 size-3 -translate-y-1/2 rotate-45 border-b border-l border-line-2 bg-ink-3"
        />
        {children}
      </div>
    </div>
  );
}
