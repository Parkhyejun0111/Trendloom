import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { hasModelKey, MISSING_KEY_MESSAGE, model } from "@/lib/ai";
import { styleBoardSchema } from "@/lib/schemas";

export const maxDuration = 120;

const SYSTEM = `당신은 국내 패션 브랜드의 시니어 MD 겸 트렌드 리서처다.
MD가 모아 놓은 스타일 레퍼런스 보드(검색 키워드 + 무드 + 이미지 제목들)를 읽고,
다음 시즌 상품 기획에 바로 쓸 수 있는 무드 브리프를 작성한다.

원칙:
- 이미지 제목/검색어에서 실제로 관찰되는 것만 말한다. 보이지 않는 브랜드 매출·판매량은 단정하지 않는다.
- 컬러 팔레트의 hex 는 반드시 #RRGGBB 6자리로 쓴다. 실제 원단에서 뽑을 수 있는 현실적인 색을 고른다.
- 실루엣·소재·디테일은 사입/생산 지시서에 그대로 옮길 수 있는 구체적인 용어로 쓴다.
  ("예쁜 핏" 금지 / "드롭숄더 오버핏", "코튼 트윌 8수" 처럼)
- 스타일링 제안은 실제 판매 가능한 아이템 조합으로 구성한다.
- 모든 출력은 한국어. 과장 수식어와 근거 없는 최상급 표현 금지.`;

export async function POST(req: Request) {
  if (!hasModelKey()) {
    return Response.json({ error: MISSING_KEY_MESSAGE }, { status: 500 });
  }

  const { keywords, mood, titles, source } = (await req.json()) as {
    keywords: string[];
    mood: string;
    titles: string[];
    source: string;
  };

  const prompt = [
    `## 스타일 보드`,
    `검색 키워드: ${(keywords ?? []).join(", ")}`,
    `무드 필터: ${mood}`,
    `데이터 출처: ${
      source === "naver"
        ? "네이버 이미지 검색 실데이터"
        : "데모 모드 (실제 이미지 없음 — 키워드만으로 판단)"
    }`,
    ``,
    `## 보드에 모인 레퍼런스 이미지 제목 (${(titles ?? []).length}건)`,
    ...(titles ?? []).slice(0, 60).map((t) => `- ${t}`),
    ``,
    `위 보드를 관통하는 스타일 방향을 읽고 시즌 무드 브리프를 작성하세요.`,
  ].join("\n");

  const result = streamText({
    model: model(),
    // Opus 5 는 thinking 이 기본 on 이라 max_tokens 를 thinking 과 나눠 쓴다.
    maxOutputTokens: 12000,
    system: SYSTEM,
    output: Output.object({ schema: styleBoardSchema }),
    prompt,
    onError: ({ error }) => console.error("[moodboard]", error),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
