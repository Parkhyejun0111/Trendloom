import { NextResponse } from "next/server";
import { getTrendSnapshot } from "@/lib/trend-db";
import { parseSegment } from "@/lib/segment";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "1";
  const segment = parseSegment(searchParams);
  const snapshot = await getTrendSnapshot(segment, refresh);
  return NextResponse.json(snapshot);
}
