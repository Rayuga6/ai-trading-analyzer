import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch market data");
    }

    const data = await response.json();

    return NextResponse.json({
      symbol: data.symbol,
      price: Number(data.price),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Market API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}