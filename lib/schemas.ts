import { z } from "zod";

/** 시뮬레이션 결과 → 발주/가격 의사결정 브리프 */
export const planSchema = z.object({
  headline: z.string().describe("추천 조합과 근거를 한 줄로. 숫자를 넣는다"),
  verdict: z
    .enum(["실행", "조건부 실행", "재검토"])
    .describe("이 계획을 그대로 실행해도 되는지"),
  reasoning: z
    .string()
    .describe("추천 조합을 고른 이유. 판매율·영업이익·잔여재고 수치를 인용해 2~3문장"),
  tradeoffs: z
    .array(
      z.object({
        option: z.string().describe('비교 대상 조합. 예: "109,000원 × 9,200장"'),
        note: z.string().describe("이 안이 추천안보다 못한 이유를 숫자로"),
      }),
    )
    .describe("탈락한 주요 대안 2~3개와 그 이유"),
  risks: z.array(z.string()).describe("이 계획의 리스크 2~3가지"),
  assumptionChecks: z
    .array(z.string())
    .describe("결과를 좌우하는 입력 가정 중 발주 전에 검증해야 할 것 2~3가지"),
  markdownPlan: z.string().describe("할인 운영 계획 — 시점과 폭, 판단 기준 2~3문장"),
  nextActions: z.array(z.string()).describe("이번 주에 할 액션 3가지"),
});

export type Plan = z.infer<typeof planSchema>;

/** 리뷰 묶음 → 상품 개선 브리프 */
export const reviewSchema = z.object({
  headline: z.string().describe("리뷰 전체를 관통하는 한 줄 결론"),
  sentiment: z.object({
    positiveRatio: z
      .number()
      .describe("긍정 리뷰 비율 추정치 0~100. 정확한 집계가 아니라 추정임"),
    note: z.string().describe("전반적 반응 한 줄"),
  }),
  issues: z
    .array(
      z.object({
        category: z.enum([
          "사이즈",
          "핏",
          "소재",
          "색상",
          "품질",
          "배송",
          "가격",
          "기타",
        ]),
        summary: z.string().describe("이슈 내용 한 줄"),
        severity: z.enum(["치명", "주요", "경미"]).describe("구매 결정에 미치는 영향"),
        frequency: z.enum(["높음", "보통", "낮음"]).describe("리뷰에서 언급된 빈도"),
        quotes: z.array(z.string()).describe("근거가 되는 실제 리뷰 문장 1~2개 그대로 인용"),
        action: z.string().describe("MD가 취할 조치"),
      }),
    )
    .describe("발견된 문제 3~6개. 심각한 것부터"),
  strengths: z
    .array(
      z.object({
        point: z.string().describe("강점 한 줄"),
        quotes: z.array(z.string()).describe("근거 리뷰 문장 1~2개"),
      }),
    )
    .describe("재생산·마케팅에 쓸 강점 2~4개"),
  sizeGuidance: z
    .string()
    .describe('사이즈 종합 안내. 예: "정사이즈 대비 작게 나옴, 한 치수 업 권장"'),
  copyFixes: z
    .array(z.string())
    .describe("리뷰가 드러낸 오해를 막을 상세페이지·카피 보완 3가지"),
  reorderSignal: z.object({
    call: z.enum(["재생산", "보류", "중단"]),
    reason: z.string().describe("판단 근거 1~2문장"),
  }),
});

export type ReviewBrief = z.infer<typeof reviewSchema>;

/** 상품 이미지 → 속성 태깅 + 커머스 카피 */
export const taggingSchema = z.object({
  attributes: z.object({
    category: z.string().describe("대>중>소 카테고리. 예: 여성의류 > 아우터 > 자켓"),
    subCategory: z.string().describe("세부 아이템명"),
    silhouette: z.string().describe("실루엣/핏"),
    length: z.string().describe("기장"),
    neckline: z.string().describe("넥라인 또는 카라 형태 (해당 없으면 '해당없음')"),
    sleeve: z.string().describe("소매 형태 (해당 없으면 '해당없음')"),
    colors: z.array(z.string()).describe("주요 컬러 (한글 컬러명)"),
    pattern: z.string().describe("패턴/프린트"),
    material: z.array(z.string()).describe("추정 소재"),
    detail: z.array(z.string()).describe("디테일 요소 (포켓, 지퍼, 스티치 등)"),
    mood: z.array(z.string()).describe("무드 키워드 3~5개"),
    season: z.array(z.string()).describe("적합 시즌"),
    tpo: z.array(z.string()).describe("착용 상황 2~4개"),
  }),
  merchandising: z.object({
    targetCustomer: z.string().describe("타겟 고객 프로필 한 줄"),
    priceBand: z.string().describe("이 상품의 적정 판매가 밴드와 근거"),
    positioning: z.string().describe("동일 카테고리 내 포지셔닝 한 줄"),
    stylingTips: z.array(z.string()).describe("코디 제안 3가지"),
  }),
  copy: z.object({
    productName: z
      .array(z.string())
      .describe("커머스 노출용 상품명 3안 (브랜드명 제외, 40자 이내)"),
    headline: z.string().describe("상세페이지 메인 카피 1문장"),
    description: z.string().describe("상세 설명 3~4문장"),
    bullets: z.array(z.string()).describe("셀링포인트 불릿 4개"),
    searchKeywords: z.array(z.string()).describe("검색 최적화 키워드 8~12개"),
    hashtags: z.array(z.string()).describe("SNS 해시태그 6~8개"),
  }),
});

export type Tagging = z.infer<typeof taggingSchema>;

/** 스타일 보드 → 시즌 무드 브리프 */
export const styleBoardSchema = z.object({
  headline: z.string().describe("이 스타일 방향을 한 줄로 요약한 무드 헤드라인"),
  moodKeywords: z
    .array(z.string())
    .describe("보드 전체를 관통하는 무드 키워드 5~7개 (한글, 짧은 명사형)"),
  palette: z
    .array(
      z.object({
        name: z.string().describe("컬러명. 예: 딥 차콜, 소프트 크림"),
        hex: z
          .string()
          .describe('#RRGGBB 형식 6자리 헥스코드. 예: "#2B2B2E"'),
        role: z
          .enum(["메인", "서브", "포인트"])
          .describe("시즌 팔레트 내 역할"),
      }),
    )
    .describe("시즌 컬러 팔레트 4~6개"),
  silhouettes: z.array(z.string()).describe("핵심 실루엣/핏 3~4개"),
  materials: z.array(z.string()).describe("핵심 소재 3~4개"),
  details: z.array(z.string()).describe("눈에 띄는 디테일 요소 3~4개"),
  styling: z
    .array(
      z.object({
        title: z.string().describe("코디 제안 이름"),
        items: z.array(z.string()).describe("구성 아이템 3~4개"),
        occasion: z.string().describe("착용 상황"),
      }),
    )
    .describe("스타일링 조합 제안 3개"),
  searchExpansion: z
    .array(z.string())
    .describe("이 방향을 더 파고들 때 쓸 확장 검색 키워드 6~8개"),
  mdNote: z.string().describe("MD가 상품 기획에 바로 옮길 실행 포인트 2~3문장"),
});

export type StyleBoard = z.infer<typeof styleBoardSchema>;
