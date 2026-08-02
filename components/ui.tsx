import type { ReactNode } from "react";

export function Card({
  title,
  hint,
  right,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`elev rounded-2xl border border-line p-5 ${className}`}>
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold tracking-tight text-paper">{title}</h3>
            )}
            {hint && <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warn";
}) {
  const tones = {
    default: "border-line-2 bg-ink-3/60 text-paper/75",
    accent: "border-accent/45 bg-accent/12 text-accent",
    warn: "border-accent-2/45 bg-accent-2/12 text-accent-2",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-xs transition ${
        active
          ? "border-accent/60 bg-accent/15 font-semibold text-accent"
          : "border-line-2 text-paper/70 hover:border-muted hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}

/** 주 CTA — 퍼플 그라디언트 + 글로우 */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-gradient-to-b from-accent to-accent-deep px-5 py-2.5 text-sm font-semibold text-ink shadow-[0_6px_20px_-6px_rgba(124,92,240,0.75)] transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="shimmer h-3 rounded bg-line"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-line/60 py-2 last:border-0">
      <dt className="w-24 shrink-0 text-xs text-muted">{k}</dt>
      <dd className="flex-1 text-sm text-paper/90">{v}</dd>
    </div>
  );
}
