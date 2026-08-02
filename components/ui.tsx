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
    <section
      className={`rounded-xl border border-line bg-ink-2/60 p-5 ${className}`}
    >
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            )}
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
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
    default: "border-line-2 text-paper/75",
    accent: "border-accent/40 bg-accent/10 text-accent",
    warn: "border-accent-2/40 bg-accent-2/10 text-accent-2",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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
      className={`rounded-md border px-3 py-1.5 text-xs transition ${
        active
          ? "border-accent bg-accent text-ink font-semibold"
          : "border-line-2 text-paper/70 hover:border-muted hover:text-paper"
      }`}
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
