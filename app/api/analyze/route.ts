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
const adx = marketData.adx;
const atr = marketData.atr;
const currentVolume = marketData.currentVolume;
const averageVolume = marketData.averageVolume;
const volumeRatio = marketData.volumeRatio;
const support = marketData.support;
const resistance = marketData.resistance;
const marketStructure = marketData.marketStructure;
const recentHigh = marketData.recentHigh;
const previousHigh = marketData.previousHigh;
const recentLow = marketData.recentLow;
const previousLow = marketData.previousLow;
const lastClose = marketData.lastClose;
const isConsolidating = marketData.isConsolidating;
   const prompt = [
  "You are an expert technical chart analyst.",
  "Analyze the uploaded trading chart image carefully.",
  `Current live market price: ${currentPrice}.`,
  `Live ADX (14): ${adx}.`,
`Live ATR (14): ${atr}.`,
`Current Volume: ${currentVolume}.`,
`Average Volume (20): ${averageVolume}.`,
`Volume Ratio: ${volumeRatio}.`,
 `Live Support Levels (S1, S2, S3): ${JSON.stringify(support)}.`,
`Live Resistance Levels (R1, R2, R3): ${JSON.stringify(resistance)}.`,
`Live Market Structure: ${marketStructure}.`,
`Recent High: ${recentHigh}.`,
`Previous High: ${previousHigh}.`,
`Recent Low: ${recentLow}.`,
`Previous Low: ${previousLow}.`,
`Last Candle Close: ${lastClose}.`,
`Market Consolidation: ${isConsolidating}.`,
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
   "Use the live support levels S1, S2 and S3 as potential support zones.",
"Use the live resistance levels R1, R2 and R3 as potential resistance zones.",
"Use support and resistance to validate entry, stop loss and take profit levels.",
"Do not place a BUY entry directly into strong resistance.",
"Do not place a SELL entry directly into strong support.",
  "Recent candle structure and breakout/rejection must be considered.",
  "Use higher highs and higher lows as bullish market structure confirmation.",
"Use lower highs and lower lows as bearish market structure confirmation.",
"Treat a confirmed break above a meaningful recent high as potential bullish breakout evidence.",
"Treat a confirmed break below a meaningful recent low as potential bearish breakdown evidence.",
"Identify rejection when price briefly breaks a level but closes back inside the previous range.",
"When the market is consolidating, reduce confidence and prefer WAIT until a clear breakout or breakdown is confirmed.",
"Use market structure together with EMA, RSI, Supertrend, ADX, ATR, volume and support/resistance.",
"Do not classify a single candle move as a confirmed breakout or breakdown without sufficient supporting evidence.",
  "Do not make a BUY or SELL decision from a single indicator.",
  "ADX should be used to evaluate trend strength. Higher ADX means stronger trend, while low ADX suggests a weaker or ranging market.",
"ATR should be used to evaluate volatility and help place realistic stop loss and target levels.",
"Compare current volume with average volume using the volume ratio.",
"Volume above average can strengthen a breakout or trend confirmation.",
"Low volume should reduce confidence in a breakout or directional signal.",
"Use ADX, ATR and volume together with the chart indicators; do not use them alone.",
  "If important indicators conflict, use WAIT.",
  "",
  "For BUY:",
  "Prefer an entry near support, breakout-retest or a confirmed bullish structure.",
  "Stop loss should be below an important support level.",
  "For BUY, place stop loss below the relevant support or bullish invalidation level.",
"For BUY, use ATR as a volatility check so the stop is not unrealistically tight.",
"For a BUY setup, compare the stop-loss distance from the entry with the live ATR.",
"For a SELL setup, compare the stop-loss distance from the entry with the live ATR.",
"If the proposed stop is much closer than normal ATR volatility, widen it to a reasonable invalidation level.",
"If the proposed stop is excessively far away relative to ATR and nearby structure, reconsider the setup or lower confidence.",
"Prefer a stop-loss level that is protected beyond both the relevant market structure and normal volatility.",
"For SELL, place stop loss above the relevant resistance or bearish invalidation level.",
"For SELL, use ATR as a volatility check so the stop is not unrealistically tight.",
"Stop loss must account for normal market volatility and recent candle range.",
"Do not place stop loss inside the main support/resistance zone when a clear invalidation level exists.",
"Do not use an arbitrary fixed percentage for stop loss.",
  "TP1, TP2 and TP3 should be progressively higher resistance/target levels.",
  "",
  "For SELL:",
  "Prefer an entry near resistance, breakdown-retest or a confirmed bearish structure.",
  "Stop loss should be above an important resistance level.",
  "TP1, TP2 and TP3 should be progressively lower support/target levels.",
  "TP1 should be the nearest realistic target and preferably the first meaningful support/resistance level.",
"TP2 should be the next meaningful target beyond TP1.",
"TP3 should be the strongest realistic extended target based on visible structure.",
"TP1, TP2 and TP3 must always be progressively ordered in the direction of the trade.",
"For BUY, TP1 < TP2 < TP3.",
"For SELL, TP1 > TP2 > TP3.",
"Use live support/resistance levels when selecting TP targets.",
"Use ATR and recent market structure to avoid unrealistic target distances.",
"Do not place a take-profit target directly inside a strong opposing support/resistance level.",
"TP1 should be reachable before TP2, and TP2 before TP3.",
"Targets should respect the current live market price and trade direction.",
"For BUY, all targets should be above the entry zone.",
"For SELL, all targets should be below the entry zone.",
"Use nearby support/resistance as primary target references and ATR as a volatility sanity check.",
"If a target is too close to the entry to provide meaningful profit, choose the next reasonable structure level.",
"If TP3 would require an unrealistic move relative to the visible market structure, reduce confidence and use a more realistic target.",
"Before returning JSON, verify TP1, TP2 and TP3 ordering and their relationship to the entry and stop loss.",
"Before returning JSON, independently verify the RiskReward calculation.",
"Verify that risk is greater than zero.",
"Verify that reward is greater than zero for a valid BUY or SELL setup.",
"Verify that the displayed RiskReward matches reward divided by risk.",
"If the calculated RiskReward conflicts with the proposed entry, stop loss or TP1, correct the levels before returning the result.",
"For WAIT, calculate RiskReward from the proposed potential entry zone, conditional stop loss and TP1.",
  "",
  "Entry, stopLoss, TP1, TP2 and TP3 must ALWAYS be provided, including when signal is WAIT.",
   "Entry should be provided as a realistic price zone when market structure allows it.",
   "Always make the entry easy to understand for the user.",
"Use this format for a zone: LOWER - UPPER.",
"For a BUY setup, the lower entry price must be listed first and the upper price second.",
"For a SELL setup, the lower entry price must still be listed first and the upper price second.",
"Keep the entry zone reasonably narrow and close to the relevant support/resistance or current market price.",
"Do not use a single distant price as the entry when a realistic entry zone can be identified.",
"Never place the entry zone beyond the stop-loss invalidation level.",
"Format entry as a clear range such as 79100 - 79250 when a zone is appropriate.",
"For BUY, prefer an entry zone near support, a confirmed breakout-retest, or a favorable pullback.",
"For SELL, prefer an entry zone near resistance, a confirmed breakdown-retest, or a favorable pullback.",
"For WAIT, provide the most reasonable potential entry zone for the bullish or bearish setup.",
"Do not choose an entry zone that is already too far from the current live price unless the setup explicitly requires a deeper pullback.",
"Entry must be consistent with the live price, support/resistance and market structure.",
"For WAIT, provide a POTENTIAL entry zone and conditional stop loss/targets based on the visible chart structure and live market price.",
"For BUY or WAIT with bullish bias, entry should be near support, breakout-retest or current price when appropriate.",
"For SELL or WAIT with bearish bias, entry should be near resistance, breakdown-retest or current price when appropriate.",
"Stop loss must be logically placed beyond the relevant support/resistance or invalidation level.",
"Before returning the result, verify that the stop loss is on the correct side of the entry for the selected signal.",
"For BUY, stop loss must be below the entry zone.",
"For SELL, stop loss must be above the entry zone.",
"For WAIT, stop loss must match the proposed bullish or bearish setup.",
"TP1, TP2 and TP3 must be progressively placed at realistic support/resistance or target levels.",
"RiskReward must be calculated using the proposed entry zone, stopLoss and TP1.",
"Calculate risk as the distance from the entry zone to the stop loss.",
"Calculate reward using TP1 as the first target.",
"For BUY, risk is entry minus stop loss, and reward is TP1 minus entry.",
"For SELL, risk is stop loss minus entry, and reward is entry minus TP1.",
"RiskReward must be the reward divided by the risk.",
"Use the midpoint of the entry zone for the primary RiskReward calculation.",
"Round RiskReward to a reasonable number of decimal places.",
"Do not report a favorable RiskReward if the actual calculated value is unfavorable.",
"If RiskReward is below 1:1, strongly prefer WAIT or reduce confidence unless there is exceptional supporting evidence.",
"Never return N/A for entry, stopLoss, TP1, TP2, TP3 or riskReward unless the image and live market data are completely unusable.",
 "Before returning the JSON, verify that the entry zone, stop loss and TP1 are logically consistent.",
 "Validate the final stop loss against entry, ATR, support/resistance and market structure before returning JSON.",
"Never return a stop loss that would immediately invalidate the setup because of normal market noise.",
"Verify that the proposed entry zone does not contradict the identified support/resistance and market structure.",
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