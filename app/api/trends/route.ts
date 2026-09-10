import { NextResponse } from "next/server";
import { getTrendSnapshot } from "@/lib/trend-db";

export const maxDuration = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "1";
  const snapshot = await getTrendSnapshot(refresh);
  return NextResponse.json(snapshot);
}
