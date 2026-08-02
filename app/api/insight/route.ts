import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { hasModelKey, MISSING_KEY_MESSAGE, model } from "@/lib/ai";
import { insightSchema } from "@/lib/schemas";
import type { TrendSeries } from "@/lib/naver";

export const maxDuration = 120;

function buildContext(payload: {
  keywords: string[];
  categoryLabel: string;
  segmentLabel: string;
  source: string;
  trend: TrendSeries[];
}) {
  const trendBlock = payload.trend
    .map((s) => {
      const pts = s.data.map((d) => `${d.period.slice(0, 7)}:${d.ratio}`).join(" ");
      const first = s.data[0]?.ratio ?? 0;
      const last = s.data.at(-1)?.ratio ?? 0;
      const delta = first ? Math.round(((last - first) / first) * 100) : 0;
      const peak = [...s.data].sort((a, b) => b.ratio - a.ratio)[0];
      return [
        `- 키워드 "${s.keyword}"`,
        `  월별 상대 검색지수(최대 100 기준): ${pts}`,
        `  기간 증감률: ${delta > 0 ? "+" : ""}${delta}%`,
        `  피크 월: ${peak?.period.slice(0, 7) ?? "-"} (${peak?.ratio ?? "-"})`,
      ].join("\n");
    })
    .join("\n");

  return [
    `## 분석 대상`,
    `카테고리: ${payload.categoryLabel}`,
    `키워드: ${payload.keywords.join(", ")}`,
    `타겟 세그먼트: ${payload.segmentLabel}`,
    `데이터 출처: ${payload.source === "naver" ? "네이버 오픈API 실데이터" : "데모 데이터(실제 시장과 다를 수 있음)"}`,
    ``,
    `## 검색 수요 추이 (네이버 데이터랩 쇼핑인사이트)`,
    trendBlock,
    ``,
    `## 사용할 수 없는 데이터`,
    `가격 분포, 브랜드 점유, 상품 수는 이번 분석에 주어지지 않았다.`,
    `네이버 쇼핑 검색 API 종료로 수집 경로가 없어졌기 때문이다.`,
  ].join("\n");
}

const SYSTEM = `당신은 국내 패션 이커머스 브랜드의 시니어 MD다. 10년차이고 여성/남성 캐주얼 라인을 담당한다.
주어진 검색 수요 데이터만을 근거로 상품 기획 브리프를 작성한다.

원칙:
- 반드시 주어진 숫자를 인용하며 판단한다. "검색지수가 3월 42 → 7월 88로 …" 처럼 근거를 문장에 넣는다.
- 검색지수는 상대값(기간 내 최대=100)이며 절대 판매량이 아니다. 이 점을 오해하지 않는다.
- 가격·브랜드 점유·상품 수 데이터는 주어지지 않았다. 구체적 판매가나 경쟁 강도를 지어내지 않는다.
  가격이나 경쟁을 언급해야 할 자리에서는 "가격대는 실제 시장 조사로 확인 필요" 처럼 미확인임을 명시한다.
- 데이터에 없는 사실(브랜드 매출, 원가, 재고)은 단정하지 말고 "확인 필요"로 표시한다.
- 라인업 제안은 실행 가능해야 한다. 역할(볼륨/전략/이미지/테스트)을 배분하고, 볼륨 스타일에 발주를 몰아준다.
  발주 수량은 키워드별 검색 수요 비중을 근거로 상대 배분한다.
- 모든 출력은 한국어. MD 실무 용어를 쓰되 문장은 간결하게.
- 데이터 출처가 데모인 경우에도 분석 방법론은 동일하게 적용하되, headline 끝에 "(데모 데이터 기준)"을 붙인다.`;

export async function POST(req: Request) {
  if (!hasModelKey()) {
    return Response.json({ error: MISSING_KEY_MESSAGE }, { status: 500 });
  }

  const payload = await req.json();

  const result = streamText({
    model: model(),
    // Opus 5 는 thinking 이 기본 on 이라 max_tokens 를 thinking 과 나눠 쓴다.
    // 라인업 5개까지 담기려면 넉넉한 상한이 필요하다.
    maxOutputTokens: 16000,
    system: SYSTEM,
    output: Output.object({ schema: insightSchema }),
    prompt: buildContext(payload),
    onError: ({ error }) => console.error("[insight]", error),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
