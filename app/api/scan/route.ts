import { NextResponse } from "next/server";
import { fetchKeywordTrend, type Segment } from "@/lib/naver";

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

  const trend = await fetchKeywordTrend(body.category ?? "50000000", keywords, segment);

  return NextResponse.json({
    source: trend.source,
    notes: [trend.note].filter(Boolean),
    keywords,
    segment,
    trend: trend.series,
  });
}
