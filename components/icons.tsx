/** 하단 메뉴바 · 홈 화면에서 함께 쓰는 최소 라인 아이콘 4종 */

type IconProps = { className?: string };

export function IconBoard({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconPlan({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M4 20V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 20V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 20V13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.5 20h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconReview({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 5.5h16v10H9.5L5 19v-3.5H4v-10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 9.5h8M8 12.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconTagger({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M11.5 4h5.5a1 1 0 0 1 1 1v5.5a1 1 0 0 1-.3.7l-8 8a1 1 0 0 1-1.4 0l-5.5-5.5a1 1 0 0 1 0-1.4l8-8a1 1 0 0 1 .7-.3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="15.2" cy="8.2" r="1.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function IconHome({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M4 11.5 12 4l8 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 10v9h12v-9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
