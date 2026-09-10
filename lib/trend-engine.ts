/**
 * Trend Intelligence 스코어링 엔진 — Search/Shopping/Visual 신호를 하나의
 * Trendloom Momentum Score 와 Lifecycle 단계로 압축한다.
 *
 * 여기서 나오는 숫자는 네이버·핀터레스트의 공식 지표가 아니다. 항상 UI 에
 * "Trendloom Momentum Score" 로 표시하고, 공식 지표처럼 포장하지 않는다.
 */

export type LifecycleStage =
  | "DISCOVERY"
  | "EMERGING"
  | "RISING"
  | "MAINSTREAM"
  | "SATURATED"
  | "DECLINING";

export const LIFECYCLE_LABEL_KR: Record<LifecycleStage, string> = {
  DISCOVERY: "발견 단계",
  EMERGING: "초기 확산",
  RISING: "상승 중",
  MAINSTREAM: "주류",
  SATURATED: "포화",
  DECLINING: "하락",
};

/** Radar bubble / Pill 색상 — EMERGING=페일핑크 · RISING=네이비 · MAINSTREAM=그레이 · DECLINING=라이트그레이 */
export const LIFECYCLE_COLOR: Record<LifecycleStage, string> = {
  DISCOVERY: "#B9BFC9",
  EMERGING: "#FFD6E3",
  RISING: "#02075D",
  MAINSTREAM: "#9CA3AF",
  SATURATED: "#6B7280",
  DECLINING: "#D9D9D9",
};

const MOMENTUM_WEIGHTS = { search: 30, shopping: 30, visual: 25, persistence: 15 } as const;

export type ChannelScores = {
  search: number | null;
  shopping: number | null;
  visual: number | null;
  persistence: number | null;
};

/** 0~100 범위로 정규화(clamp) */
export function normalizeScore(value: number, min = 0, max = 100) {
  if (max <= min) return 0;
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

/**
 * 성장률(%)을 0~100 성장 속도 스코어로 매핑한다.
 * -30% 이하는 0, +80% 이상은 100 — 그 사이를 선형 보간.
 */
export function growthSpeedFromChange(changePct: number) {
  return Math.round(normalizeScore(changePct, -30, 80));
}

/**
 * 채널별(검색/쇼핑/비주얼) 모멘텀 스코어 — 현재 관심도 60% + 성장 속도 40% 가중.
 * 신호가 없으면(Pinterest 미연결 등) null 을 그대로 반환해 상위 계산에서 재가중하게 한다.
 */
export function channelMomentum(currentScore: number | null, changePct: number | null) {
  if (currentScore === null || changePct === null) return null;
  const growthScore = growthSpeedFromChange(changePct);
  return Math.round(currentScore * 0.6 + growthScore * 0.4);
}

/**
 * 종합 Trend Momentum. 신호가 없는 채널은 가중치에서 제외하고
 * 남은 가중치 기준으로 재정규화한다 — Pinterest 미연결이라고 점수가 부당하게 깎이지 않도록.
 */
export function calculateMomentum(scores: ChannelScores): {
  momentum: number;
  availableWeight: number;
  missing: (keyof ChannelScores)[];
} {
  const entries = Object.entries(MOMENTUM_WEIGHTS) as [keyof ChannelScores, number][];
  let weighted = 0;
  let totalWeight = 0;
  const missing: (keyof ChannelScores)[] = [];

  for (const [key, weight] of entries) {
    const v = scores[key];
    if (v === null || v === undefined) {
      missing.push(key);
      continue;
    }
    weighted += v * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return { momentum: 0, availableWeight: 0, missing };
  return {
    momentum: Math.round((weighted / totalWeight) * 10) / 10,
    availableWeight: totalWeight,
    missing,
  };
}

/** 최근 구간에서 상승한 주(週)의 비율 — persistence 근사치 */
export function calculatePersistence(series: number[]) {
  if (series.length < 3) return 50;
  const recent = series.slice(-5);
  let upWeeks = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i] >= recent[i - 1]) upWeeks++;
  }
  return Math.round((upWeeks / (recent.length - 1)) * 100);
}

export function calculateLifecycle(input: {
  currentInterest: number;
  growthSpeed: number;
  signalsRisingCount: number;
  persistence: number;
}): LifecycleStage {
  const { currentInterest, growthSpeed, signalsRisingCount, persistence } = input;
  const highInterest = currentInterest >= 60;
  const lowInterest = currentInterest < 35;
  const highGrowth = growthSpeed >= 60;
  const decliningGrowth = growthSpeed <= 30;

  if (decliningGrowth && signalsRisingCount === 0) return "DECLINING";
  if (highInterest && decliningGrowth) return "SATURATED";
  if (highInterest && !highGrowth) return "MAINSTREAM";
  if (highGrowth && signalsRisingCount >= 2) return "RISING";
  if (signalsRisingCount >= 2 && persistence >= 40) return "EMERGING";
  if (lowInterest) return "DISCOVERY";
  return "EMERGING";
}

/** Trend Radar SVG 좌표계 — viewBox 0 0 RADAR_VIEW_W RADAR_VIEW_H.
 * 대시보드에서 유일하게 "강조해야 할" 그래프라 세로를 넉넉히 키워 존재감을 준다. */
export const RADAR_VIEW_W = 360;
export const RADAR_VIEW_H = 340;

/**
 * 버블/라벨이 잘리지 않도록 실제 플롯 영역에 여백을 둔다.
 * currentInterest 가 90~100 에 몰리는 경우가 많아(대부분의 트렌드가 구간 내 최고점을
 * 100 으로 재정규화하기 때문) 여백 없이 0~360 그대로 매핑하면 버블·라벨이
 * 오른쪽 끝에서 그대로 잘려 나간다.
 */
const RADAR_PAD_X = 34;
const RADAR_PAD_Y = 34;

export function buildTrendRadarPoint(t: { currentInterest: number; growthSpeed: number; momentum: number }) {
  const plotW = RADAR_VIEW_W - RADAR_PAD_X * 2;
  const plotH = RADAR_VIEW_H - RADAR_PAD_Y * 2;
  const x = RADAR_PAD_X + (normalizeScore(t.currentInterest) / 100) * plotW;
  const y = RADAR_PAD_Y + (1 - normalizeScore(t.growthSpeed) / 100) * plotH;
  const r = Math.min(20, 8 + t.momentum * 0.1);
  return { x, y, r };
}
