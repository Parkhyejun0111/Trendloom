import { NextResponse } from "next/server";
import { getTrendDetail } from "@/lib/trend-db";

export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getTrendDetail(slug);
  if (!detail) {
    return NextResponse.json({ error: "존재하지 않는 트렌드입니다." }, { status: 404 });
  }
  return NextResponse.json(detail);
}
