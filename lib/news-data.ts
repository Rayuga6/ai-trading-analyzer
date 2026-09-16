export type StockNewsItem = {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  summary: string;
  sentiment: "Positive" | "Neutral" | "Negative";
};

export type StockNews = {
  symbol: string;
  items: StockNewsItem[];
  sentiment: "Positive" | "Neutral" | "Negative" | "Not Available";
  score: number;
};

const POSITIVE_WORDS = [
  "beat", "beats", "growth", "upgrade", "upgraded", "surge", "surges",
  "rise", "rises", "strong", "profit", "profits", "record", "bullish",
  "positive", "outperform", "outperforms", "raise", "raises", "gain",
  "gains", "buy", "buys", "boost", "boosts", "optimistic", "success",
  "higher", "upside", "approval", "approved", "rebound", "recovery",
];

const NEGATIVE_WORDS = [
  "miss", "misses", "downgrade", "downgraded", "drop", "drops", "fall",
  "falls", "weak", "loss", "losses", "bearish", "negative", "underperform",
  "underperforms", "cut", "cuts", "warning", "lawsuit", "decline",
  "declines", "lower", "downside", "risk", "risks", "investigation",
  "recall", "layoffs", "layoff", "crash", "slump", "selloff",
];

function sentimentOf(text: string): StockNewsItem["sentiment"] {
  const value = text.toLowerCase();
  let score = 0;

  for (const word of POSITIVE_WORDS) {
    if (value.includes(word)) score += 1;
  }

  for (const word of NEGATIVE_WORDS) {
    if (value.includes(word)) score -= 1;
  }

  if (score > 0) return "Positive";
  if (score < 0) return "Negative";
  return "Neutral";
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: unknown): string {
  return normalize(value).replace(/\s+/g, "");
}

type NewsSearchProfile = {
  queries: string[];
  keywords: string[];
};

function getNewsProfile(symbol: string): NewsSearchProfile {
  const clean = symbol.trim().toUpperCase();

  // Global stock: keep company-specific search strict.
  if (/^[A-Z]{1,5}$/.test(clean)) {
    return {
      queries: [clean],
      keywords: [clean.toLowerCase()],
    };
  }

  // Indian indices.
  if (clean === "NIFTY" || clean === "NIFTY50") {
    return {
      queries: ["NIFTY 50", "Nifty 50 India"],
      keywords: ["nifty 50", "nifty50", "nifty"],
    };
  }

  if (clean === "BANKNIFTY" || clean === "NIFTYBANK") {
    return {
      queries: ["Bank Nifty", "Nifty Bank"],
      keywords: ["bank nifty", "nifty bank", "banknifty", "niftybank"],
    };
  }

  if (clean === "SENSEX" || clean === "BSESENSEX") {
    return {
      queries: ["Sensex", "BSE Sensex"],
      keywords: ["sensex", "bse sensex"],
    };
  }

  // Crypto symbols such as BTCUSDT, ETHUSDT.
  if (clean.endsWith("USDT") && clean.length > 4) {
    const base = clean.slice(0, -4);
    const names: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      BNB: "BNB",
      SOL: "Solana",
      XRP: "XRP",
      ADA: "Cardano",
      DOGE: "Dogecoin",
      AVAX: "Avalanche",
      DOT: "Polkadot",
      LINK: "Chainlink",
      LTC: "Litecoin",
      TRX: "TRON",
      SHIB: "Shiba Inu",
    };

    const name = names[base] ?? base;

    return {
      queries: [name, `${base} crypto`],
      keywords: [name.toLowerCase(), base.toLowerCase()],
    };
  }

  // Forex symbols such as EURUSD, GBPUSD, USDJPY.
  if (/^[A-Z]{6}$/.test(clean)) {
    const base = clean.slice(0, 3);
    const quote = clean.slice(3);

    const currencyNames: Record<string, string> = {
      USD: "US Dollar",
      EUR: "Euro",
      GBP: "British Pound",
      JPY: "Japanese Yen",
      AUD: "Australian Dollar",
      CAD: "Canadian Dollar",
      CHF: "Swiss Franc",
      NZD: "New Zealand Dollar",
      INR: "Indian Rupee",
      SGD: "Singapore Dollar",
      HKD: "Hong Kong Dollar",
    };

    const pair = `${currencyNames[base] ?? base} ${currencyNames[quote] ?? quote}`;

    return {
      queries: [`${base}${quote} forex`, `${pair} forex`],
      keywords: [
        `${base}${quote}`.toLowerCase(),
        `${base} ${quote}`.toLowerCase(),
        "forex",
        "foreign exchange",
      ],
    };
  }

  return {
    queries: [clean],
    keywords: [clean.toLowerCase()],
  };
}

async function yahooSearch(query: string) {
  const url =
    `https://query1.finance.yahoo.com/v1/finance/search` +
    `?q=${encodeURIComponent(query)}` +
    `&newsCount=25&quotesCount=5`;

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) return null;
  return response.json();
}

function isRelevant(
  item: any,
  symbol: string,
  profile: NewsSearchProfile
): boolean {
  const title = normalize(item?.title);
  const titleCompact = compact(item?.title);

  if (!title) return false;

  const relatedTickers = Array.isArray(item?.relatedTickers)
    ? item.relatedTickers.map((x: unknown) => String(x).toUpperCase())
    : [];

  // Strongest signal: Yahoo explicitly relates the article to this ticker.
  if (relatedTickers.includes(symbol.toUpperCase())) return true;

  // For market/crypto/forex profiles, require a keyword in the HEADLINE.
  // This prevents unrelated stories returned by Yahoo's broad search.
  for (const keyword of profile.keywords) {
    const normalizedKeyword = normalize(keyword);
    const keywordCompact = compact(keyword);

    if (
      (normalizedKeyword.length >= 4 && title.includes(normalizedKeyword)) ||
      (keywordCompact.length >= 4 && titleCompact.includes(keywordCompact))
    ) {
      return true;
    }
  }

  // Global stock fallback: ticker/company token in headline only.
  const ticker = symbol.toLowerCase();
  if (title.split(/\s+/).includes(ticker)) return true;

  return false;
}

function makeItem(item: any): StockNewsItem | null {
  const title = String(item?.title ?? "").trim();
  if (!title) return null;

  const publishedAt = item?.providerPublishTime
    ? new Date(Number(item.providerPublishTime) * 1000).toISOString()
    : "";

  return {
    title,
    publisher: String(item?.publisher ?? "Unknown"),
    link: String(item?.link ?? ""),
    publishedAt,
    // Sentiment is deliberately based on the headline only so a generic
    // summary cannot incorrectly change the article's label.
    summary: String(item?.summary ?? ""),
    sentiment: sentimentOf(title),
  };
}

function overallSentiment(items: StockNewsItem[]) {
  if (!items.length) {
    return { sentiment: "Not Available" as const, score: 50 };
  }

  let score = 0;

  for (const item of items) {
    if (item.sentiment === "Positive") score += 1;
    if (item.sentiment === "Negative") score -= 1;
  }

  if (score > 0) {
    return {
      sentiment: "Positive" as const,
      score: Math.min(100, 50 + score * 12.5),
    };
  }

  if (score < 0) {
    return {
      sentiment: "Negative" as const,
      score: Math.max(0, 50 + score * 12.5),
    };
  }

  return {
    sentiment: "Neutral" as const,
    score: 50,
  };
}

export async function getMarketNews(
  symbol: string
): Promise<StockNews | null> {
  try {
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) return null;

    const profile = getNewsProfile(cleanSymbol);

    // Search several market-specific queries in parallel.
    const results = await Promise.all(
      profile.queries.map((query) => yahooSearch(query))
    );

    const candidates = results.flatMap((data: any) =>
      Array.isArray(data?.news) ? data.news : []
    );

    const seen = new Set<string>();
    const items: StockNewsItem[] = [];

    for (const raw of candidates) {
      if (!isRelevant(raw, cleanSymbol, profile)) continue;

      const item = makeItem(raw);
      if (!item) continue;

      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      items.push(item);

      if (items.length >= 10) break;
    }

    items.sort((a, b) => {
      const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bTime - aTime;
    });

    const overall = overallSentiment(items);

    return {
      symbol: cleanSymbol,
      items,
      sentiment: overall.sentiment,
      score: Math.round(overall.score),
    };
  } catch (error) {
    console.error(`Market news fetch failed for ${symbol}:`, error);

    return {
      symbol: symbol.trim().toUpperCase(),
      items: [],
      sentiment: "Not Available",
      score: 50,
    };
  }
}
