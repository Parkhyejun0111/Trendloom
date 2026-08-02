import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { hasModelKey, MISSING_KEY_MESSAGE, model } from "@/lib/ai";
import { reviewSchema } from "@/lib/schemas";

export const maxDuration = 120;

/** 토큰 폭주를 막는 상한 — 넘으면 앞쪽만 쓰고 UI 에 알린다 */
const MAX_REVIEWS = 400;
const MAX_CHARS = 60000;

const SYSTEM = `당신은 국내 패션 이커머스 브랜드의 시니어 MD다. 상품 리뷰를 읽고 개선 브리프를 쓴다.

원칙:
- quotes 에는 반드시 원문에 있는 문장을 그대로 옮긴다. 요약하거나 다듬지 않는다.
- 리뷰에 없는 내용을 추론해서 넣지 않는다. 근거가 약하면 빈도를 "낮음"으로 표시한다.
- positiveRatio 는 정확한 집계가 아니라 읽고 내린 추정치다. note 에 그 점을 밝힌다.
- severity 는 구매 결정과 반품에 미치는 영향으로 판단한다.
  사이즈 오표기·품질 불량처럼 반품으로 이어지는 것이 "치명"이다.
- 사이즈 언급이 여러 건이면 방향(작다/크다/정사이즈)을 종합해 sizeGuidance 에 명확히 쓴다.
- copyFixes 는 리뷰가 드러낸 오해를 상세페이지에서 어떻게 막을지 구체적으로 쓴다.
- reorderSignal 은 재생산 여부 판단이다. 치명 이슈가 있으면 개선 없이는 "보류"나 "중단"으로 본다.
- 모든 출력은 한국어.`;

export async function POST(req: Request) {
  if (!hasModelKey()) {
    return Response.json({ error: MISSING_KEY_MESSAGE }, { status: 500 });
  }

  const body = (await req.json()) as { product?: string; reviews?: string };
  const raw = (body.reviews ?? "").trim();

  if (!raw) {
    return Response.json({ error: "리뷰를 붙여넣어 주세요." }, { status: 400 });
  }

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const used = lines.slice(0, MAX_REVIEWS).join("\n").slice(0, MAX_CHARS);
  const truncated = lines.length > MAX_REVIEWS || raw.length > MAX_CHARS;

  const prompt = [
    `## 상품`,
    body.product?.trim() || "(상품명 미입력)",
    ``,
    `## 리뷰 ${Math.min(lines.length, MAX_REVIEWS)}건${truncated ? " (앞부분만)" : ""}`,
    used,
  ].join("\n");

  const result = streamText({
    model: model(),
    maxOutputTokens: 14000,
    system: SYSTEM,
    output: Output.object({ schema: reviewSchema }),
    prompt,
    onError: ({ error }) => console.error("[reviews]", error),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
