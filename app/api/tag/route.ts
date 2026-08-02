import { createTextStreamResponse, Output, streamText, toTextStream } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { taggingSchema } from "@/lib/schemas";

export const maxDuration = 120;

const SYSTEM = `당신은 국내 패션 이커머스의 시니어 MD 겸 상품기획 담당이다.
상품 이미지를 보고 (1) 상품 속성을 표준화된 값으로 태깅하고 (2) 머천다이징 판단을 내리고 (3) 커머스에 바로 올릴 카피를 쓴다.

원칙:
- 속성 태깅은 짧은 명사형으로. 예: 실루엣 "오버핏", 기장 "하프", 소재 "코튼 트윌".
- 이미지에서 확신할 수 없는 속성은 추정임을 값에 표시한다. 예: "코튼 혼방(추정)".
- 상품명은 검색 유입을 고려해 [핵심키워드 + 핏/기장 + 아이템명] 구조로. 과장 수식어 금지.
- 카피는 한국어 이커머스 톤. 느낌표 남발 금지, 근거 없는 최상급 표현("최고", "1위") 금지.
- 가격 밴드는 국내 온라인 패션 시장 기준으로 현실적으로 제안하고 근거를 붙인다.
- 모든 출력은 한국어.`;

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

  const { image, mediaType, hint } = (await req.json()) as {
    image: string; // base64 (data URL prefix 제외)
    mediaType: string;
    hint?: string;
  };

  const result = streamText({
    model: anthropic("claude-opus-5"),
    // Opus 5 는 thinking 이 기본 on 이라 max_tokens 를 thinking 과 나눠 쓴다.
    maxOutputTokens: 16000,
    system: SYSTEM,
    output: Output.object({ schema: taggingSchema }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: hint?.trim()
              ? `이 상품 이미지를 분석해 속성 태깅, 머천다이징 판단, 커머스 카피를 작성하세요.\n\nMD 메모(참고): ${hint.trim()}`
              : "이 상품 이미지를 분석해 속성 태깅, 머천다이징 판단, 커머스 카피를 작성하세요.",
          },
          { type: "file", data: image, mediaType },
        ],
      },
    ],
    onError: ({ error }) => console.error("[tag]", error),
  });

  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
