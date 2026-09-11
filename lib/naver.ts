/**
 * 네이버 오픈 API 클라이언트 — 이미지 검색.
 *
 * 한때 쇼핑 검색과 데이터랩 쇼핑인사이트도 썼지만 둘 다 쓸 수 없게 됐다.
 * 쇼핑 검색(/v1/search/shop)은 서비스가 종료돼 404 SE05 를 주고,
 * 데이터랩은 콘솔이 "신규로 등록할 수 없는 API"로 등록을 거부해
 * 401 Scope Status Invalid 가 떨어진다. 남은 것은 이미지 검색뿐이다.
 *
 * 키(NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)가 없으면 키워드 해시 기반의
 * 결정적 데모 카드로 폴백하고, 그 사실을 `source: "demo"` 로 UI 에 그대로 노출한다.
 */


const hasKeys = () =>
  Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);

const authHeaders = () => ({
  "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
  "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
});

/* ------------------------------------------------------------------ */
/* 결정적 난수 (같은 키워드 → 항상 같은 데모 데이터)                     */
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

/* ------------------------------------------------------------------ */
/* 공통 헬퍼                                                            */
/* ------------------------------------------------------------------ */

const stripTags = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

/* ------------------------------------------------------------------ */
/* 이미지 검색 — 스타일 레퍼런스 보드                                 */
/* ------------------------------------------------------------------ */

/**
 * 네이버 썸네일 프록시(search.pstatic.net/sunny)의 크기 파라미터를 키운다.
 *
 * 검색 API 가 주는 기본값은 type=b150 — 실제로 100×150 이라 보드 컬럼(약 250px)에
 * 늘려 놓으면 뭉갠다. 실측으로 확인한 상한이 a340(340×510, 15~43KB)이고
 * b500·a600·b800·f500_500 은 모두 404 다.
 */
const THUMB_TYPE = "a340";

export function upscaleThumbnail(url: string): string {
  if (!url || !url.includes("search.pstatic.net")) return url;
  if (/[?&]type=/.test(url)) {
    return url.replace(/([?&])type=[^&]*/, `$1type=${THUMB_TYPE}`);
  }
  return `${url}${url.includes("?") ? "&" : "?"}type=${THUMB_TYPE}`;
}

export type StyleImage = {
  /** 원본 이미지 URL — 클릭 시 원본, 고화질 보기에서도 쓴다 */
  link: string;
  /** search.pstatic.net 썸네일 (보드 격자용) */
  thumbnail: string;
  title: string;
  width: number;
  height: number;
  /** 이 이미지를 끌어온 검색어 */
  query: string;
  /** 데모 모드에서 실제 사진 없이 자리를 채우는 카드 */
  placeholder?: boolean;
};

/** 무드 프리셋 — 검색어를 패션 레퍼런스가 나오도록 다듬는다 */
export const STYLE_MOODS = [
  { id: "street", label: "스트릿", suffix: "스트릿 패션 코디" },
  { id: "minimal", label: "미니멀", suffix: "미니멀 룩 데일리 코디" },
  { id: "lookbook", label: "룩북", suffix: "브랜드 룩북 화보" },
  { id: "office", label: "오피스", suffix: "오피스룩 출근룩" },
  { id: "vintage", label: "빈티지", suffix: "빈티지 레트로 코디" },
  { id: "sporty", label: "스포티", suffix: "스포티 애슬레저 코디" },
  { id: "runway", label: "런웨이", suffix: "런웨이 컬렉션" },
  { id: "raw", label: "그대로", suffix: "" },
] as const;

export type StyleMood = (typeof STYLE_MOODS)[number]["id"];

/** moodSuffix 는 프리셋에서 고른 문구든 사용자가 직접 입력한 문구든 그냥 검색어 뒤에 붙는 텍스트다 */
export function buildStyleQuery(keyword: string, moodSuffix: string) {
  const suffix = moodSuffix.trim();
  return suffix ? `${keyword} ${suffix}` : keyword;
}

/**
 * 키워드 하나에 대한 스타일 레퍼런스 이미지.
 * 네이버 이미지 검색은 상단 결과가 광고/썸네일 노이즈인 경우가 있어
 * 세로형(코디컷) 비율을 우선하도록 정렬한다.
 */
export async function fetchStyleImages(
  keyword: string,
  moodSuffix: string,
  display = 60,
): Promise<{ source: "naver" | "demo"; images: StyleImage[]; note?: string }> {
  const query = buildStyleQuery(keyword, moodSuffix);

  if (hasKeys()) {
    try {
      const url = new URL("https://openapi.naver.com/v1/search/image");
      url.searchParams.set("query", query);
      url.searchParams.set("display", String(Math.min(100, display)));
      url.searchParams.set("sort", "sim");
      url.searchParams.set("filter", "large");
      const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
      if (!res.ok) throw new Error(`image ${res.status}: ${await res.text()}`);
      const json = await res.json();

      const images: StyleImage[] = (json.items ?? [])
        .map((it: Record<string, string>) => ({
          link: it.link,
          thumbnail: upscaleThumbnail(it.thumbnail),
          title: stripTags(it.title),
          width: Number(it.sizewidth) || 0,
          height: Number(it.sizeheight) || 0,
          query: keyword,
        }))
        .filter((im: StyleImage) => im.thumbnail && im.width > 0 && im.height > 0)
        // 코디컷은 대부분 세로형 — 가로로 긴 배너/로고성 이미지를 뒤로 민다
        .sort((a: StyleImage, b: StyleImage) => a.width / a.height - b.width / b.height);

      return { source: "naver", images };
    } catch (e) {
      return {
        source: "demo",
        images: demoStyleImages(keyword),
        note: `네이버 이미지 검색 호출 실패로 데모 카드 사용: ${(e as Error).message}`,
      };
    }
  }

  return { source: "demo", images: demoStyleImages(keyword) };
}

/** 키가 없을 때: 사진 대신 비율만 잡힌 자리표시 카드 (가짜 사진을 만들지 않는다) */
function demoStyleImages(keyword: string): StyleImage[] {
  const rand = mulberry32(seedFrom(`img:${keyword}`));
  const ratios = [3 / 4, 2 / 3, 4 / 5, 1, 3 / 5];
  return Array.from({ length: 18 }, (_, i) => {
    const r = ratios[Math.floor(rand() * ratios.length)];
    const width = 600;
    return {
      link: "#",
      thumbnail: "",
      title: `${keyword} 레퍼런스 ${i + 1}`,
      width,
      height: Math.round(width / r),
      query: keyword,
      placeholder: true,
    };
  });
}
