import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/market-data" 

export async function GET() {
  try {
    const marketData = await getMarketData();

    return NextResponse.json(marketData);
  } catch (error) {
    console.error("Market API error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch market data",
      },
      {
        status: 500,
      }
    );
  }
}