/**
 * Pinterest Trends API 클라이언트 — "Visual Signal".
 *
 * PINTEREST_ACCESS_TOKEN 이 없으면(앱 미승인 등) 절대 데모 이미지를 실제처럼
 * 보여주지 않는다. status:"unavailable" 로 명확히 표시하고 화면은 "연결 대기"
 * 상태를 그린다 — Pinterest HTML 스크래핑도 하지 않는다.
 */

export type SourceStatus = "live" | "demo" | "unavailable";

export type VisualReference = {
  source: "naver" | "pinterest";
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  sourceUrl: string;
};

export type VisualSignalResult = {
  status: SourceStatus;
  changeMom: number | null;
  changeWow: number | null;
  changeYoy: number | null;
  series: number[];
  visuals: VisualReference[];
};

const hasToken = () => Boolean(process.env.PINTEREST_ACCESS_TOKEN);

function endpoint(region: string, trendType: string) {
  return `https://api.pinterest.com/v5/trends/keywords/${region}/top/${trendType}`;
}

export async function fetchPinterestTrendingKeywords(region = "KR", trendType: "growing" | "top" = "growing") {
  if (!hasToken()) return { status: "unavailable" as const, keywords: [] as string[] };
  try {
    const res = await fetch(endpoint(region, trendType), {
      headers: { Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`pinterest ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const keywords: string[] = (json?.trends ?? []).map((t: { keyword: string }) => t.keyword);
    return { status: "live" as const, keywords };
  } catch (e) {
    console.error("[pinterest-trend:keywords]", e);
    return { status: "unavailable" as const, keywords: [] as string[] };
  }
}

/**
 * 특정 트렌드 키워드에 대한 Pinterest 신호. 앱 승인/토큰이 없으면 항상 unavailable —
 * 데모 그래프조차 그리지 않는다(Pinterest 는 사진이 곧 신호라 가짜로 대체할 수 없다).
 */
export async function fetchPinterestTrendForKeyword(keyword: string): Promise<VisualSignalResult> {
  if (!hasToken()) {
    return { status: "unavailable", changeMom: null, changeWow: null, changeYoy: null, series: [], visuals: [] };
  }
  try {
    const res = await fetch(endpoint("KR", "growing"), {
      headers: { Authorization: `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`pinterest ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const match = (json?.trends ?? []).find(
      (t: { keyword: string }) => t.keyword?.toLowerCase() === keyword.toLowerCase(),
    );
    if (!match) {
      return { status: "unavailable", changeMom: null, changeWow: null, changeYoy: null, series: [], visuals: [] };
    }
    return {
      status: "live",
      changeMom: match.pct_growth_mom ?? null,
      changeWow: match.pct_growth_wow ?? null,
      changeYoy: match.pct_growth_yoy ?? null,
      series: match.time_series?.map((p: { value: number }) => p.value) ?? [],
      // Pinterest API는 트렌드 키워드/성장률만 제공 — 이미지 자체는 별도 승인 범위가 필요하므로 비워 둔다
      visuals: [],
    };
  } catch (e) {
    console.error("[pinterest-trend:keyword]", e);
    return { status: "unavailable", changeMom: null, changeWow: null, changeYoy: null, series: [], visuals: [] };
  }
}
