import { z } from "zod";

/** 트렌드 스캔 결과 → MD 인사이트 브리프 */
export const insightSchema = z.object({
  headline: z.string().describe("MD가 회의에서 바로 읽을 수 있는 한 줄 결론"),
  demandStage: z
    .enum(["급상승", "상승", "정체", "하락", "시즌대기"])
    .describe("검색량 추이로 판단한 수요 단계"),
  seasonality: z.string().describe("시즌성 패턴과 다음 피크 시점 (1~2문장)"),
  priceStrategy: z.object({
    sweetSpot: z.string().describe('권장 소비자가 밴드. 예: "59,000~79,000원"'),
    rationale: z.string().describe("가격 분포 데이터를 근거로 한 설명"),
    marginRisk: z.string().describe("해당 가격대의 마진/경쟁 리스크"),
  }),
  competition: z.object({
    density: z.enum(["레드오션", "경쟁적", "여유", "블루오션"]),
    note: z.string().describe("브랜드 점유·상품 수 기준 경쟁 판단 근거"),
  }),
  opportunities: z
    .array(z.string())
    .describe("데이터에서 도출한 구체적 기회 요인 3가지"),
  risks: z.array(z.string()).describe("발주 전 확인해야 할 리스크 2~3가지"),
  lineup: z
    .array(
      z.object({
        style: z.string().describe("스타일명 (예: 오버핏 워시드 데님 자켓)"),
        role: z
          .enum(["볼륨", "전략", "이미지", "테스트"])
          .describe("라인업 내 역할"),
        target: z.string().describe("타겟 고객 한 줄"),
        retailPrice: z.string().describe("판매가 제안"),
        colorway: z.array(z.string()).describe("컬러웨이 2~4개"),
        buyQty: z.string().describe("초도 발주 수량 제안과 근거"),
        reason: z.string().describe("이 스타일을 넣는 이유"),
      }),
    )
    .describe("시즌 라인업 제안 4~5개"),
  nextActions: z.array(z.string()).describe("MD가 이번 주에 할 액션 3가지"),
});

export type Insight = z.infer<typeof insightSchema>;

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
