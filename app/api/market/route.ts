import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/market-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const marketData = await getMarketData();
    return NextResponse.json(marketData, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Market API error:", error);
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
