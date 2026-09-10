"use client";

import type { VisualReference } from "@/lib/pinterest-trend";
import { Card } from "./ui";

/**
 * VISUAL SIGNAL (Pinterest). API 미승인 상태에서는 절대 가짜 실데이터처럼
 * 보여주지 않는다 — "연결 대기" 상태를 명확히 그린다.
 */
export function VisualSignal({
  status,
  changeMom,
  visuals,
}: {
  status: "live" | "demo" | "unavailable";
  changeMom: number | null;
  visuals: VisualReference[];
}) {
  return (
    <Card title="VISUAL SIGNAL" hint="Pinterest">
      {status === "live" ? (
        <>
          <p className="text-2xl font-extrabold tracking-tight text-trend-navy">
            {changeMom !== null ? `${changeMom >= 0 ? "+" : ""}${changeMom}%` : "—"}
            <span className="ml-1.5 text-xs font-medium text-muted">MoM</span>
          </p>
          {visuals.length ? (
            <>
              <p className="mt-3 text-[11px] font-semibold tracking-wide text-muted">WHAT PEOPLE ARE SAVING</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {visuals.slice(0, 6).map((v) => (
                  <a
                    key={v.sourceUrl}
                    href={v.sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block aspect-square overflow-hidden rounded-lg bg-ink-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.thumbnailUrl ?? v.imageUrl} alt={v.title} className="size-full object-cover" />
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted">이 트렌드에 대한 비주얼 레퍼런스가 아직 없습니다.</p>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-line-2 bg-ink px-4 py-6 text-center">
          <p className="text-sm font-semibold text-paper/80">연결 대기</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Pinterest API 연결 후 자동 업데이트됩니다.
            <br />
            (PINTEREST_ACCESS_TOKEN 미설정)
          </p>
        </div>
      )}
    </Card>
  );
}
