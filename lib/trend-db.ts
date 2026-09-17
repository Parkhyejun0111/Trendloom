/**
 * Trend DB — 서버 메모리 캐시(TTL 6시간, 세그먼트별) + 시드 키워드 목록.
 *
 * 자동 트렌드 발견 대신, 관심 있는 패션 vocabulary 20개를 시드로 등록해
 * 실제 데이터(또는 명확히 라벨링된 데모 데이터)를 붙인다. 이후 실사용 데이터가
 * 쌓이면 자동 발견(Naver related keywords + Pinterest trending keywords 클러스터링)으로 확장 가능.
 *
 * Supabase 가 연결돼 있으면(SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) 실제 API 응답(live)만
 * raw_search_trend / trend_metric 테이블에 append 한다 — 데모 데이터는 절대 원본처럼 저장하지 않는다
 * (데이터 품질 규칙 #1).
 */
import {
  dateRangeWeeksAgo,
  fetchSearchTrend,
  fetchShoppingKeywordTrend,
  demoDemographicSegments,
  demoDeviceSplit,
  type SourceStatus,
} from "./naver-trend";
import { fetchPinterestTrendForKeyword, buildPinterestQueries, type VisualReference } from "./pinterest-trend";
import { fetchStyleImages, type StyleImage } from "./naver";
import {
  calculateLifecycle,
  calculateMomentum,
  calculatePersistence,
  channelMomentum,
  classifyDirection,
  growthSpeedFromChange,
  type LifecycleStage,
  type TrendDirection,
} from "./trend-engine";
import type { Segment } from "./segment";
import { getSupabase, hasSupabase } from "./supabase";

export type SeedTrend = {
  slug: string;
  name: string;
  category: "outer" | "top" | "bottom" | "dress" | "shoes" | "bag" | "accessory" | "style";
  groupName: string;
  keywords: string[];
  /** 트렌드 상세에서 보여줄 "관련 키워드" — API 그룹핑용 keywords 와는 별개로, 함께 뜨는 인접 키워드다 */
  related: string[];
};

export const SEED_TRENDS: SeedTrend[] = [
  { slug: "brown-leather", name: "Brown Leather", category: "outer", groupName: "브라운 레더", keywords: ["브라운 레더", "브라운 가죽", "브라운 레더 자켓", "브라운 가죽 자켓"], related: ["레더 자켓", "무스탕", "가죽 팬츠"] },
  { slug: "burgundy", name: "Burgundy", category: "top", groupName: "버건디", keywords: ["버건디 니트", "버건디 자켓", "버건디 컬러 코디"], related: ["와인 컬러", "딥 레드 니트"] },
  { slug: "suede", name: "Suede", category: "outer", groupName: "스웨이드", keywords: ["스웨이드 자켓", "스웨이드 코트", "스웨이드 소재"], related: ["무스탕", "브라운 레더"] },
  { slug: "wide-denim", name: "Wide Denim", category: "bottom", groupName: "와이드 데님", keywords: ["와이드 데님", "와이드 진", "와이드 청바지"], related: ["배기 팬츠", "스트레이트 데님"] },
  { slug: "balloon-skirt", name: "Balloon Skirt", category: "bottom", groupName: "벌룬 스커트", keywords: ["벌룬 스커트", "벌룬핏 치마"], related: ["미디 스커트", "플리츠 스커트"] },
  { slug: "utility-jacket", name: "Utility Jacket", category: "outer", groupName: "유틸리티 자켓", keywords: ["유틸리티 자켓", "밀리터리 자켓"], related: ["고프코어", "카고 팬츠"] },
  { slug: "polo-knit", name: "Polo Knit", category: "top", groupName: "폴로 니트", keywords: ["폴로 니트", "카라 니트"], related: ["프레피룩", "카라 티셔츠"] },
  { slug: "boat-neck", name: "Boat Neck", category: "top", groupName: "보트넥", keywords: ["보트넥 티셔츠", "보트넥 니트"], related: ["오프숄더", "스퀘어넥"] },
  { slug: "minimal-loafers", name: "Minimal Loafers", category: "shoes", groupName: "미니멀 로퍼", keywords: ["미니멀 로퍼", "심플 로퍼"], related: ["메리제인", "블레이저"] },
  { slug: "mesh-flats", name: "Mesh Flats", category: "shoes", groupName: "메쉬 플랫", keywords: ["메쉬 플랫슈즈", "메쉬 슈즈"], related: ["발레 플랫", "메리제인"] },
  { slug: "soft-tailoring", name: "Soft Tailoring", category: "outer", groupName: "소프트 테일러링", keywords: ["소프트 테일러링", "언스트럭처 자켓"], related: ["오버사이즈 블레이저", "와이드 슬랙스"] },
  { slug: "cargo", name: "Cargo", category: "bottom", groupName: "카고", keywords: ["카고 팬츠", "카고 바지"], related: ["유틸리티 자켓", "고프코어"] },
  { slug: "vintage-sports", name: "Vintage Sports", category: "top", groupName: "빈티지 스포츠", keywords: ["빈티지 스포츠 룩", "레트로 트랙탑"], related: ["폴로 니트", "스포티"] },
  { slug: "office-core", name: "Office Core", category: "dress", groupName: "오피스코어", keywords: ["오피스코어", "오피스룩 원피스"], related: ["블레이저", "미니멀 로퍼"] },
  { slug: "preppy", name: "Preppy", category: "style", groupName: "프레피", keywords: ["프레피룩", "프레피 스타일"], related: ["폴로 니트", "카디건"] },
  { slug: "gorpcore", name: "Gorpcore", category: "style", groupName: "고프코어", keywords: ["고프코어", "아웃도어 룩"], related: ["유틸리티 자켓", "카고"] },
  { slug: "lace", name: "Lace", category: "top", groupName: "레이스", keywords: ["레이스 블라우스", "레이스 탑"], related: ["페미닌 블라우스", "코르셋 탑"] },
  { slug: "feminine-blouse", name: "Feminine Blouse", category: "top", groupName: "페미닌 블라우스", keywords: ["페미닌 블라우스", "리본 블라우스"], related: ["레이스", "발레코어"] },
  { slug: "oversized-blazer", name: "Oversized Blazer", category: "outer", groupName: "오버사이즈 블레이저", keywords: ["오버사이즈 블레이저", "박시 자켓"], related: ["소프트 테일러링", "와이드 슬랙스"] },
  { slug: "long-coat", name: "Long Coat", category: "outer", groupName: "롱 코트", keywords: ["롱 코트", "맥시 코트"], related: ["오버사이즈 코트", "울 코트"] },
];

export type TrendSummary = {
  slug: string;
  name: string;
  category: SeedTrend["category"];
  momentum: number;
  lifecycle: LifecycleStage;
  signals: { search: number | null; shopping: number | null; visual: number | null };
  currentInterest: number;
  growthSpeed: number;
  /** 검색 관심도 변화율(%) — Rising/Stable/Falling 분류의 기준값 (기획서 11장) */
  changeRate: number;
  trendDirection: TrendDirection;
};

export type TrendSnapshot = {
  updatedAt: string;
  segment: Segment;
  sourceStatus: { naverSearch: SourceStatus; naverShopping: SourceStatus; pinterest: SourceStatus };
  trends: TrendSummary[];
};

async function computeTrendSummary(
  seed: SeedTrend,
  segment: Segment,
): Promise<{ summary: TrendSummary; status: TrendSnapshot["sourceStatus"]; search: Awaited<ReturnType<typeof fetchSearchTrend>> }> {
  const apiSegment = { ages: [segment.ageCode], gender: segment.gender, device: "mo" };
  const [search, shopping, visual] = await Promise.all([
    fetchSearchTrend(seed.groupName, seed.keywords, segment.weeks, apiSegment),
    fetchShoppingKeywordTrend(seed.groupName, seed.keywords, segment.weeks, apiSegment),
    fetchPinterestTrendForKeyword(seed.groupName),
  ]);

  const persistence = Math.round((calculatePersistence(search.series) + calculatePersistence(shopping.series)) / 2);
  const visualChannelScore =
    visual.status === "live" && visual.changeMom !== null
      ? channelMomentum(70, visual.changeMom)
      : null;

  const { momentum } = calculateMomentum({
    search: channelMomentum(search.currentScore, search.change4w),
    shopping: channelMomentum(shopping.currentScore, shopping.change4w),
    visual: visualChannelScore,
    persistence,
  });

  const currentInterest = Math.round((search.currentScore + shopping.currentScore) / 2);
  const growthSpeed = Math.round((growthSpeedFromChange(search.change4w) + growthSpeedFromChange(shopping.change4w)) / 2);
  const signalsRisingCount = [search.change4w, shopping.change4w, visual.changeMom ?? -999].filter(
    (v) => v > 5,
  ).length;

  const lifecycle = calculateLifecycle({ currentInterest, growthSpeed, signalsRisingCount, persistence });

  return {
    summary: {
      slug: seed.slug,
      name: seed.name,
      category: seed.category,
      momentum,
      lifecycle,
      signals: { search: search.change4w, shopping: shopping.change4w, visual: visual.changeMom },
      currentInterest,
      growthSpeed,
      changeRate: search.change4w,
      trendDirection: classifyDirection(search.change4w),
    },
    status: { naverSearch: search.status, naverShopping: shopping.status, pinterest: visual.status },
    search,
  };
}

/** 여러 트렌드의 상태를 하나로 요약 — 하나라도 live 면 live, 아니면 가장 흔한 상태 */
function rollupStatus(statuses: SourceStatus[]): SourceStatus {
  if (statuses.some((s) => s === "live")) return "live";
  if (statuses.every((s) => s === "unavailable")) return "unavailable";
  return "demo";
}

/* ------------------------------------------------------------------ */
/* Supabase persistence — live 데이터만 append. 실패해도 응답을 막지 않는다.    */
/* ------------------------------------------------------------------ */

const keywordIdCache = new Map<string, string>();

async function ensureKeywordMaster(seed: SeedTrend): Promise<string | null> {
  if (keywordIdCache.has(seed.slug)) return keywordIdCache.get(seed.slug)!;
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("keyword_master")
      .upsert(
        {
          keyword: seed.groupName,
          normalized_keyword: seed.groupName,
          category: seed.category,
          synonyms: seed.keywords,
        },
        { onConflict: "keyword" },
      )
      .select("keyword_id")
      .single();
    if (error) throw error;
    keywordIdCache.set(seed.slug, data.keyword_id);
    return data.keyword_id as string;
  } catch (e) {
    console.error("[trend-db:ensureKeywordMaster]", e);
    return null;
  }
}

async function persistLiveResult(
  seed: SeedTrend,
  segment: Segment,
  search: Awaited<ReturnType<typeof fetchSearchTrend>>,
  summary: TrendSummary,
) {
  if (!hasSupabase() || search.status !== "live") return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const keywordId = await ensureKeywordMaster(seed);
    if (!keywordId) return;
    const { startDate, endDate } = dateRangeWeeksAgo(segment.weeks);
    await supabase.from("raw_search_trend").insert({
      source: "naver_search_trend",
      keyword_group: seed.groupName,
      keyword: seed.groupName,
      gender: segment.gender,
      age_group: segment.ageCode,
      period_start: startDate,
      period_end: endDate,
      relative_value: search.currentScore,
    });
    await supabase.from("trend_metric").insert({
      keyword_id: keywordId,
      gender: segment.gender,
      age_group: segment.ageCode,
      period: `${startDate}_${endDate}`,
      current_value: search.currentScore,
      previous_value: search.previousValue,
      change_rate: search.change4w,
      trend_direction: summary.trendDirection,
    });
  } catch (e) {
    console.error("[trend-db:persistLiveResult]", e);
  }
}

/* ------------------------------------------------------------------ */
/* Snapshot cache — 세그먼트별로 따로 캐싱한다                              */
/* ------------------------------------------------------------------ */

const TTL_MS = 6 * 60 * 60 * 1000;
const snapshotCache = new Map<string, TrendSnapshot>();

function segmentCacheKey(segment: Segment) {
  return `${segment.gender}:${segment.ageCode}:${segment.weeks}`;
}

async function buildSnapshot(segment: Segment): Promise<TrendSnapshot> {
  const results = await Promise.all(SEED_TRENDS.map((seed) => computeTrendSummary(seed, segment)));
  await Promise.all(
    results.map((r, i) => persistLiveResult(SEED_TRENDS[i], segment, r.search, r.summary)),
  );
  return {
    updatedAt: new Date().toISOString(),
    segment,
    sourceStatus: {
      naverSearch: rollupStatus(results.map((r) => r.status.naverSearch)),
      naverShopping: rollupStatus(results.map((r) => r.status.naverShopping)),
      pinterest: rollupStatus(results.map((r) => r.status.pinterest)),
    },
    trends: results.map((r) => r.summary).sort((a, b) => b.momentum - a.momentum),
  };
}

export async function getTrendSnapshot(segment: Segment, forceRefresh = false): Promise<TrendSnapshot> {
  const key = segmentCacheKey(segment);
  const cached = snapshotCache.get(key);
  if (!forceRefresh && cached && Date.now() - new Date(cached.updatedAt).getTime() < TTL_MS) {
    return cached;
  }
  const snapshot = await buildSnapshot(segment);
  snapshotCache.set(key, snapshot);
  return snapshot;
}

export type TrendDetail = {
  trend: { slug: string; name: string; momentum: number; lifecycle: LifecycleStage; trendDirection: TrendDirection; changeRate: number };
  segment: Segment;
  search: { status: SourceStatus; change4w: number; change12w: number; series: number[]; note?: string };
  shopping: { status: SourceStatus; change4w: number; series: number[]; note?: string };
  pinterest: { status: SourceStatus; changeMom: number | null; series: number[] };
  segments: { label: string; growth: number }[];
  device: { mobilePct: number; pcPct: number };
  visuals: VisualReference[];
  relatedKeywords: string[];
  pinterestQueries: string[];
  interimVisuals: { source: "naver" | "demo"; images: StyleImage[] };
};

export async function getTrendDetail(slug: string, segment: Segment): Promise<TrendDetail | null> {
  const seed = SEED_TRENDS.find((t) => t.slug === slug);
  if (!seed) return null;

  const apiSegment = { ages: [segment.ageCode], gender: segment.gender, device: "mo" };
  const [search, shopping, visual] = await Promise.all([
    fetchSearchTrend(seed.groupName, seed.keywords, Math.max(segment.weeks, 52), apiSegment),
    fetchShoppingKeywordTrend(seed.groupName, seed.keywords, Math.max(segment.weeks, 52), apiSegment),
    fetchPinterestTrendForKeyword(seed.groupName),
  ]);

  // Pinterest 이미지 API 미승인 상태에서는 이미 승인된 NAVER 이미지 검색으로 임시 시각 레퍼런스를 보여준다.
  // 절대 "Pinterest" 라고 라벨링하지 않고 출처를 그대로 노출한다.
  const interimVisuals =
    visual.status === "live"
      ? { source: "demo" as const, images: [] as StyleImage[] }
      : await fetchStyleImages(seed.groupName, "코디", 6);

  const persistence = Math.round((calculatePersistence(search.series) + calculatePersistence(shopping.series)) / 2);
  const visualChannelScore =
    visual.status === "live" && visual.changeMom !== null ? channelMomentum(70, visual.changeMom) : null;
  const { momentum } = calculateMomentum({
    search: channelMomentum(search.currentScore, search.change4w),
    shopping: channelMomentum(shopping.currentScore, shopping.change4w),
    visual: visualChannelScore,
    persistence,
  });
  const currentInterest = Math.round((search.currentScore + shopping.currentScore) / 2);
  const growthSpeed = Math.round((growthSpeedFromChange(search.change4w) + growthSpeedFromChange(shopping.change4w)) / 2);
  const signalsRisingCount = [search.change4w, shopping.change4w, visual.changeMom ?? -999].filter(
    (v) => v > 5,
  ).length;
  const lifecycle = calculateLifecycle({ currentInterest, growthSpeed, signalsRisingCount, persistence });

  return {
    trend: {
      slug: seed.slug,
      name: seed.name,
      momentum,
      lifecycle,
      trendDirection: classifyDirection(search.change4w),
      changeRate: search.change4w,
    },
    segment,
    search: { status: search.status, change4w: search.change4w, change12w: search.change12w, series: search.series.slice(-12), note: search.note },
    shopping: { status: shopping.status, change4w: shopping.change4w, series: shopping.series.slice(-12), note: shopping.note },
    pinterest: { status: visual.status, changeMom: visual.changeMom, series: visual.series },
    segments: demoDemographicSegments(seed.groupName),
    device: demoDeviceSplit(seed.groupName),
    visuals: visual.visuals,
    relatedKeywords: seed.related,
    pinterestQueries: buildPinterestQueries(seed.groupName),
    interimVisuals,
  };
}
