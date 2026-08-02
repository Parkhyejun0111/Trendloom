import { NextResponse } from "next/server";
import { fetchStyleImages, type StyleMood } from "@/lib/naver";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    keywords?: string[];
    mood?: StyleMood;
    perKeyword?: number;
  };

  const keywords = (body.keywords ?? [])
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!keywords.length) {
    return NextResponse.json({ error: "키워드를 1개 이상 입력하세요." }, { status: 400 });
  }

  const mood: StyleMood = body.mood ?? "street";
  const perKeyword = Math.min(80, Math.max(12, body.perKeyword ?? 40));

  const results = await Promise.all(
    keywords.map((k) => fetchStyleImages(k, mood, perKeyword)),
  );

  // 키워드별 결과를 라운드로빈으로 섞어 보드 상단이 한 키워드로 쏠리지 않게 한다
  const buckets = results.map((r) => r.images);
  const images: (typeof buckets)[number] = [];
  const seen = new Set<string>();
  for (let i = 0; i < perKeyword; i++) {
    for (const b of buckets) {
      const im = b[i];
      if (!im) continue;
      const key = im.thumbnail || `${im.query}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      images.push(im);
    }
  }

  return NextResponse.json({
    source: results.every((r) => r.source === "naver") ? "naver" : "demo",
    notes: results.map((r) => r.note).filter(Boolean),
    keywords,
    mood,
    images,
  });
}
