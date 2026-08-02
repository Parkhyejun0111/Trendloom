import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { hasModelKey, MISSING_KEY_MESSAGE, model } from "@/lib/ai";
import { planSchema } from "@/lib/schemas";
import { runPlan, type PlanInput, type Scenario } from "@/lib/planner";

export const maxDuration = 120;

const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
const eok = (n: number) => `${(n / 1e8).toFixed(2)}억`;

function scenarioLine(s: Scenario, mark: string) {
  return [
    `${mark} ${won(s.price)} × ${s.qty.toLocaleString("ko-KR")}장`,
    `판매율 ${s.sellThrough}%`,
    `정상가 ${s.soldFull.toLocaleString("ko-KR")}장 / 할인 ${s.soldMarkdown.toLocaleString("ko-KR")}장(비중 ${s.markdownShare}%)`,
    `잔여 ${s.leftover.toLocaleString("ko-KR")}장`,
    `매출 ${eok(s.revenue)}`,
    `영업이익 ${eok(s.profit)}(${s.marginRate}%)`,
    `BEP ${s.breakEvenUnits.toLocaleString("ko-KR")}장`,
    s.stockoutWeek ? `${s.stockoutWeek}주차 품절` : "품절 없음",
  ].join(" · ");
}

function buildContext(input: PlanInput) {
  const r = runPlan(input);
  const rec = r.recommended;

  const table = r.scenarios
    .slice()
    .sort((a, b) => b.profit - a.profit)
    .map((s) => scenarioLine(s, s === rec ? "★" : "-"))
    .join("\n");

  return [
    `## 상품`,
    `${input.item}`,
    `원가 ${won(input.unitCost)} · 기준가 ${won(input.basePrice)} · 기준가 기준 주당 예상 ${input.baseWeeklyUnits.toLocaleString("ko-KR")}장`,
    ``,
    `## 조건`,
    `시즌 ${input.seasonWeeks}주 (정상가 ${input.fullPriceWeeks}주 → 이후 ${Math.round(input.markdownRate * 100)}% 할인)`,
    `채널 수수료 ${Math.round(input.commissionRate * 100)}% · 반품률 ${Math.round(input.returnRate * 100)}% · 잔여재고 회수율 원가의 ${Math.round(input.salvageRate * 100)}%`,
    `가격탄력성 ${input.elasticity} · 목표 판매율 ${input.targetSellThrough}%`,
    ``,
    `## 시나리오 (영업이익 순, ★ = 시스템 추천)`,
    table,
    ``,
    `## 추천 조합`,
    rec ? scenarioLine(rec, "★") : "없음",
    r.fallback ? `주의: 목표 판매율을 넘기는 조합이 없어 이익만 보고 골랐다.` : ``,
    r.warnings.length ? `\n## 경고\n${r.warnings.join("\n")}` : ``,
  ].join("\n");
}

const SYSTEM = `당신은 국내 패션 이커머스 브랜드의 시니어 MD다. 발주 수량과 판매가를 확정하는 자리에 있다.
주어진 시뮬레이션 결과를 읽고 실행 판단을 내린다.

원칙:
- 표에 있는 숫자만 인용한다. 새로운 수치를 만들어 내지 않는다.
- 추천 조합을 그대로 받아들이지 말고, 판매율·잔여재고·할인 비중을 함께 보고 판단한다.
  이익이 가장 커도 잔여재고가 크거나 할인 의존도가 높으면 "조건부 실행"이나 "재검토"로 본다.
- 이 시뮬레이션은 주당 예상 판매량과 가격탄력성 두 입력에 크게 좌우된다.
  그 가정을 어떻게 검증할지 assumptionChecks 에 구체적으로 적는다.
- 품절(stockout)은 기회손실이다. 판매율 100%가 항상 좋은 게 아니라는 점을 짚는다.
- 모든 출력은 한국어. MD 실무 용어로 간결하게.`;

export async function POST(req: Request) {
  if (!hasModelKey()) {
    return Response.json({ error: MISSING_KEY_MESSAGE }, { status: 500 });
  }

  const input = (await req.json()) as PlanInput;

  const result = streamText({
    model: model(),
    maxOutputTokens: 12000,
    system: SYSTEM,
    output: Output.object({ schema: planSchema }),
    prompt: buildContext(input),
    onError: ({ error }) => console.error("[plan]", error),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
