import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(userId: string) {
  return `analyze:${userId}`;
}

function checkRateLimit(userId: string) {
  const now = Date.now();
  const key = getRateLimitKey(userId);
  const current = rateLimitStore.get(key);

  if (!current || now >= current.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - current.count,
  };
}

function safeText(value: unknown, fallback = "", maxLength = 200) {
  const text = String(value ?? fallback)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();

  return text.slice(0, maxLength);
}

function isAllowedImageMagic(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  if (mimeType === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  return false;
}

function errorResponse(status = 500) {
  return NextResponse.json(
    {
      error: status === 401
        ? "Authentication required"
        : status === 400
          ? "Invalid request"
          : "AI analysis failed",
    },
    { status }
  );
}
import {
  getMarketData,
  getIndianMarketData,
  getForexMarketData,
  getGlobalStockMarketData,
  getStockFundamentals,
  getStockEarnings,
  getAnalystTargets,
} from "@/lib/market-data";
import { getMarketNews } from "@/lib/news-data";
import { getCurrentUser } from "@/lib/auth";
import { saveAnalysis } from "@/lib/database";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AnalysisMode = "live" | "chart";

function normalizeSymbol(value: string) {
  const raw = value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace("PERPETUAL", "");

  // Common chart-label aliases so valid charts are not rejected.
  // NIFTY is often displayed as NIFTY50 / NIFTY50INDEX,
  // BANKNIFTY as NIFTYBANK / BANKNIFTYINDEX, and SENSEX with
  // different exchange/chart suffixes.
  if (raw === "NIFTY" || raw === "NIFTY50" || raw === "NIFTY50INDEX") {
    return "NIFTY";
  }

  if (
    raw === "BANKNIFTY" ||
    raw === "NIFTYBANK" ||
    raw === "BANKNIFTYINDEX"
  ) {
    return "BANKNIFTY";
  }

  if (
    raw === "SENSEX" ||
    raw === "BSESENSEX" ||
    raw === "SENSEXINDEX"
  ) {
    return "SENSEX";
  }

  // Crypto formats: BTC/USDT, BTCUSDT, BTCUSD, BTCUSDT.P -> BTC
  return raw.replace("USDT", "").replace("USD", "");
}

function getExpectedSymbol(
  cryptoSymbol: string,
  indianSymbol: string,
  forexSymbol: string,
  stockSymbol: string
) {
  if (stockSymbol) return stockSymbol;
  if (indianSymbol) return indianSymbol;
  if (forexSymbol) return forexSymbol;
  return cryptoSymbol || "BTCUSDT";
}

async function validateChartMarket(
  image: File,
  mimeType: string,
  base64: string,
  expectedSymbol: string
) {
  const validationResponse = await openai.responses.create({
    model: "gpt-5.6",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "You are validating whether a trading chart belongs to the selected market.",
              `Selected market symbol: ${expectedSymbol}.`,
              "",
              "Inspect the uploaded chart carefully.",
              "Identify the symbol, ticker, currency pair, index name, or company ticker shown anywhere on the chart.",
              "Use chart title, symbol label, watermark, ticker text, or other clear identifiers.",
              "",
              "Return ONLY valid JSON in exactly this format:",
              '{"match":true,"detectedSymbol":"BTCUSDT","confidence":95}',
              "",
              "Rules:",
              "- match=true only when the visible chart clearly belongs to the selected symbol.",
              "- match=false when the visible chart clearly belongs to a different symbol.",
              "- If the chart symbol cannot be identified reliably, use match=true, detectedSymbol='UNKNOWN', confidence=0 so a false rejection is avoided.",
              "- Do not guess a symbol from price alone.",
              "- Normalize common formats such as BTC/USDT, BTCUSDT, BTCUSD and BTCUSDT.P when appropriate.",
              "- For NIFTY, BANKNIFTY and SENSEX, recognize their common chart labels.",
              "- For forex, recognize common formats such as EUR/USD and EURUSD.",
              "- Confidence must be a number from 0 to 100.",
            ].join("\n"),
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

  try {
    return JSON.parse(validationResponse.output_text);
  } catch {
    return {
      match: true,
      detectedSymbol: "UNKNOWN",
      confidence: 0,
    };
  }
}

export async function POST(request: Request) {
  try {
    // Backend authentication: analysis is available only to signed-in users.
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse(401);
    }

    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many analysis requests.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds ?? 60),
          },
        }
      );
    }

    const contentLength = Number(request.headers.get("content-length") || "0");
    const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "Request is too large." },
        { status: 413 }
      );
    }

    const formData = await request.formData();

    const tradingStyle = safeText(formData.get("tradingStyle"), "Scalping", 80);
    const analysisMode = safeText(
      formData.get("analysisMode"),
      "live",
      20
    ) as AnalysisMode;

    const selectedMarket = safeText(formData.get("selectedMarket"), "", 80);
    const timeframe = safeText(
      formData.get("timeframe"),
      "15m",
      10
    ).toLowerCase();
    const cryptoSymbol = safeText(
      formData.get("cryptoSymbol"),
      "BTCUSDT",
      40
    );
    const indianSymbol = safeText(formData.get("indianSymbol"), "", 40);
    const forexSymbol = safeText(formData.get("forexSymbol"), "", 40);
    const stockSymbol = safeText(formData.get("stockSymbol"), "", 40);

    const image = formData.get("image");

    const allowedTimeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
    if (!allowedTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: "Invalid timeframe selected." },
        { status: 400 }
      );
    }

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

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

    if (analysisMode !== "live" && analysisMode !== "chart") {
      return NextResponse.json(
        { error: "Invalid analysis mode." },
        { status: 400 }
      );
    }

    if (analysisMode === "live" && !selectedMarket) {
      return NextResponse.json(
        { error: "Please select a market before Live Data Analysis." },
        { status: 400 }
      );
    }

    const bytes = await image.arrayBuffer();
    const imageBytes = new Uint8Array(bytes);
    const mimeType = image.type || "image/jpeg";

    if (!isAllowedImageMagic(imageBytes, mimeType)) {
      return NextResponse.json(
        { error: "The uploaded file is not a valid PNG, JPEG, or WebP image." },
        { status: 400 }
      );
    }

    const base64 = Buffer.from(imageBytes).toString("base64");

    let currentPrice: string | number | null = "Not available";
    let adx: string | number | null = "Not available";
    let atr: string | number | null = "Not available";
    let currentVolume: string | number | null = "Not available";
    let averageVolume: string | number | null = "Not available";
    let volumeRatio: string | number | null = "Not available";
    let support: unknown = "Not available";
    let resistance: unknown = "Not available";
    let marketStructure: string | null = "Not available";
    let recentHigh: string | number | null = "Not available";
    let previousHigh: string | number | null = "Not available";
    let recentLow: string | number | null = "Not available";
    let previousLow: string | number | null = "Not available";
    let lastClose: string | number | null = "Not available";
    let isConsolidating: string | boolean | null = "Not available";
    let fundamentals: Awaited<ReturnType<typeof getStockFundamentals>> = null;
    let earnings: Awaited<ReturnType<typeof getStockEarnings>> = null;
    let analystTargets: Awaited<ReturnType<typeof getAnalystTargets>> = null;
    let news: Awaited<ReturnType<typeof getMarketNews>> = null;

    if (analysisMode === "live") {
      const expectedSymbol = getExpectedSymbol(
        cryptoSymbol,
        indianSymbol,
        forexSymbol,
        stockSymbol
      );

      if (!expectedSymbol) {
        return NextResponse.json(
          { error: "Please select a valid market symbol." },
          { status: 400 }
        );
      }

      // Validate the uploaded chart against the market selected by the user.
      // If the chart clearly belongs to another symbol, reject it.
      const validation = await validateChartMarket(
        image,
        mimeType,
        base64,
        expectedSymbol
      );

      const detectedSymbol = String(
        validation?.detectedSymbol || "UNKNOWN"
      );
      const validationConfidence = Number(validation?.confidence || 0);
      const normalizedExpected = normalizeSymbol(expectedSymbol);
      const normalizedDetected = normalizeSymbol(detectedSymbol);
      console.log("Chart market validation:", {
        expectedSymbol,
        detectedSymbol,
        normalizedExpected,
        normalizedDetected,
        modelMatch: validation?.match,
        confidence: validationConfidence,
      });

      const symbolsMatch =
        normalizedExpected &&
        normalizedDetected &&
        normalizedDetected !== "UNKNOWN" &&
        normalizedExpected === normalizedDetected;

      if (
        !symbolsMatch &&
        validation?.match === false &&
        normalizedDetected &&
        normalizedDetected !== "UNKNOWN" &&
        validationConfidence >= 70
      ) {
        return NextResponse.json(
          {
            error: "Wrong chart selected.",
            message: `You selected ${expectedSymbol}, but the uploaded chart appears to be ${detectedSymbol}. Please upload the ${expectedSymbol} chart.`,
            selectedMarket: expectedSymbol,
            detectedMarket: detectedSymbol,
          },
          { status: 400 }
        );
      }

      const marketData = stockSymbol
        ? await getGlobalStockMarketData(stockSymbol, timeframe)
        : indianSymbol
          ? await getIndianMarketData(indianSymbol, timeframe)
          : forexSymbol
            ? await getForexMarketData(forexSymbol, timeframe)
            : await getMarketData(cryptoSymbol || "BTCUSDT", timeframe);

      currentPrice = marketData.price;
      adx = marketData.adx;
      atr = marketData.atr;
      currentVolume = marketData.currentVolume;
      averageVolume = marketData.averageVolume;
      volumeRatio = marketData.volumeRatio;
      support = marketData.support;
      resistance = marketData.resistance;
      marketStructure = marketData.marketStructure;
      recentHigh = marketData.recentHigh;
      previousHigh = marketData.previousHigh;
      recentLow = marketData.recentLow;
      previousLow = marketData.previousLow;
      lastClose = marketData.lastClose;
      isConsolidating = marketData.isConsolidating;

      // Stock intelligence is fetched only for Global Stocks.
      // News is fetched for every selected market.
      if (stockSymbol) {
        [fundamentals, earnings, analystTargets] = await Promise.all([
          getStockFundamentals(stockSymbol),
          getStockEarnings(stockSymbol),
          getAnalystTargets(stockSymbol),
        ]);
      }

      // News is available for every supported market. The news helper
      // automatically selects the correct search profile for stocks,
      // Indian indices, crypto, and forex.
      news = await getMarketNews(expectedSymbol);
    }

    const stockIntelligenceContext = stockSymbol
      ? [
          `Stock fundamentals for ${stockSymbol}: ${JSON.stringify(fundamentals)}.`,
          `Stock earnings information for ${stockSymbol}: ${JSON.stringify(earnings)}.`,
          `Analyst targets for ${stockSymbol}: ${JSON.stringify(analystTargets)}.`,
          `Important recent news for ${stockSymbol}: ${JSON.stringify(news)}.`,
          "Use these fundamentals, earnings, analyst targets, and news values as supporting evidence when available.",
          "Do not invent missing fundamentals, earnings, analyst targets, news headlines, dates, sources, or sentiment.",
        ].join("\n")
      : "No stock fundamentals or earnings data is applicable to this market.";

    const marketContext =
      analysisMode === "live"
        ? [
            `Selected market: ${selectedMarket}.`,
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
          ].join("\n")
        : [
            "Analysis mode: Chart-Only.",
            "No live market was selected.",
            "Do NOT invent or use live market data.",
            "Use only information visible in the uploaded chart.",
          ].join("\n");

    const prompt = [
      "You are an expert technical chart analyst.",
      "Analyze the uploaded trading chart image carefully.",
      `Analysis mode: ${analysisMode}.`,
      `Selected trading style: ${tradingStyle}. Adjust the analysis, entry, stop loss, targets, confidence, and reasoning according to this style.`,
      `Selected timeframe: ${timeframe}.`,
      marketContext,
      stockIntelligenceContext,
      "",
      "Return ONLY valid JSON. No markdown. No explanation outside JSON.",
      "",
      "Use exactly these fields:",
      "signal, trend, entry, stopLoss, tp1, tp2, tp3, confidence, riskReward, reason, bullishProbability, bullishTrigger, bullishTarget, bearishProbability, bearishTrigger, bearishTarget, emaConfirmation, rsiConfirmation, macdConfirmation, supertrendConfirmation, volumeConfirmation, combinedAnalysis, newsSentiment.",
      "",
      "combinedAnalysis must summarize how technical evidence and stock fundamentals/earnings/analyst targets support or conflict with the technical signal.",
      "newsSentiment must be exactly one of: Positive, Neutral, Negative, or Not Available.",
      "If stock intelligence or news is unavailable, clearly state that in combinedAnalysis or use Not Available for newsSentiment rather than inventing data.",
      "",
      "signal must be exactly BUY, SELL, or WAIT.",
      "trend must be exactly Bullish, Bearish, or Neutral / Sideways.",
      "confidence must be a number from 0 to 100.",
      "bullishProbability must be a number from 0 to 100.",
      "bullishTrigger must clearly describe the condition required for bullish confirmation.",
      "bullishTarget must be a realistic bullish target price or target zone.",
      "bearishProbability must be a number from 0 to 100.",
      "bearishTrigger must clearly describe the condition required for bearish confirmation.",
      "bearishTarget must be a realistic bearish target price or target zone.",
      "emaConfirmation must be exactly one of: Confirmed, Weak, Conflicting.",
      "rsiConfirmation must be exactly one of: Confirmed, Weak, Conflicting.",
      "macdConfirmation must be exactly one of: Confirmed, Weak, Conflicting.",
      "supertrendConfirmation must be exactly one of: Confirmed, Weak, Conflicting.",
      "volumeConfirmation must be exactly one of: Confirmed, Weak, Conflicting.",
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
      analysisMode === "live"
        ? "Use the supplied live support and resistance levels as additional confirmation."
        : "Use only support and resistance visible in the uploaded chart.",
      "Do not place a BUY entry directly into strong resistance.",
      "Do not place a SELL entry directly into strong support.",
      "Recent candle structure and breakout/rejection must be considered.",
      "Use higher highs and higher lows as bullish market structure confirmation.",
      "Use lower highs and lower lows as bearish market structure confirmation.",
      "Treat a confirmed break above a meaningful recent high as potential bullish breakout evidence.",
      "Treat a confirmed break below a meaningful recent low as potential bearish breakdown evidence.",
      "Identify rejection when price briefly breaks a level but closes back inside the previous range.",
      "When the market is consolidating, reduce confidence and prefer WAIT until a clear breakout or breakdown is confirmed.",
      "Use market structure together with EMA, RSI, Supertrend, ADX, ATR, volume and support/resistance when those values are available.",
      "Do not classify a single candle move as a confirmed breakout or breakdown without sufficient supporting evidence.",
      "Do not make a BUY or SELL decision from a single indicator.",
      "ADX should be used to evaluate trend strength when live data is available.",
      "ATR should be used to evaluate volatility and help place realistic stop loss and target levels when available.",
      "Compare current volume with average volume when volume data is available.",
      "If important indicators conflict, use WAIT.",
      "For Global Stocks, compare technical evidence with fundamentals, earnings, and analyst targets.",
      "Do not let fundamentals override a clearly invalid technical setup; explain conflicts in combinedAnalysis.",
      "For news, use only the supplied news items and classify the overall sentiment as Positive, Neutral, Negative, or Not Available.",
      "",
      "For BUY:",
      "Prefer an entry near support, breakout-retest or a confirmed bullish structure.",
      "Stop loss should be below an important support level.",
      "For BUY, place stop loss below the relevant support or bullish invalidation level.",
      "Use ATR as a volatility check when available so the stop is not unrealistically tight.",
      "For SELL, place stop loss above the relevant resistance or bearish invalidation level.",
      "Stop loss must account for normal market volatility and recent candle range.",
      "Do not place stop loss inside the main support/resistance zone when a clear invalidation level exists.",
      "Do not use an arbitrary fixed percentage for stop loss.",
      "TP1, TP2 and TP3 should be progressively higher resistance/target levels for BUY.",
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
      "Use ATR and recent market structure to avoid unrealistic target distances when available.",
      "Targets should respect the current market price when live data is available.",
      "For BUY, all targets should be above the entry zone.",
      "For SELL, all targets should be below the entry zone.",
      "",
      "Entry, stopLoss, TP1, TP2 and TP3 must ALWAYS be provided, including when signal is WAIT.",
      "Entry should be provided as a realistic price zone when market structure allows it.",
      "Always make the entry easy to understand for the user.",
      "Use this format for a zone: LOWER - UPPER.",
      "For a BUY setup, the lower entry price must be listed first and the upper price second.",
      "For a SELL setup, the lower entry price must still be listed first and the upper price second.",
      "Keep the entry zone reasonably narrow and close to the relevant support/resistance or current market price.",
      "Never place the entry zone beyond the stop-loss invalidation level.",
      "For WAIT, provide a potential entry zone and conditional stop loss/targets based on the chart structure.",
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
      "Before returning the JSON, verify TP1, TP2 and TP3 ordering and their relationship to the entry and stop loss.",
      "Before returning the JSON, independently verify the RiskReward calculation.",
      "Verify that risk is greater than zero.",
      "Verify that reward is greater than zero for a valid BUY or SELL setup.",
      "Verify that the displayed RiskReward matches reward divided by risk.",
      "If the calculated RiskReward conflicts with the proposed entry, stop loss or TP1, correct the levels before returning the result.",
      "",
      analysisMode === "live"
        ? `Use the live market price ${currentPrice} as an additional confirmation.`
        : "Do not use any live price. Use the price and levels visible in the chart.",
      "Compare the live price with the chart's visible price levels only when live data is available.",
      "Do not blindly follow the screenshot; prioritize consistent evidence from both live price and chart when live mode is active.",
      "This is informational technical analysis, not guaranteed financial advice.",
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

    const selectedSymbol = getExpectedSymbol(
      cryptoSymbol,
      indianSymbol,
      forexSymbol,
      stockSymbol
    );

    // Build a reliable combined view from the AI technical result plus
    // the structured stock intelligence returned by the market/news providers.
    let combinedAnalysis = analysis.combinedAnalysis;

    if (stockSymbol) {
      const technicalConfidence =
        typeof analysis.confidence === "number"
          ? Math.max(0, Math.min(100, analysis.confidence))
          : null;

      let score = technicalConfidence;

      if (fundamentals) {
        const pe = fundamentals.peRatio;
        const forwardPE = fundamentals.forwardPE;
        const margin = fundamentals.profitMargin;
        const roe = fundamentals.returnOnEquity;

        let fundamentalScore = 50;

        if (typeof pe === "number") {
          if (pe > 0 && pe < 25) fundamentalScore += 10;
          else if (pe > 45) fundamentalScore -= 10;
        }

        if (typeof forwardPE === "number") {
          if (forwardPE > 0 && forwardPE < 25) fundamentalScore += 8;
          else if (forwardPE > 45) fundamentalScore -= 8;
        }

        if (typeof margin === "number") {
          if (margin > 0.15) fundamentalScore += 8;
          else if (margin < 0) fundamentalScore -= 10;
        }

        if (typeof roe === "number") {
          if (roe > 0.15) fundamentalScore += 8;
          else if (roe < 0) fundamentalScore -= 8;
        }

        fundamentalScore = Math.max(0, Math.min(100, fundamentalScore));

        if (score == null) {
          score = fundamentalScore;
        } else {
          score = Math.round(score * 0.65 + fundamentalScore * 0.35);
        }
      }

      const recommendation =
        analystTargets?.recommendation?.toLowerCase() || "";

      if (score != null && recommendation) {
        if (recommendation.includes("buy")) score = Math.min(100, score + 5);
        if (recommendation.includes("sell")) score = Math.max(0, score - 5);
      }

      const newsOverall = news?.sentiment ?? "Not Available";

      let bias = analysis.signal || "WAIT";
      if (newsOverall === "Negative" && bias === "BUY") bias = "WAIT";
      if (newsOverall === "Positive" && bias === "SELL") bias = "WAIT";

      const fundamentalsText = fundamentals
        ? `Fundamentals: ${fundamentals.sector || "sector unavailable"}, P/E ${
            fundamentals.peRatio ?? "N/A"
          }, forward P/E ${fundamentals.forwardPE ?? "N/A"}, EPS ${
            fundamentals.eps ?? "N/A"
          }, profit margin ${
            fundamentals.profitMargin != null
              ? `${(fundamentals.profitMargin * 100).toFixed(2)}%`
              : "N/A"
          }.`
        : "Fundamentals are unavailable.";

      const targetsText = analystTargets
        ? `Analyst consensus: ${analystTargets.recommendation || "N/A"}, average target ${
            analystTargets.targetAverage ?? "N/A"
          }.`
        : "Analyst targets are unavailable.";

      const earningsText = earnings
        ? `Next earnings: ${earnings.nextEarningsDate || "N/A"}, EPS actual ${
            earnings.epsActual ?? "N/A"
          } vs estimate ${earnings.epsEstimate ?? "N/A"}.`
        : "Earnings information is unavailable.";

      const technicalText =
        analysis.reason ||
        `${analysis.signal || "WAIT"} signal with ${analysis.confidence ?? "N/A"}% confidence.`;

      combinedAnalysis = {
        score,
        bias,
        conclusion:
          `${technicalText} ${fundamentalsText} ${earningsText} ${targetsText} ` +
          `News sentiment: ${newsOverall}. ` +
          `This combined view is supporting context and does not guarantee future price movement.`,
      };
    }

    const formattedNews = news?.items?.map((item) => ({
      headline: item.title,
      source: item.publisher,
      publishedAt: item.publishedAt,
      summary: item.summary,
      sentiment: item.sentiment,
      link: item.link,
    })) ?? [];

    const newsSentiment = news
      ? {
          overall: news.sentiment,
          score:
            news.sentiment === "Positive"
              ? 75
              : news.sentiment === "Negative"
                ? 25
                : news.sentiment === "Neutral"
                  ? 50
                  : null,
          reason:
            news.items.length > 0
              ? `Overall sentiment is ${news.sentiment.toLowerCase()} based on the available recent headlines.`
              : "No recent news is currently available.",
        }
      : {
          overall: "Not Available",
          score: null,
          reason: "News data is currently unavailable.",
        };

    analysis = {
      ...analysis,
      selectedMarket,
      selectedSymbol,
      timeframe,
      fundamentals,
      earnings,
      analystTargets,
      combinedAnalysis,
      news: formattedNews,
      newsSentiment,
    };

    // Save successful analyses for the signed-in user.
    // History failure must not break the main analysis response.
    try {
      await saveAnalysis({
        market: selectedMarket || null,
        symbol: selectedSymbol || null,
        timeframe: timeframe || null,
        signal:
          typeof analysis.signal === "string"
            ? analysis.signal
            : null,
        confidence:
          typeof analysis.confidence === "number"
            ? analysis.confidence
            : null,
        entry:
          analysis.entry !== undefined && analysis.entry !== null
            ? String(analysis.entry)
            : null,
        stop_loss:
          analysis.stopLoss !== undefined && analysis.stopLoss !== null
            ? String(analysis.stopLoss)
            : null,
        tp1:
          analysis.tp1 !== undefined && analysis.tp1 !== null
            ? String(analysis.tp1)
            : null,
        tp2:
          analysis.tp2 !== undefined && analysis.tp2 !== null
            ? String(analysis.tp2)
            : null,
        tp3:
          analysis.tp3 !== undefined && analysis.tp3 !== null
            ? String(analysis.tp3)
            : null,
        analysis,
      });
    } catch (historyError) {
      console.warn("Analysis history save failed:", historyError);
    }

    return NextResponse.json(analysis, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      },
    });
  } catch (error) {
    console.error("AI analysis error:", error);

    return errorResponse(500);
  }
}
 