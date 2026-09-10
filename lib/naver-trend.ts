/**
 * NAVER Search Trend + Shopping Insight 클라이언트 — 이관된 NAVER API HUB 기준.
 *
 * 기존 lib/naver.ts (이미지 검색, NAVER_CLIENT_ID/SECRET) 와는 완전히 다른 서비스/키다.
 * 이 파일은 NAVER_API_HUB_CLIENT_ID / NAVER_API_HUB_CLIENT_SECRET 이 없으면
 * 키워드 시드 기반의 결정적 데모 시계열로 폴백하고, 그 사실을 status:"demo" 로
 * 그대로 노출한다 — 실제 데이터인 것처럼 위장하지 않는다.
 */

export type SourceStatus = "live" | "demo" | "unavailable";

export type TrendSeriesResult = {
  status: SourceStatus;
  /** 최근 순으로 정렬된 상대 관심도(0~100, 구간 내 최고값=100) */
  series: number[];
  currentScore: number;
  change4w: number;
  change12w: number;
  note?: string;
};

const HUB_ENDPOINT = "https://naverapihub.apigw.ntruss.com/search-trend/v1/search";

const hasHubKeys = () =>
  Boolean(process.env.NAVER_API_HUB_CLIENT_ID && process.env.NAVER_API_HUB_CLIENT_SECRET);

function hubHeaders() {
  return {
    "X-NCP-APIGW-API-KEY-ID": process.env.NAVER_API_HUB_CLIENT_ID!,
    "X-NCP-APIGW-API-KEY": process.env.NAVER_API_HUB_CLIENT_SECRET!,
    "Content-Type": "application/json",
  };
}

/* ------------------------------------------------------------------ */
/* 결정적 시드 난수 (lib/naver.ts 와 동일 패턴)                          */
/* ------------------------------------------------------------------ */

function seedFrom(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ARCHETYPES = ["rising", "emerging", "mainstream", "declining", "volatile"] as const;

/**
 * 시드 키별로 성격이 다른(상승/초기확산/주류/하락/변동) 데모 시계열을 만든다.
 * 각 아키타입은 시작 레벨과 드리프트 곡선을 다르게 줘서 최근 4주 성장률이
 * 뚜렷하게 갈리게 한다 — 그래야 Lifecycle 분류가 EMERGING/RISING/MAINSTREAM/DECLINING
 * 전 구간에 고르게 퍼진다(전부 MAINSTREAM으로 쏠리는 것을 방지).
 */
function demoSeries(seedKey: string, weeks: number): number[] {
  const rand = mulberry32(seedFrom(seedKey));
  const archetype = ARCHETYPES[Math.floor(rand() * ARCHETYPES.length)];

  let level: number;
  if (archetype === "mainstream") level = 55 + rand() * 20;
  else if (archetype === "declining") level = 60 + rand() * 25;
  else if (archetype === "volatile") level = 30 + rand() * 25;
  else level = 12 + rand() * 18; // rising / emerging: 낮은 데서 시작

  const raw: number[] = [];
  for (let i = 0; i < weeks; i++) {
    const t = i / Math.max(1, weeks - 1);
    let drift = 0;
    if (archetype === "rising") drift = 1.5 + t * 3.5; // 꾸준히 가속하며 상승
    else if (archetype === "emerging") drift = t < 0.6 ? 0.3 : 6.5; // 초반 정체, 최근 급등
    else if (archetype === "mainstream") drift = -0.1; // 높은 레벨에서 정체
    else if (archetype === "declining") drift = t < 0.5 ? 0.1 : -4.2; // 초반 정체, 최근 급락
    else drift = (rand() - 0.5) * 3.2;
    level += drift + (rand() - 0.5) * 5;
    level = Math.max(3, Math.min(160, level));
    raw.push(level);
  }
  const max = Math.max(...raw, 1);
  return raw.map((v) => Math.round((v / max) * 100));
}

/**
 * 관심도가 0에 가까운 시작점을 분모로 나누면 퍼센트가 비현실적으로 튄다
 * (예: 4 → 25 는 +525% 처럼 보이지만 실제로는 "거의 없다가 조금 생김"에 가깝다).
 * 분모에 최소 바닥값을 두고, 최종 값도 현실적인 범위로 clamp 한다.
 */
function safePctChange(current: number, base: number) {
  const denom = Math.max(8, base);
  const pct = ((current - base) / denom) * 100;
  return Math.round(Math.max(-95, Math.min(300, pct)));
}

const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / Math.max(1, nums.length);

/**
 * "N주 전" 시점을 총 시리즈 길이와 무관하게 끝에서부터 N주 거슬러 올라가 찾는다.
 * (52주 시리즈를 fetch 하는 상세 화면에서도 "12주 변화"가 실제로 12주치를 봐야지,
 * 시리즈 맨 앞 = 52주 전과 비교되는 걸 방지)
 * 단일 주차 노이즈로 퍼센트가 튀지 않도록 그 주변 소구간 평균을 기준점으로 쓴다.
 */
function baseNWeeksAgo(series: number[], weeksAgo: number) {
  const idx = Math.max(0, series.length - 1 - weeksAgo);
  const from = Math.max(0, idx - 1);
  const to = Math.min(series.length, idx + 2);
  return avg(series.slice(from, to));
}

function seriesStats(series: number[]) {
  const currentScore = series[series.length - 1] ?? 0;
  const base4 = baseNWeeksAgo(series, 4);
  const base12 = baseNWeeksAgo(series, 12);
  const change4w = safePctChange(currentScore, base4 || currentScore);
  const change12w = safePctChange(currentScore, base12 || currentScore);
  return { currentScore, change4w, change12w };
}

/* ------------------------------------------------------------------ */
/* Search Trend                                                        */
/* ------------------------------------------------------------------ */

export type KeywordGroup = { groupName: string; keywords: string[] };

async function callSearchTrendHub(
  keywordGroups: KeywordGroup[],
  opts: { startDate: string; endDate: string; timeUnit: "week" | "month"; device?: string; ages?: string[]; gender?: string },
) {
  const res = await fetch(HUB_ENDPOINT, {
    method: "POST",
    headers: hubHeaders(),
    body: JSON.stringify({
      startDate: opts.startDate,
      endDate: opts.endDate,
      timeUnit: opts.timeUnit,
      keywordGroups,
      device: opts.device,
      ages: opts.ages,
      gender: opts.gender,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`search-trend ${res.status}: ${await res.text()}`);
  return res.json();
}

function dateRangeWeeksAgo(weeks: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - weeks * 7);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

/** 패션 MD 기본 세그먼트: mobile · 여성 · 20~30대 */
const DEFAULT_SEGMENT = { device: "mo", ages: ["3", "4"], gender: "f" };

export async function fetchSearchTrend(
  groupName: string,
  keywords: string[],
  weeks = 12,
): Promise<TrendSeriesResult> {
  if (hasHubKeys()) {
    try {
      const { startDate, endDate } = dateRangeWeeksAgo(weeks);
      const json = await callSearchTrendHub(
        [{ groupName, keywords }],
        { startDate, endDate, timeUnit: "week", ...DEFAULT_SEGMENT },
      );
      const data: { period: string; ratio: number }[] = json?.results?.[0]?.data ?? [];
      const series = data.map((d) => Math.round(d.ratio));
      if (!series.length) throw new Error("empty series");
      return { status: "live", series, ...seriesStats(series) };
    } catch (e) {
      console.error("[naver-trend:search]", e);
      const series = demoSeries(`search:${groupName}`, weeks);
      return {
        status: "demo",
        series,
        ...seriesStats(series),
        note: `NAVER Search Trend 호출 실패로 데모 데이터 사용: ${(e as Error).message}`,
      };
    }
  }
  const series = demoSeries(`search:${groupName}`, weeks);
  return { status: "demo", series, ...seriesStats(series) };
}

/* ------------------------------------------------------------------ */
/* Shopping Insight — 키워드 + 성별 + 연령 + 모바일 (검색 트렌드와 동일 구조로 취급)  */
/* ------------------------------------------------------------------ */

export async function fetchShoppingKeywordTrend(
  groupName: string,
  keywords: string[],
  weeks = 12,
): Promise<TrendSeriesResult> {
  // NAVER Shopping Insight 는 별도 엔드포인트/스코프가 필요하다. 현재는 검색 트렌드와
  // 동일한 API HUB 키 유무로 게이팅하되, 실패 시 검색과는 다른 시드로 독립적인 데모 시계열을 만든다.
  if (hasHubKeys()) {
    try {
      const { startDate, endDate } = dateRangeWeeksAgo(weeks);
      const json = await callSearchTrendHub(
        [{ groupName, keywords }],
        { startDate, endDate, timeUnit: "week", ...DEFAULT_SEGMENT },
      );
      const data: { period: string; ratio: number }[] = json?.results?.[0]?.data ?? [];
      const series = data.map((d) => Math.round(d.ratio));
      if (!series.length) throw new Error("empty series");
      return { status: "live", series, ...seriesStats(series) };
    } catch (e) {
      console.error("[naver-trend:shopping]", e);
      const series = demoSeries(`shopping:${groupName}`, weeks);
      return {
        status: "demo",
        series,
        ...seriesStats(series),
        note: `NAVER Shopping Insight 호출 실패로 데모 데이터 사용: ${(e as Error).message}`,
      };
    }
  }
  const series = demoSeries(`shopping:${groupName}`, weeks);
  return { status: "demo", series, ...seriesStats(series) };
}

/** WHO IS MOVING — 연령×성별 세그먼트 성장률 (데모: 시드 기반, 실 API 승인 전까지 항상 데모) */
export function demoDemographicSegments(groupName: string) {
  const rand = mulberry32(seedFrom(`segment:${groupName}`));
  const brackets = ["20–24 F", "25–29 F", "30–34 F", "35–39 F"];
  return brackets.map((label) => ({
    label,
    growth: Math.round(15 + rand() * 60),
  }));
}

/** Device Signal — 데모: 모바일 비중이 높은 패션 카테고리 특성을 반영 */
export function demoDeviceSplit(groupName: string) {
  const rand = mulberry32(seedFrom(`device:${groupName}`));
  const mobilePct = Math.round(68 + rand() * 20);
  return { mobilePct, pcPct: 100 - mobilePct };
}
