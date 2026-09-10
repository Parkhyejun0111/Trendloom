/**
 * Trend DB — Phase 1: 서버 메모리 캐시(TTL 6시간) + 시드 트렌드 목록.
 *
 * 자동 트렌드 발견 대신, MD가 관심 있는 패션 vocabulary 20개를 시드로 등록해
 * 실제 데이터(또는 명확히 라벨링된 데모 데이터)를 붙인다. 이후 실사용 데이터가
 * 쌓이면 자동 발견(Naver related keywords + Pinterest trending keywords 클러스터링)으로 확장 가능.
 */
import {
  fetchSearchTrend,
  fetchShoppingKeywordTrend,
  demoDemographicSegments,
  demoDeviceSplit,
  type SourceStatus,
} from "./naver-trend";
import { fetchPinterestTrendForKeyword, type VisualReference } from "./pinterest-trend";
import {
  calculateLifecycle,
  calculateMomentum,
  calculatePersistence,
  channelMomentum,
  growthSpeedFromChange,
  type LifecycleStage,
} from "./trend-engine";

export type SeedTrend = {
  slug: string;
  name: string;
  category: "outer" | "top" | "bottom" | "dress" | "shoes" | "accessory";
  groupName: string;
  keywords: string[];
};

export const SEED_TRENDS: SeedTrend[] = [
  { slug: "brown-leather", name: "Brown Leather", category: "outer", groupName: "브라운 레더", keywords: ["브라운 레더", "브라운 가죽", "브라운 레더 자켓", "브라운 가죽 자켓"] },
  { slug: "burgundy", name: "Burgundy", category: "top", groupName: "버건디", keywords: ["버건디 니트", "버건디 자켓", "버건디 컬러 코디"] },
  { slug: "suede", name: "Suede", category: "outer", groupName: "스웨이드", keywords: ["스웨이드 자켓", "스웨이드 코트", "스웨이드 소재"] },
  { slug: "wide-denim", name: "Wide Denim", category: "bottom", groupName: "와이드 데님", keywords: ["와이드 데님", "와이드 진", "와이드 청바지"] },
  { slug: "balloon-skirt", name: "Balloon Skirt", category: "bottom", groupName: "벌룬 스커트", keywords: ["벌룬 스커트", "벌룬핏 치마"] },
  { slug: "utility-jacket", name: "Utility Jacket", category: "outer", groupName: "유틸리티 자켓", keywords: ["유틸리티 자켓", "밀리터리 자켓"] },
  { slug: "polo-knit", name: "Polo Knit", category: "top", groupName: "폴로 니트", keywords: ["폴로 니트", "카라 니트"] },
  { slug: "boat-neck", name: "Boat Neck", category: "top", groupName: "보트넥", keywords: ["보트넥 티셔츠", "보트넥 니트"] },
  { slug: "minimal-loafers", name: "Minimal Loafers", category: "shoes", groupName: "미니멀 로퍼", keywords: ["미니멀 로퍼", "심플 로퍼"] },
  { slug: "mesh-flats", name: "Mesh Flats", category: "shoes", groupName: "메쉬 플랫", keywords: ["메쉬 플랫슈즈", "메쉬 슈즈"] },
  { slug: "soft-tailoring", name: "Soft Tailoring", category: "outer", groupName: "소프트 테일러링", keywords: ["소프트 테일러링", "언스트럭처 자켓"] },
  { slug: "cargo", name: "Cargo", category: "bottom", groupName: "카고", keywords: ["카고 팬츠", "카고 바지"] },
  { slug: "vintage-sports", name: "Vintage Sports", category: "top", groupName: "빈티지 스포츠", keywords: ["빈티지 스포츠 룩", "레트로 트랙탑"] },
  { slug: "office-core", name: "Office Core", category: "dress", groupName: "오피스코어", keywords: ["오피스코어", "오피스룩 원피스"] },
  { slug: "preppy", name: "Preppy", category: "top", groupName: "프레피", keywords: ["프레피룩", "프레피 스타일"] },
  { slug: "gorpcore", name: "Gorpcore", category: "outer", groupName: "고프코어", keywords: ["고프코어", "아웃도어 룩"] },
  { slug: "lace", name: "Lace", category: "top", groupName: "레이스", keywords: ["레이스 블라우스", "레이스 탑"] },
  { slug: "feminine-blouse", name: "Feminine Blouse", category: "top", groupName: "페미닌 블라우스", keywords: ["페미닌 블라우스", "리본 블라우스"] },
  { slug: "oversized-blazer", name: "Oversized Blazer", category: "outer", groupName: "오버사이즈 블레이저", keywords: ["오버사이즈 블레이저", "박시 자켓"] },
  { slug: "long-coat", name: "Long Coat", category: "outer", groupName: "롱 코트", keywords: ["롱 코트", "맥시 코트"] },
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
};

export type TrendSnapshot = {
  updatedAt: string;
  sourceStatus: { naverSearch: SourceStatus; naverShopping: SourceStatus; pinterest: SourceStatus };
  trends: TrendSummary[];
};

async function computeTrendSummary(seed: SeedTrend): Promise<{ summary: TrendSummary; status: TrendSnapshot["sourceStatus"] }> {
  const [search, shopping, visual] = await Promise.all([
    fetchSearchTrend(seed.groupName, seed.keywords, 12),
    fetchShoppingKeywordTrend(seed.groupName, seed.keywords, 12),
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
    },
    status: { naverSearch: search.status, naverShopping: shopping.status, pinterest: visual.status },
  };
}

/** 여러 트렌드의 상태를 하나로 요약 — 하나라도 live 면 live, 아니면 가장 흔한 상태 */
function rollupStatus(statuses: SourceStatus[]): SourceStatus {
  if (statuses.some((s) => s === "live")) return "live";
  if (statuses.every((s) => s === "unavailable")) return "unavailable";
  return "demo";
}

const TTL_MS = 6 * 60 * 60 * 1000;
let cache: TrendSnapshot | null = null;

async function buildSnapshot(): Promise<TrendSnapshot> {
  const results = await Promise.all(SEED_TRENDS.map(computeTrendSummary));
  return {
    updatedAt: new Date().toISOString(),
    sourceStatus: {
      naverSearch: rollupStatus(results.map((r) => r.status.naverSearch)),
      naverShopping: rollupStatus(results.map((r) => r.status.naverShopping)),
      pinterest: rollupStatus(results.map((r) => r.status.pinterest)),
    },
    trends: results.map((r) => r.summary).sort((a, b) => b.momentum - a.momentum),
  };
}

export async function getTrendSnapshot(forceRefresh = false): Promise<TrendSnapshot> {
  if (!forceRefresh && cache && Date.now() - new Date(cache.updatedAt).getTime() < TTL_MS) {
    return cache;
  }
  cache = await buildSnapshot();
  return cache;
}

export type TrendDetail = {
  trend: { slug: string; name: string; momentum: number; lifecycle: LifecycleStage };
  search: { status: SourceStatus; change4w: number; change12w: number; series: number[]; note?: string };
  shopping: { status: SourceStatus; change4w: number; series: number[]; note?: string };
  pinterest: { status: SourceStatus; changeMom: number | null; series: number[] };
  segments: { label: string; growth: number }[];
  device: { mobilePct: number; pcPct: number };
  visuals: VisualReference[];
};

export async function getTrendDetail(slug: string): Promise<TrendDetail | null> {
  const seed = SEED_TRENDS.find((t) => t.slug === slug);
  if (!seed) return null;

  const [search, shopping, visual] = await Promise.all([
    fetchSearchTrend(seed.groupName, seed.keywords, 52),
    fetchShoppingKeywordTrend(seed.groupName, seed.keywords, 52),
    fetchPinterestTrendForKeyword(seed.groupName),
  ]);

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
    trend: { slug: seed.slug, name: seed.name, momentum, lifecycle },
    search: { status: search.status, change4w: search.change4w, change12w: search.change12w, series: search.series.slice(-12), note: search.note },
    shopping: { status: shopping.status, change4w: shopping.change4w, series: shopping.series.slice(-12), note: shopping.note },
    pinterest: { status: visual.status, changeMom: visual.changeMom, series: visual.series },
    segments: demoDemographicSegments(seed.groupName),
    device: demoDeviceSplit(seed.groupName),
    visuals: visual.visuals,
  };
}
