type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type MarketData = {
  symbol: string;
  price: number;
  timeframe: string;

  adx: number | null;
  atr: number;

  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;

  support: (number | null)[];
  resistance: (number | null)[];

  marketStructure: string;

  recentHigh: number;
  previousHigh: number;

  recentLow: number;
  previousLow: number;

  lastClose: number;

  isConsolidating: boolean;

  timestamp: number;
};

function calculateMarketData(
  symbol: string,
  price: number,
  candles: Candle[],
  timeframe = "15m"
): MarketData {
  if (candles.length < 20) {
    throw new Error("Not enough market data");
  }

  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const volumes = candles.map((candle) => candle.volume);

  // =========================
  // MARKET STRUCTURE
  // =========================

  const structureCandles = candles.slice(-30);

  const structureHighs = structureCandles.map(
    (candle) => candle.high
  );

  const structureLows = structureCandles.map(
    (candle) => candle.low
  );

  const structureCloses = structureCandles.map(
    (candle) => candle.close
  );

  const recentHigh = Math.max(...structureHighs);

  const previousHigh = Math.max(
    ...structureHighs.slice(0, -5)
  );

  const recentLow = Math.min(...structureLows);

  const previousLow = Math.min(
    ...structureLows.slice(0, -5)
  );

  let marketStructure = "Consolidation";

  if (
    recentHigh > previousHigh &&
    recentLow > previousLow
  ) {
    marketStructure = "Higher High / Higher Low";
  } else if (
    recentHigh < previousHigh &&
    recentLow < previousLow
  ) {
    marketStructure = "Lower High / Lower Low";
  } else if (recentHigh > previousHigh) {
    marketStructure = "Bullish Breakout";
  } else if (recentLow < previousLow) {
    marketStructure = "Bearish Breakdown";
  }

  const lastClose =
    structureCloses[structureCloses.length - 1];

  const structureRange =
    recentHigh - recentLow;

  const rangePercent =
    lastClose !== 0
      ? (structureRange / lastClose) * 100
      : 0;

  const isConsolidating =
    rangePercent < 1.5;

  // =========================
  // SUPPORT & RESISTANCE
  // =========================

  const recentCandles = candles.slice(-50);

  const recentHighs = recentCandles.map(
    (candle) => candle.high
  );

  const recentLows = recentCandles.map(
    (candle) => candle.low
  );

  const resistanceLevels = recentHighs
    .filter((level) => level > price)
    .sort((a, b) => a - b);

  const supportLevels = recentLows
    .filter((level) => level < price)
    .sort((a, b) => b - a);

  const resistance = [
    resistanceLevels[0] ?? null,
    resistanceLevels[1] ?? null,
    resistanceLevels[2] ?? null,
  ];

  const support = [
    supportLevels[0] ?? null,
    supportLevels[1] ?? null,
    supportLevels[2] ?? null,
  ];

  // =========================
  // ATR
  // =========================

  const period = 14;

  const trueRanges = candles.map(
    (candle, index) => {
      if (index === 0) {
        return candle.high - candle.low;
      }

      const previousClose =
        candles[index - 1].close;

      return Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose)
      );
    }
  );

  const atrSlice =
    trueRanges.slice(-period);

  const atr =
    atrSlice.reduce(
      (sum, value) => sum + value,
      0
    ) / atrSlice.length;

  // =========================
  // DIRECTIONAL MOVEMENT
  // =========================

  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const upMove =
      highs[i] - highs[i - 1];

    const downMove =
      lows[i - 1] - lows[i];

    plusDM.push(
      upMove > downMove && upMove > 0
        ? upMove
        : 0
    );

    minusDM.push(
      downMove > upMove && downMove > 0
        ? downMove
        : 0
    );
  }

  // =========================
  // ADX
  // =========================

  const dxValues: number[] = [];

  for (
    let i = period - 1;
    i < plusDM.length;
    i++
  ) {
    const plusDMSlice =
      plusDM.slice(
        i - period + 1,
        i + 1
      );

    const minusDMSlice =
      minusDM.slice(
        i - period + 1,
        i + 1
      );

    const trSlice =
      trueRanges.slice(
        i + 1 - period,
        i + 1
      );

    const plusDMSum =
      plusDMSlice.reduce(
        (sum, value) => sum + value,
        0
      );

    const minusDMSum =
      minusDMSlice.reduce(
        (sum, value) => sum + value,
        0
      );

    const trSum =
      trSlice.reduce(
        (sum, value) => sum + value,
        0
      );

    if (trSum === 0) continue;

    const plusDI =
      (plusDMSum / trSum) * 100;

    const minusDI =
      (minusDMSum / trSum) * 100;

    const diSum =
      plusDI + minusDI;

    if (diSum === 0) continue;

    const dx =
      (Math.abs(
        plusDI - minusDI
      ) / diSum) * 100;

    dxValues.push(dx);
  }

  const recentDX =
    dxValues.slice(-period);

  const adx =
    recentDX.length > 0
      ? recentDX.reduce(
          (sum, value) => sum + value,
          0
        ) / recentDX.length
      : null;

  // =========================
  // VOLUME
  // =========================

  const recentVolumes =
    volumes.slice(-20);

  const validVolumes =
    recentVolumes.filter(
      (value) =>
        Number.isFinite(value) &&
        value > 0
    );

  const averageVolume =
    validVolumes.length > 0
      ? validVolumes.reduce(
          (sum, value) => sum + value,
          0
        ) / validVolumes.length
      : 0;

  const currentVolume =
    volumes[volumes.length - 1] || 0;

  const volumeRatio =
    averageVolume > 0
      ? currentVolume / averageVolume
      : 0;

  // =========================
  // FINAL RESULT
  // =========================

  return {
    symbol,
    price,
    timeframe,

    adx:
      adx !== null
        ? Number(adx.toFixed(2))
        : null,

    atr:
      Number(atr.toFixed(2)),

    currentVolume:
      Number(currentVolume.toFixed(2)),

    averageVolume:
      Number(averageVolume.toFixed(2)),

    volumeRatio:
      Number(volumeRatio.toFixed(2)),

    support: support.map(
      (level) =>
        level !== null
          ? Number(level.toFixed(2))
          : null
    ),

    resistance: resistance.map(
      (level) =>
        level !== null
          ? Number(level.toFixed(2))
          : null
    ),

    marketStructure,

    recentHigh:
      Number(recentHigh.toFixed(2)),

    previousHigh:
      Number(previousHigh.toFixed(2)),

    recentLow:
      Number(recentLow.toFixed(2)),

    previousLow:
      Number(previousLow.toFixed(2)),

    lastClose:
      Number(lastClose.toFixed(2)),

    isConsolidating,

    timestamp: Date.now(),
  };
}

// ======================================================
// CRYPTO MARKET — BINANCE
// ======================================================

export async function getMarketData(
  symbol = "BTCUSDT",
  timeframe = "15m"
) {
  const tickerResponse = await fetch(
    `https://data-api.binance.vision/api/v3/ticker/price?symbol=${symbol}`,
    {
      cache: "no-store",
    }
  );

  const candleResponse = await fetch(
    `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${encodeURIComponent(timeframe)}&limit=100`,
    {
      cache: "no-store",
    }
  );

  if (
    !tickerResponse.ok ||
    !candleResponse.ok
  ) {
    throw new Error(
      "Failed to fetch Binance market data"
    );
  }

  const ticker =
    await tickerResponse.json();

  const rawCandles =
    await candleResponse.json();

  const candles: Candle[] =
    rawCandles.map(
      (candle: unknown[]) => ({
        time: Number(candle[0]),
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
      })
    );

  return calculateMarketData(
    ticker.symbol,
    Number(ticker.price),
    candles,
    timeframe
  );
}
// ======================================================
// YAHOO TIMEFRAME HELPERS
// ======================================================

function yahooChartParams(timeframe: string): { interval: string; range: string } {
  switch (timeframe) {
    case "1m":
      return { interval: "1m", range: "5d" };
    case "5m":
    case "15m":
    case "30m":
      return { interval: timeframe, range: "1mo" };
    case "1h":
      return { interval: "1h", range: "3mo" };
    case "4h":
      // Yahoo does not provide a native 4h interval; fetch 1h and aggregate below.
      return { interval: "1h", range: "6mo" };
    case "1d":
      return { interval: "1d", range: "2y" };
    default:
      return { interval: "15m", range: "1mo" };
  }
}

function aggregateCandles(candles: Candle[], hours: number): Candle[] {
  if (hours <= 1) return candles;

  const bucketMs = hours * 60 * 60 * 1000;
  const buckets = new Map<number, Candle>();

  for (const candle of candles) {
    const bucket = Math.floor(candle.time / bucketMs) * bucketMs;
    const existing = buckets.get(bucket);

    if (!existing) {
      buckets.set(bucket, {
        time: bucket,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

async function fetchYahooCandles(
  symbol: string,
  timeframe: string
): Promise<Candle[]> {
  const { interval, range } = yahooChartParams(timeframe);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Yahoo market data for ${symbol}`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];

  if (!result) {
    throw new Error(`Yahoo market data not available for ${symbol}`);
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0];

  if (!quote) {
    throw new Error(`Yahoo candles not available for ${symbol}`);
  }

  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = Number(quote.open?.[i]);
    const high = Number(quote.high?.[i]);
    const low = Number(quote.low?.[i]);
    const close = Number(quote.close?.[i]);
    const volume = Number(quote.volume?.[i] || 0);

    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    candles.push({
      time: Number(timestamps[i]) * 1000,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return timeframe === "4h" ? aggregateCandles(candles, 4) : candles;
}

// ======================================================
// GLOBAL STOCK MARKET — YAHOO FINANCE
// ======================================================
//
// Yahoo Finance uses the normal ticker for US/global stocks
// (for example AAPL, MSFT, NVDA, TSLA). Exchange suffixes can
// also be supplied by the caller when required, such as .L or .T.

export async function getGlobalStockMarketData(
  symbol = "AAPL",
  timeframe = "15m"
): Promise<MarketData> {
  const normalizedSymbol = symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    throw new Error("Global stock symbol is required");
  }

  const candles = await fetchYahooCandles(normalizedSymbol, timeframe);

  if (candles.length < 20) {
    throw new Error(
      `Not enough Global Stock candles for ${normalizedSymbol} at ${timeframe}`
    );
  }

  // Prefer the latest valid candle. Yahoo's regularMarketPrice may be stale
  // outside market hours, while the chart candle is aligned to the selected timeframe.
  const price = candles[candles.length - 1].close;

  return calculateMarketData(
    normalizedSymbol,
    price,
    candles,
    timeframe
  );
}

// ======================================================
// FOREX MARKET — YAHOO FINANCE
// ======================================================

const FOREX_SYMBOLS: Record<string, string> = {
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  USDCHF: "USDCHF=X",
  AUDUSD: "AUDUSD=X",
  USDCAD: "USDCAD=X",
  NZDUSD: "NZDUSD=X",
  EURGBP: "EURGBP=X",
  EURJPY: "EURJPY=X",
  GBPJPY: "GBPJPY=X",
  AUDJPY: "AUDJPY=X",
  EURCHF: "EURCHF=X",
  GBPCHF: "GBPCHF=X",
  AUDCAD: "AUDCAD=X",
  AUDCHF: "AUDCHF=X",
  AUDNZD: "AUDNZD=X",
  CADJPY: "CADJPY=X",
  CHFJPY: "CHFJPY=X",
  GBPAUD: "GBPAUD=X",
  GBPCAD: "GBPCAD=X",
  EURAUD: "EURAUD=X",
  EURCAD: "EURCAD=X",
  EURNZD: "EURNZD=X",
  GBPNZD: "GBPNZD=X",
  NZDCAD: "NZDCAD=X",
  NZDCHF: "NZDCHF=X",
  CADCHF: "CADCHF=X",
  USDSGD: "USDSGD=X",
  USDNOK: "USDNOK=X",
  USDSEK: "USDSEK=X",
  USDDKK: "USDDKK=X",
  USDPLN: "USDPLN=X",
  USDZAR: "USDZAR=X",
  USDTRY: "USDTRY=X",
  USDMXN: "USDMXN=X",
  USDHKD: "USDHKD=X",
  USDTHB: "USDTHB=X",
  EURPLN: "EURPLN=X",
  EURSEK: "EURSEK=X",
  EURTRY: "EURTRY=X",
  EURZAR: "EURZAR=X",
  GBPZAR: "GBPZAR=X",
  GBPTRY: "GBPTRY=X",
  GBPNOK: "GBPNOK=X",
  AUDSGD: "AUDSGD=X",
  AUDNOK: "AUDNOK=X",
  CADNOK: "CADNOK=X",
  NOKSEK: "NOKSEK=X",
  SEKJPY: "SEKJPY=X",
  USDINR: "USDINR=X",
};

export async function getForexMarketData(
  symbol = "EURUSD",
  timeframe = "15m"
): Promise<MarketData> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const yahooSymbol = FOREX_SYMBOLS[normalizedSymbol] || normalizedSymbol;
  const candles = await fetchYahooCandles(yahooSymbol, timeframe);

  if (candles.length < 20) {
    throw new Error(
      `Not enough Forex market candles for ${normalizedSymbol} at ${timeframe}`
    );
  }

  const price = candles[candles.length - 1].close;

  return calculateMarketData(
    normalizedSymbol,
    price,
    candles,
    timeframe
  );
}

// ======================================================
// INDIAN MARKET — YAHOO FINANCE
// ======================================================

const INDIAN_SYMBOLS: Record<
  string,
  string
> = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  SENSEX: "^BSESN",
};

export async function getIndianMarketData(
  symbol = "NIFTY",
  timeframe = "15m"
): Promise<MarketData> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const yahooSymbol = INDIAN_SYMBOLS[normalizedSymbol] || normalizedSymbol;
  const candles = await fetchYahooCandles(yahooSymbol, timeframe);

  if (candles.length < 20) {
    throw new Error(
      `Not enough Indian market candles for ${normalizedSymbol} at ${timeframe}`
    );
  }

  const price = candles[candles.length - 1].close;

  return calculateMarketData(
    normalizedSymbol,
    price,
    candles,
    timeframe
  );
}

// ======================================================
// STOCK FUNDAMENTALS + EARNINGS — YAHOO FINANCE
// ======================================================

export type StockFundamentals = {
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  eps: number | null;
  dividendYield: number | null;
  revenue: number | null;
  profitMargin: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
};


export type AnalystTargets = {
  targetLow: number | null;
  targetAverage: number | null;
  targetHigh: number | null;
  numberOfAnalysts: number | null;
  recommendation: string | null;
};

export type StockEarnings = {
  nextEarningsDate: string | null;
  lastEarningsDate: string | null;
  epsActual: number | null;
  epsEstimate: number | null;
  epsSurprisePercent: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
};

function yahooValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "raw" in value &&
    typeof (value as { raw?: unknown }).raw === "number"
  ) {
    const raw = (value as { raw: number }).raw;
    return Number.isFinite(raw) ? raw : null;
  }

  return null;
}

function yahooDate(value: unknown): string | null {
  const raw =
    value &&
    typeof value === "object" &&
    "raw" in value
      ? (value as { raw?: unknown }).raw
      : value;

  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Date(raw * 1000).toISOString().slice(0, 10);
  }

  if (typeof raw === "string" && raw.trim()) {
    return raw;
  }

  return null;
}

async function getYahooQuoteSummary(
  symbol: string,
  modules: string
) {
  const encodedSymbol = encodeURIComponent(symbol);
  const encodedModules = encodeURIComponent(modules);
  const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";

  try {
    // Yahoo's quoteSummary endpoint can require a session cookie + crumb.
    // Create a short-lived Yahoo session instead of assuming the endpoint is
    // anonymously accessible.
    const cookieResponse = await fetch("https://fc.yahoo.com/", {
      cache: "no-store",
      headers: { "User-Agent": userAgent },
    });

    const headersWithSetCookie = cookieResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };

    const setCookie =
      typeof headersWithSetCookie.getSetCookie === "function"
        ? headersWithSetCookie.getSetCookie()
        : [cookieResponse.headers.get("set-cookie") || ""];

    const cookieHeader = setCookie
      .flatMap((value) => value.split(/,(?=[^;,]+=)/))
      .map((cookie) => cookie.split(";", 1)[0].trim())
      .filter(Boolean)
      .join("; ");

    const crumbResponse = await fetch(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      {
        cache: "no-store",
        headers: {
          "User-Agent": userAgent,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      }
    );

    const crumb = (await crumbResponse.text()).trim();

    const query =
      `modules=${encodedModules}&formatted=true&lang=en-US&region=US` +
      (crumb ? `&crumb=${encodeURIComponent(crumb)}` : "");

    const hosts = [
      "https://query1.finance.yahoo.com",
      "https://query2.finance.yahoo.com",
    ];

    for (const host of hosts) {
      const url = `${host}/v10/finance/quoteSummary/${encodedSymbol}?${query}`;
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent": userAgent,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
      });

      if (!response.ok) continue;

      const data = await response.json();
      const result = data?.quoteSummary?.result?.[0];
      if (result) return result;
    }
  } catch (error) {
    console.error("Yahoo quoteSummary fetch error:", error);
  }

  return null;
}

export async function getStockFundamentals(
  symbol: string
): Promise<StockFundamentals | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const result = await getYahooQuoteSummary(
      normalized,
      "price,summaryDetail,defaultKeyStatistics,financialData,assetProfile"
    );

    if (!result) return null;

    const price = result.price || {};
    const detail = result.summaryDetail || {};
    const stats = result.defaultKeyStatistics || {};
    const financial = result.financialData || {};
    const profile = result.assetProfile || {};

    return {
      companyName: price.longName ?? price.shortName ?? null,
      sector: profile.sector ?? null,
      industry: profile.industry ?? null,
      marketCap: yahooValue(price.marketCap),
      peRatio: yahooValue(detail.trailingPE),
      forwardPE: yahooValue(detail.forwardPE),
      eps: yahooValue(stats.trailingEps),
      dividendYield: yahooValue(detail.dividendYield),
      revenue: yahooValue(financial.totalRevenue),
      profitMargin: yahooValue(financial.profitMargins),
      debtToEquity: yahooValue(financial.debtToEquity),
      returnOnEquity: yahooValue(financial.returnOnEquity),
    };
  } catch {
    return null;
  }
}

export async function getAnalystTargets(
  symbol: string
): Promise<AnalystTargets | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const result = await getYahooQuoteSummary(
      normalized,
      "financialData,summaryDetail"
    );

    if (!result) return null;

    const financial = result.financialData || {};
    const detail = result.summaryDetail || {};

    const targets: AnalystTargets = {
      targetLow: yahooValue(financial.targetLowPrice),
      targetAverage: yahooValue(financial.targetMeanPrice),
      targetHigh: yahooValue(financial.targetHighPrice),
      numberOfAnalysts:
        yahooValue(financial.numberOfAnalystOpinions) ??
        yahooValue(detail.numberOfAnalystOpinions),
      recommendation:
        typeof financial.recommendationKey === "string"
          ? financial.recommendationKey
          : null,
    };

    const hasData =
      targets.targetLow !== null ||
      targets.targetAverage !== null ||
      targets.targetHigh !== null ||
      targets.numberOfAnalysts !== null ||
      targets.recommendation !== null;

    return hasData ? targets : null;
  } catch {
    return null;
  }
}

export async function getStockEarnings(
  symbol: string
): Promise<StockEarnings | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const result = await getYahooQuoteSummary(
      normalized,
      "calendarEvents,earningsHistory,earningsTrend"
    );

    if (!result) return null;

    const calendar = result.calendarEvents || {};
    const history = Array.isArray(result.earningsHistory?.history)
      ? result.earningsHistory.history
      : [];

    const latest = history[0] || null;

    const earningsDates = Array.isArray(calendar.earnings?.earningsDate)
      ? calendar.earnings.earningsDate
      : [];

    const trends = Array.isArray(result.earningsTrend?.trend)
      ? result.earningsTrend.trend
      : [];

    const currentTrend =
      trends.find((item: { period?: string }) =>
        ["0q", "+1q"].includes(item.period || "")
      ) || trends[0] || null;

    return {
      nextEarningsDate: yahooDate(earningsDates[0]),
      lastEarningsDate: yahooDate(latest?.end),
      epsActual: yahooValue(latest?.epsActual),
      epsEstimate: yahooValue(latest?.epsEstimate),
      epsSurprisePercent: yahooValue(latest?.surprisePercent),
      revenueActual: null,
      revenueEstimate: yahooValue(
        currentTrend?.revenueEstimate?.avg
      ),
    };
  } catch {
    return null;
  }
}
