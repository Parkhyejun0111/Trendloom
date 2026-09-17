"use client";

import type { VisualReference } from "@/lib/pinterest-trend";
import { pinterestSearchUrl } from "@/lib/pinterest-trend";
import type { StyleImage } from "@/lib/naver";
import { Card } from "./ui";

/**
 * VISUAL SIGNAL (Pinterest). 이미지 검색 API 미승인 상태에서는 절대 가짜 실데이터처럼
 * 보여주지 않는다 — 대신 (1) 공식 Pinterest 검색 페이지로의 딥링크, (2) 이미 승인된
 * NAVER 이미지 검색 기반의 임시 참고 이미지를 출처를 명시해 보여준다.
 */
export function VisualSignal({
  status,
  changeMom,
  visuals,
  pinterestQueries,
  interimVisuals,
}: {
  status: "live" | "demo" | "unavailable";
  changeMom: number | null;
  visuals: VisualReference[];
  pinterestQueries: string[];
  interimVisuals: { source: "naver" | "demo"; images: StyleImage[] };
}) {
  return (
    <Card title="VISUAL REFERENCE" hint="Pinterest">
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
        <div className="space-y-3">
          <div className="rounded-xl border border-dashed border-line-2 bg-ink px-4 py-3 text-center">
            <p className="text-xs leading-relaxed text-muted">
              Pinterest 이미지 검색 API 승인 대기 중입니다. 아래에서 공식 Pinterest 검색으로 바로 확인하거나,
              승인 전까지는 NAVER 이미지 검색 기반 참고 이미지를 보여드립니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {pinterestQueries.map((q) => (
              <a
                key={q}
                href={pinterestSearchUrl(q)}
                target="_blank"
                rel="noreferrer noopener"
                className="glass-bead-soft rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-trend-navy"
              >
                Pinterest에서 &ldquo;{q}&rdquo; 보기 ↗
              </a>
            ))}
          </div>

          {interimVisuals.source === "naver" && interimVisuals.images.length ? (
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-muted">
                NAVER 이미지 검색 기반 참고 이미지 (Pinterest 연동 전 임시)
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {interimVisuals.images.slice(0, 6).map((im, i) => (
                  <a
                    key={`${im.thumbnail}-${i}`}
                    href={im.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block aspect-square overflow-hidden rounded-lg bg-ink-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.thumbnail} alt={im.title} className="size-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              참고 이미지가 아직 없습니다. (NAVER_CLIENT_ID/SECRET 미설정)
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
