"use client";

import { useMemo, useState } from "react";
import { useObject } from "@ai-sdk/react";
import { reviewSchema } from "@/lib/schemas";
import { Card, Field, KeyValue, Pill, PrimaryButton, Skeleton } from "./ui";
import { CatSays } from "./brand";

const SAMPLE = `사이즈가 생각보다 작아요. 평소 M 입는데 L 시켰어야 했나 싶네요.
색감 너무 예뻐요! 사진이랑 똑같아요.
원단이 얇아서 겨울엔 못 입을 것 같아요. 간절기용입니다.
핏은 정말 예쁜데 어깨가 좀 좁아요. 한 치수 업 추천합니다.
배송 빨랐고 포장도 깔끔했어요.
지퍼가 뻑뻑해요. 몇 번 쓰다 보니 걸리네요.
가격 대비 만족합니다. 재구매 의사 있어요.
정사이즈보다 작게 나와서 반품했습니다.
소재가 부들부들하고 좋아요. 보풀도 아직 없네요.
기장이 짧아요. 키 168인데 배꼽까지 와요.
색상이 화면보다 어두워요. 실물은 거의 검정에 가까움.
세탁 후 줄어들었어요. 드라이 맡기세요.
어깨 라인 예쁘게 떨어져요. 만족합니다.
안감이 없어서 정전기가 심해요.
두 번째 구매인데 여전히 좋아요.`;

const severityTone = (s?: string) =>
  s === "치명" ? "warn" : s === "주요" ? "accent" : "default";

export function ReviewAnalyzer() {
  const [product, setProduct] = useState("");
  const [reviews, setReviews] = useState("");

  const {
    object: brief,
    submit,
    isLoading: thinking,
    error: aiError,
  } = useObject({ api: "/api/reviews", schema: reviewSchema });

  const count = useMemo(
    () => reviews.split(/\r?\n/).filter((l) => l.trim()).length,
    [reviews],
  );

  return (
    <div className="space-y-6">
      {/* ── 입력 ───────────────────────────────────────────── */}
      <Card
        title="리뷰를 붙여넣어 주세요"
        hint="한 줄에 리뷰 하나 · 자사몰·무신사·지그재그 어디서 복사해 와도 됩니다"
      >
        <div className="space-y-4">
          <Field label="상품명 (선택)">
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="예: 오버핏 울 블렌드 자켓"
              className="w-full rounded-lg border border-line-2 bg-ink px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
            />
          </Field>

          <Field label="리뷰">
            <textarea
              value={reviews}
              onChange={(e) => setReviews(e.target.value)}
              rows={12}
              placeholder="리뷰를 한 줄에 하나씩 붙여넣으세요"
              className="w-full resize-y rounded-lg border border-line-2 bg-ink px-3 py-2.5 font-mono text-xs leading-relaxed outline-none placeholder:text-muted focus:border-muted"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <PrimaryButton onClick={() => submit({ product, reviews })} disabled={thinking || !count}>
            {thinking ? "리뷰 읽는 중…" : `리뷰 ${count}건 분석`}
          </PrimaryButton>
          <button
            onClick={() => setReviews(SAMPLE)}
            disabled={thinking}
            className="rounded-lg border border-line-2 px-4 py-2.5 text-sm text-paper/80 transition hover:border-accent hover:text-accent disabled:opacity-40"
          >
            예시 리뷰 채우기
          </button>
          <span className="text-xs text-muted">
            최대 400건 · 인용문은 원문 그대로만 씁니다
          </span>
        </div>

        {aiError && (
          <p className="mt-3 rounded-lg border border-accent-2/40 bg-accent-2/10 px-3 py-2 text-xs text-accent-2">
            AI 호출 실패: {aiError.message}
          </p>
        )}
      </Card>

      {!thinking && !brief && !count && (
        <CatSays>
          리뷰가 쌓였는데 다 못 읽고 계신가요? 붙여넣기만 하면 사이즈·소재·불량 이슈를 뽑아
          재생산 판단까지 정리해 드릴게요.
        </CatSays>
      )}

      {/* ── 결과 ───────────────────────────────────────────── */}
      {(thinking || brief) && (
        <div className="fade-up space-y-6">
          <Card>
            {brief?.headline ? (
              <p className="text-xl leading-snug font-medium tracking-tight">{brief.headline}</p>
            ) : (
              <Skeleton lines={2} />
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {brief?.reorderSignal?.call && (
                <Pill tone={brief.reorderSignal.call === "재생산" ? "accent" : "warn"}>
                  재생산 판단: {brief.reorderSignal.call}
                </Pill>
              )}
              {typeof brief?.sentiment?.positiveRatio === "number" && (
                <Pill>긍정 약 {Math.round(brief.sentiment.positiveRatio)}%</Pill>
              )}
            </div>
            {brief?.reorderSignal?.reason && (
              <p className="mt-4 text-sm leading-relaxed text-paper/80">
                {brief.reorderSignal.reason}
              </p>
            )}
            {brief?.sentiment?.note && (
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {brief.sentiment.note}
              </p>
            )}
          </Card>

          <Card title="발견된 이슈" hint="심각한 것부터 · 인용은 원문 그대로">
            <div className="space-y-4">
              {(brief?.issues ?? []).map((it, i) => (
                <div key={i} className="rounded-lg border border-line bg-ink p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Pill tone={severityTone(it?.severity)}>{it?.severity ?? "—"}</Pill>
                    <span className="text-sm font-medium">{it?.category}</span>
                    <span className="text-xs text-muted">언급 빈도 {it?.frequency}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-paper/85">{it?.summary}</p>
                  {!!it?.quotes?.length && (
                    <ul className="mt-3 space-y-1.5 border-l-2 border-line-2 pl-3">
                      {it.quotes.map((q, j) => (
                        <li key={j} className="text-xs leading-relaxed text-muted">
                          &ldquo;{q}&rdquo;
                        </li>
                      ))}
                    </ul>
                  )}
                  {it?.action && (
                    <p className="mt-3 flex gap-2 text-xs leading-relaxed text-accent-soft">
                      <span className="shrink-0 font-medium">조치</span>
                      {it.action}
                    </p>
                  )}
                </div>
              ))}
              {!brief?.issues?.length && <Skeleton lines={6} />}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="살릴 강점" hint="재생산·마케팅에 그대로 쓸 수 있는 것">
              <div className="space-y-3">
                {(brief?.strengths ?? []).map((s, i) => (
                  <div key={i}>
                    <p className="text-sm text-paper/90">{s?.point}</p>
                    {!!s?.quotes?.length && (
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        &ldquo;{s.quotes[0]}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
                {!brief?.strengths?.length && <Skeleton lines={4} />}
              </div>
            </Card>

            <Card title="상세페이지 보완" hint="리뷰가 드러낸 오해를 막는 문구">
              <dl>
                <KeyValue k="사이즈 안내" v={brief?.sizeGuidance ?? "—"} />
              </dl>
              <ul className="mt-3 space-y-2.5">
                {(brief?.copyFixes ?? []).map((c, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-paper/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {c}
                  </li>
                ))}
                {!brief?.copyFixes?.length && <Skeleton />}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
