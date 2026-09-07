import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");
   if (image instanceof File) {
  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

  if (!allowedTypes.includes(image.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, or WebP images are allowed." },
      { status: 400 }
    );
  }

  if (image.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be smaller than 10 MB." },
      { status: 400 }
    );
  }
}
    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = image.type || "image/jpeg";
      const marketResponse = await fetch(
    `${new URL("/api/market", request.url).toString()}`,
    { cache: "no-store" }
  );

  const marketData = await marketResponse.json();
  const currentPrice = marketData.price;
   const prompt = [
  "You are an expert technical chart analyst.",
  "Analyze the uploaded trading chart image carefully.",
  `Current live market price: ${currentPrice}.`,
  "",
  "Return ONLY valid JSON. No markdown. No explanation outside JSON.",
  "",
  "Use exactly these fields:",
  "signal, trend, entry, stopLoss, tp1, tp2, tp3, confidence, riskReward, reason.",
  "",
  "signal must be exactly BUY, SELL, or WAIT.",
  "trend must be exactly Bullish, Bearish, or Neutral / Sideways.",
  "confidence must be a number from 0 to 100.",
  "reason must briefly explain the signal using visible chart evidence.",
  "",
  "Read all visible information from the chart, including:",
  "current price, candles, timeframe, EMA, RSI, Supertrend, support, resistance, volume and visible price levels.",
  "",
  "FIRST determine the dominant trend.",
  "THEN identify important support and resistance levels.",
  "THEN evaluate candle confirmation and indicator confirmation.",
  "",
  "Use these decision rules:",
  "Trend confirmation is required before considering BUY or SELL.",
  "EMA 7/25/99 alignment should support the direction when visible.",
  "Supertrend direction should support the signal when visible.",
  "RSI overbought or oversold conditions must be considered.",
  "Support and resistance must be considered.",
  "Recent candle structure and breakout/rejection must be considered.",
  "Do not make a BUY or SELL decision from a single indicator.",
  "If important indicators conflict, use WAIT.",
  "",
  "For BUY:",
  "Prefer an entry near support, breakout-retest or a confirmed bullish structure.",
  "Stop loss should be below an important support level.",
  "TP1, TP2 and TP3 should be progressively higher resistance/target levels.",
  "",
  "For SELL:",
  "Prefer an entry near resistance, breakdown-retest or a confirmed bearish structure.",
  "Stop loss should be above an important resistance level.",
  "TP1, TP2 and TP3 should be progressively lower support/target levels.",
  "",
  "Entry, stopLoss, TP1, TP2 and TP3 must ALWAYS be provided, including when signal is WAIT.",
"For WAIT, provide a POTENTIAL entry zone and conditional stop loss/targets based on the visible chart structure and live market price.",
"For BUY or WAIT with bullish bias, entry should be near support, breakout-retest or current price when appropriate.",
"For SELL or WAIT with bearish bias, entry should be near resistance, breakdown-retest or current price when appropriate.",
"Stop loss must be logically placed beyond the relevant support/resistance or invalidation level.",
"TP1, TP2 and TP3 must be progressively placed at realistic support/resistance or target levels.",
"RiskReward must be calculated from the proposed entry, stopLoss and TP1.",
"Never return N/A for entry, stopLoss, TP1, TP2, TP3 or riskReward unless the image and live market data are completely unusable.",
  "",
  `Use the live market price ${currentPrice} as an additional confirmation.`,
"Compare the live price with the chart's visible price levels.",
"Do not blindly follow the screenshot; prioritize consistent evidence from both live price and chart.",
  "This is informational technical analysis, not guaranteed financial advice."
].join("\n");
    const response = await openai.responses.create({
      model: "gpt-5.6",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64}`,
              detail: "high",
            },
          ],
        },
      ],
    });

    const text = response.output_text;

    let analysis;

    try {
      analysis = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error: "AI returned invalid JSON",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
  console.error("AI analysis error:", error);

  const message =
    error instanceof Error ? error.message : "Unknown server error";

  return NextResponse.json(
    {
      error: "AI analysis failed",
      message,
    },
    { status: 500 }
  );
}
}