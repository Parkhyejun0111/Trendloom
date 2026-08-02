/**
 * 네이버 오픈 API 클라이언트
 *  - 쇼핑 검색 API      : 실제 판매중인 상품/가격/브랜드/카테고리
 *  - 데이터랩 쇼핑인사이트 : 카테고리 내 키워드 검색량 추이 (성별/연령 세그먼트)
 *  - 이미지 검색 API     : 스타일 레퍼런스 이미지 (룩북/스트릿/코디컷)
 *
 * 키(NAVER_CLIENT_ID / NAVER_CLIENT_SECRET)가 없으면
 * 키워드 해시 기반의 결정적(deterministic) 데모 데이터로 폴백한다.
 * 폴백 여부는 응답의 `source: "demo"` 로 UI에 그대로 노출한다.
 */

export const FASHION_CATEGORIES = [
  { code: "50000000", label: "패션의류" },
  { code: "50000001", label: "패션잡화" },
  { code: "50000002", label: "화장품/미용" },
  { code: "50000007", label: "스포츠/레저" },
] as const;

export type Segment = {
  /** "" = 전체, "m" | "f" */
  gender: "" | "m" | "f";
  /** ["10","20","30","40","50","60"] */
  ages: string[];
  /** "" = 전체, "pc" | "mo" */
  device: "" | "pc" | "mo";
};

export type TrendPoint = { period: string; ratio: number };
export type TrendSeries = { keyword: string; data: TrendPoint[] };

export type ShopItem = {
  title: string;
  link: string;
  image: string;
  price: number;
  mall: string;
  brand: string;
  category: string;
};

export type MarketSnapshot = {
  keyword: string;
  total: number;
  items: ShopItem[];
  price: {
    min: number;
    p25: number;
    median: number;
    p75: number;
    max: number;
    avg: number;
  };
  brandShare: { name: string; count: number; share: number }[];
  categoryShare: { name: string; count: number; share: number }[];
};

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
/* 1. 데이터랩 쇼핑인사이트 — 키워드 트렌드                              */
/* ------------------------------------------------------------------ */

export function monthRange(months = 12) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export async function fetchKeywordTrend(
  category: string,
  keywords: string[],
  segment: Segment,
): Promise<{ source: "naver" | "demo"; series: TrendSeries[]; note?: string }> {
  const { startDate, endDate } = monthRange(12);

  if (hasKeys()) {
    try {
      const res = await fetch(
        "https://openapi.naver.com/v1/datalab/shopping/category/keywords",
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            startDate,
            endDate,
            timeUnit: "month",
            category,
            keyword: keywords.slice(0, 5).map((k) => ({ name: k, param: [k] })),
            device: segment.device,
            gender: segment.gender,
            ages: segment.ages,
          }),
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error(`datalab ${res.status}: ${await res.text()}`);
      const json = await res.json();
      return {
        source: "naver",
        series: (json.results ?? []).map(
          (r: { title: string; data: TrendPoint[] }) => ({
            keyword: r.title,
            data: r.data ?? [],
          }),
        ),
      };
    } catch (e) {
      return {
        source: "demo",
        series: demoTrend(keywords, startDate, segment),
        note: `네이버 데이터랩 호출 실패로 데모 데이터 사용: ${(e as Error).message}`,
      };
    }
  }

  return { source: "demo", series: demoTrend(keywords, startDate, segment) };
}

function demoTrend(
  keywords: string[],
  startDate: string,
  segment: Segment,
): TrendSeries[] {
  const start = new Date(startDate);
  return keywords.slice(0, 5).map((k) => {
    const rand = mulberry32(seedFrom(k + segment.gender + segment.ages.join()));
    // 시즌성: 아우터 계열은 겨울 피크, 이너/원피스는 여름 피크로 흉내
    const winter = /코트|패딩|자켓|재킷|점퍼|니트|부츠|머플러|플리스|무스탕/.test(k);
    const summer = /원피스|반팔|린넨|샌들|비치|나시|크롭|셔츠/.test(k);
    const base = 30 + rand() * 30;
    const drift = (rand() - 0.35) * 3.5; // 완만한 상승/하락 추세
    return {
      keyword: k,
      data: Array.from({ length: 12 }, (_, i) => {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        const m = d.getMonth() + 1;
        let season = 0;
        if (winter) season = 26 * Math.cos(((m - 1) / 12) * 2 * Math.PI);
        if (summer) season = 26 * Math.cos(((m - 7) / 12) * 2 * Math.PI);
        const noise = (rand() - 0.5) * 9;
        return {
          period: `${d.getFullYear()}-${String(m).padStart(2, "0")}-01`,
          ratio: Math.max(1, Math.round((base + season + drift * i + noise) * 10) / 10),
        };
      }),
    };
  });
}

/* ------------------------------------------------------------------ */
/* 2. 쇼핑 검색 — 실판매 상품/가격 스냅샷                                */
/* ------------------------------------------------------------------ */

const stripTags = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

export async function fetchMarket(
  keyword: string,
): Promise<{ source: "naver" | "demo"; snapshot: MarketSnapshot; note?: string }> {
  if (hasKeys()) {
    try {
      const url = new URL("https://openapi.naver.com/v1/search/shop.json");
      url.searchParams.set("query", keyword);
      url.searchParams.set("display", "100");
      url.searchParams.set("sort", "sim");
      const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
      if (!res.ok) throw new Error(`shop ${res.status}: ${await res.text()}`);
      const json = await res.json();
      const items: ShopItem[] = (json.items ?? []).map(
        (it: Record<string, string>) => ({
          title: stripTags(it.title),
          link: it.link,
          image: it.image,
          price: Number(it.lprice) || 0,
          mall: it.mallName || "기타",
          brand: it.brand || it.maker || "노브랜드",
          category: [it.category2, it.category3, it.category4]
            .filter(Boolean)
            .join(" > "),
        }),
      );
      return {
        source: "naver",
        snapshot: summarize(keyword, Number(json.total) || items.length, items),
      };
    } catch (e) {
      const items = demoItems(keyword);
      return {
        source: "demo",
        snapshot: summarize(keyword, demoTotal(keyword), items),
        note: `네이버 쇼핑 API 호출 실패로 데모 데이터 사용: ${(e as Error).message}`,
      };
    }
  }

  const items = demoItems(keyword);
  return { source: "demo", snapshot: summarize(keyword, demoTotal(keyword), items) };
}

/** 데모 모드에서 키워드별로 다른 '검색 결과 총 상품수' */
function demoTotal(keyword: string) {
  return 4000 + Math.floor(mulberry32(seedFrom(`total:${keyword}`))() * 900_000);
}

const DEMO_BRANDS = [
  "무신사 스탠다드", "커버낫", "마르디 메크르디", "인사일런스", "토피",
  "라퍼지스토어", "디스이즈네버댓", "예스아이씨", "노브랜드", "안다르",
];
const DEMO_MALLS = ["무신사", "29CM", "지그재그", "W컨셉", "스마트스토어", "SSF샵"];

function demoItems(keyword: string): ShopItem[] {
  const rand = mulberry32(seedFrom(keyword));
  const anchor = 29000 + Math.floor(rand() * 90000);
  return Array.from({ length: 60 }, (_, i) => {
    const brand = DEMO_BRANDS[Math.floor(rand() * DEMO_BRANDS.length)];
    // 로그정규 유사 분포: 저가 다수 + 고가 롱테일
    const mult = Math.exp((rand() - 0.42) * 1.15);
    return {
      title: `${brand} ${keyword} ${["오버핏", "슬림핏", "크롭", "세미와이드", "레귤러"][i % 5]}`,
      link: "#",
      image: "",
      price: Math.round((anchor * mult) / 1000) * 1000,
      mall: DEMO_MALLS[Math.floor(rand() * DEMO_MALLS.length)],
      brand,
      category: `${["여성의류", "남성의류"][i % 2]} > ${keyword}`,
    };
  });
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

function share(items: ShopItem[], key: "brand" | "category") {
  const counts = new Map<string, number>();
  for (const it of items) {
    const k = it[key] || "기타";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      share: Math.round((count / items.length) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* 3. 이미지 검색 — 스타일 레퍼런스 보드                                 */
/* ------------------------------------------------------------------ */

export type StyleImage = {
  /** 원본 페이지/이미지 URL */
  link: string;
  /** search.pstatic.net 썸네일 (next/image 허용 호스트) */
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

export function buildStyleQuery(keyword: string, mood: StyleMood) {
  const suffix = STYLE_MOODS.find((m) => m.id === mood)?.suffix ?? "";
  return suffix ? `${keyword} ${suffix}` : keyword;
}

/**
 * 키워드 하나에 대한 스타일 레퍼런스 이미지.
 * 네이버 이미지 검색은 상단 결과가 광고/썸네일 노이즈인 경우가 있어
 * 세로형(코디컷) 비율을 우선하도록 정렬한다.
 */
export async function fetchStyleImages(
  keyword: string,
  mood: StyleMood,
  display = 60,
): Promise<{ source: "naver" | "demo"; images: StyleImage[]; note?: string }> {
  const query = buildStyleQuery(keyword, mood);

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
          thumbnail: it.thumbnail,
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

function summarize(
  keyword: string,
  total: number,
  items: ShopItem[],
): MarketSnapshot {
  const prices = items.map((i) => i.price).filter((p) => p > 0).sort((a, b) => a - b);
  return {
    keyword,
    total,
    items: items.slice(0, 24),
    price: {
      min: prices[0] ?? 0,
      p25: quantile(prices, 0.25),
      median: quantile(prices, 0.5),
      p75: quantile(prices, 0.75),
      max: prices[prices.length - 1] ?? 0,
      avg: prices.length
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0,
    },
    brandShare: share(items, "brand"),
    categoryShare: share(items, "category"),
  };
}
