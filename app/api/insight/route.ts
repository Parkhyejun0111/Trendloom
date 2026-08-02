import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { insightSchema } from "@/lib/schemas";
import type { MarketSnapshot, TrendSeries } from "@/lib/naver";

export const maxDuration = 120;

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

function buildContext(payload: {
  keywords: string[];
  categoryLabel: string;
  segmentLabel: string;
  source: string;
  trend: TrendSeries[];
  markets: MarketSnapshot[];
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

  const marketBlock = payload.markets
    .map((m) => {
      const brands = m.brandShare
        .slice(0, 6)
        .map((b) => `${b.name}(${b.share}%)`)
        .join(", ");
      const cats = m.categoryShare
        .slice(0, 5)
        .map((c) => `${c.name}(${c.share}%)`)
        .join(", ");
      return [
        `- 키워드 "${m.keyword}" 실판매 상품 스냅샷`,
        `  검색 결과 총 상품수: ${m.total.toLocaleString("ko-KR")}개 (상위 ${
          m.items.length
        }개 표본 분석)`,
        `  가격 분포: 최저 ${won(m.price.min)} / 하위25% ${won(
          m.price.p25,
        )} / 중앙 ${won(m.price.median)} / 상위25% ${won(m.price.p75)} / 최고 ${won(
          m.price.max,
        )} / 평균 ${won(m.price.avg)}`,
        `  상위 브랜드 점유: ${brands}`,
        `  카테고리 분포: ${cats}`,
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
    `## 시장 상품 구성 (네이버 쇼핑 검색)`,
    marketBlock,
  ].join("\n");
}

const SYSTEM = `당신은 국내 패션 이커머스 브랜드의 시니어 MD다. 10년차이고 여성/남성 캐주얼 라인을 담당한다.
주어진 검색 수요 데이터와 실판매 상품 데이터만을 근거로 상품 기획 브리프를 작성한다.

원칙:
- 반드시 주어진 숫자를 인용하며 판단한다. "중앙가 59,000원 대비 …" 처럼 근거를 문장에 넣는다.
- 데이터에 없는 사실(특정 브랜드의 매출, 원가, 재고)은 단정하지 말고 "확인 필요"로 표시한다.
- 검색지수는 상대값(기간 내 최대=100)이며 절대 판매량이 아니다. 이 점을 오해하지 않는다.
- 라인업 제안은 실행 가능해야 한다. 역할(볼륨/전략/이미지/테스트)을 배분하고, 볼륨 스타일에 발주를 몰아준다.
- 모든 출력은 한국어. MD 실무 용어를 쓰되 문장은 간결하게.
- 데이터 출처가 데모인 경우에도 분석 방법론은 동일하게 적용하되, headline 끝에 "(데모 데이터 기준)"을 붙인다.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY 가 설정되지 않았습니다. .env.local 에 키를 넣고 dev 서버를 재시작하세요.",
      },
      { status: 500 },
    );
  }

  const payload = await req.json();

  const result = streamText({
    model: anthropic("claude-opus-5"),
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
