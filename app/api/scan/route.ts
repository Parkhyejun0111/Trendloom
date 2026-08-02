import { NextResponse } from "next/server";
import { fetchKeywordTrend, fetchMarket, type Segment } from "@/lib/naver";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    keywords?: string[];
    category?: string;
    segment?: Partial<Segment>;
  };

  const keywords = (body.keywords ?? [])
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!keywords.length) {
    return NextResponse.json({ error: "키워드를 1개 이상 입력하세요." }, { status: 400 });
  }

  const segment: Segment = {
    gender: body.segment?.gender ?? "",
    ages: body.segment?.ages ?? [],
    device: body.segment?.device ?? "",
  };

  const [trend, ...markets] = await Promise.all([
    fetchKeywordTrend(body.category ?? "50000000", keywords, segment),
    ...keywords.map((k) => fetchMarket(k)),
  ]);

  const notes = [trend.note, ...markets.map((m) => m.note)].filter(Boolean);

  return NextResponse.json({
    source: trend.source === "naver" && markets.every((m) => m.source === "naver")
      ? "naver"
      : "demo",
    notes,
    keywords,
    segment,
    trend: trend.series,
    markets: markets.map((m) => m.snapshot),
  });
}
