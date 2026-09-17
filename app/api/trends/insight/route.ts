import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { hasModelKey, MISSING_KEY_MESSAGE, model } from "@/lib/ai";
import { trendInsightSchema } from "@/lib/schemas";

export const maxDuration = 60;

const SYSTEM = `너는 사용자의 스타일 판단을 대신하지 않는다.

제공된 시장 데이터만 근거로:
1. 현재 어떤 신호가 움직이는지
2. 서로 다른 채널에서 같은 방향인지
3. 이 트렌드가 어느 단계로 보이는지
를 짧게 해석한다.

데이터에 없는 사실을 추정하지 않는다.
숫자를 새로 만들지 않는다.
"이 스타일이 유행한다"고 단정하지 않는다 — 검색 관심도가 움직인다는 사실만 전달한다.

결과는 3문장 이내. 모든 출력은 한국어.`;

type InsightInput = {
  trend: string;
  lifecycle: string;
  search?: { growth: number | null };
  shopping?: { growth: number | null };
  visual?: { growth: number | null };
};

export async function POST(req: Request) {
  if (!hasModelKey()) {
    return Response.json({ error: MISSING_KEY_MESSAGE }, { status: 500 });
  }

  const input = (await req.json()) as InsightInput;

  const prompt = [
    `## 트렌드`,
    input.trend,
    `Lifecycle: ${input.lifecycle}`,
    ``,
    `## 시장 신호 (전월/직전 4주 대비 성장률, %)`,
    `Search: ${input.search?.growth ?? "데이터 없음"}`,
    `Shopping: ${input.shopping?.growth ?? "데이터 없음"}`,
    `Visual(Pinterest): ${input.visual?.growth ?? "연결 안 됨"}`,
  ].join("\n");

  const result = streamText({
    model: model(),
    maxOutputTokens: 4000,
    system: SYSTEM,
    output: Output.object({ schema: trendInsightSchema }),
    prompt,
    onError: ({ error }) => console.error("[trends/insight]", error),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
