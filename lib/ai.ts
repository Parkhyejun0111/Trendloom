/**
 * 모델 접근 경로를 한 곳으로 모은다.
 *
 * AI SDK v7 은 문자열 모델 ID 를 기본 프로바이더 — Vercel AI Gateway — 로 해석한다.
 * 게이트웨이는 AI_GATEWAY_API_KEY 를, 프로바이더 직결은 ANTHROPIC_API_KEY 를 쓴다.
 * .env.local 에 들어 있는 키에 맞춰 둘 중 하나를 고른다.
 */
import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

const MODEL_ID = "claude-opus-5";

export function hasModelKey() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export function model(): LanguageModel {
  // 게이트웨이 키가 있으면 게이트웨이로, 없으면 Anthropic 직결로.
  return process.env.AI_GATEWAY_API_KEY
    ? `anthropic/${MODEL_ID}`
    : anthropic(MODEL_ID);
}

export const MISSING_KEY_MESSAGE =
  "AI_GATEWAY_API_KEY (또는 ANTHROPIC_API_KEY) 가 설정되지 않았습니다. .env.local 에 키를 넣고 dev 서버를 재시작하세요.";
