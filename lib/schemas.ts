import { z } from "zod";

/** Trend Intelligence — TREND READ: 데이터 해석 + 질문. 결론을 대신 내리지 않는다 */
export const trendInsightSchema = z.object({
  summary: z.string().describe("지금 어떤 신호가 움직이는지 1문장. 전달받은 수치만 인용"),
  reason: z.string().describe("여러 채널이 같은 방향인지, 어느 단계로 보이는지 1문장"),
  mdQuestion: z
    .string()
    .describe("사용자가 스스로 판단하도록 던지는 질문 1문장. 결론이나 스타일 선택을 대신 내리지 않는다"),
});

export type TrendInsight = z.infer<typeof trendInsightSchema>;
