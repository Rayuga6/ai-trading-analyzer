"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Analysis = {
  signal: "BUY" | "SELL" | "WAIT";
  trend: string;
  entry: string;
  stopLoss: string;
  tp1: string;
  tp2: string;
  tp3: string;
  confidence: number;
  riskReward: string;
  reason: string;
  bullishProbability: number;
  bullishTrigger: string;
  bullishTarget: string;
  bearishProbability: number;
bearishTrigger: string;
bearishTarget: string;
  emaConfirmation: string;
  rsiConfirmation: string;
  macdConfirmation: string;
  supertrendConfirmation: string;
  volumeConfirmation: string;
  selectedMarket?: string;
  selectedSymbol?: string;
  timeframe?: string;
  fundamentals?: {
    companyName?: string | null;
    sector?: string | null;
    industry?: string | null;
    marketCap?: number | null;
    peRatio?: number | null;
    forwardPE?: number | null;
    eps?: number | null;
    dividendYield?: number | null;
    revenue?: number | null;
    profitMargin?: number | null;
    debtToEquity?: number | null;
    returnOnEquity?: number | null;
  } | null;
  earnings?: {
    nextEarningsDate?: string | null;
    lastEarningsDate?: string | null;
    epsActual?: number | null;
    epsEstimate?: number | null;
    epsSurprisePercent?: number | null;
    revenueActual?: number | null;
    revenueEstimate?: number | null;
  } | null;
  analystTargets?: {
    targetLow?: number | null;
    targetAverage?: number | null;
    targetHigh?: number | null;
    numberOfAnalysts?: number | null;
    recommendation?: string | null;
  } | null;
  combinedAnalysis?: {
    score?: number | null;
    bias?: string | null;
    conclusion?: string | null;
  } | null;
  news?: Array<{
    headline?: string | null;
    source?: string | null;
    publishedAt?: string | null;
    summary?: string | null;
    sentiment?: "Positive" | "Neutral" | "Negative" | string | null;
  }> | null;
  newsSentiment?: {
    overall?: "Positive" | "Neutral" | "Negative" | string | null;
    score?: number | null;
    reason?: string | null;
  } | null;
};

const GLOBAL_STOCKS = [
  "AAPL",
  "ABBV",
  "ABNB",
  "ABT",
  "ACGL",
  "ACN",
  "ADBE",
  "ADI",
  "ADM",
  "ADP",
  "ADSK",
  "AEE",
  "AEP",
  "AES",
  "AFL",
  "AIG",
  "AIZ",
  "AJG",
  "AKAM",
  "ALB",
  "ALGN",
  "ALL",
  "ALLE",
  "AMAT",
  "AMCR",
  "AMD",
  "AME",
  "AMGN",
  "AMP",
  "AMT",
  "AMZN",
  "ANET",
  "ANSS",
  "AON",
  "AOS",
  "APA",
  "APD",
  "APH",
  "APO",
  "APP",
  "APTV",
  "ARE",
  "ARGX",
  "ARM",
  "ASH",
  "ASML",
  "ASO",
  "AVB",
  "AVGO",
  "AVY",
  "AWK",
  "AXON",
  "AXP",
  "AZO",
  "BA",
  "BAC",
  "BALL",
  "BAX",
  "BBWI",
  "BBY",
  "BDX",
  "BEN",
  "BF.B",
  "BG",
  "BKR",
  "BLDR",
  "BLK",
  "BMY",
  "BR",
  "BRK.B",
  "BRO",
  "BSX",
  "BWA",
  "BX",
  "BXP",
  "C",
  "CAG",
  "CAH",
  "CARR",
  "CAT",
  "CB",
  "CBOE",
  "CBRE",
  "CCI",
  "CCL",
  "CDNS",
  "CDW",
  "CE",
  "CFG",
  "CHTR",
  "CI",
  "CINF",
  "CL",
  "CLX",
  "CME",
  "CMG",
  "CMI",
  "CMS",
  "CNC",
  "CNP",
  "COF",
  "COIN",
  "COP",
  "COR",
  "COST",
  "CPAY",
  "CPB",
  "CPRT",
  "CPT",
  "CRL",
  "CRM",
  "CRWD",
  "CSCO",
  "CSGP",
  "CSX",
  "CTAS",
  "CTRA",
  "CTSH",
  "CTVA",
  "CVNA",
  "CVX",
  "CVS",
  "CW",
  "D",
  "DAKT",
  "DAL",
  "DASH",
  "DAY",
  "DE",
  "DECK",
  "DEFI",
  "DELL",
  "DG",
  "DHI",
  "DHR",
  "DIS",
  "DLR",
  "DLTR",
  "DOCU",
  "DOV",
  "DOW",
  "DPZ",
  "DRI",
  "DTE",
  "DUK",
  "DUOL",
  "DVN",
  "DXCM",
  "EA",
  "EBAY",
  "ECL",
  "ED",
  "EIX",
  "EL",
  "ELF",
  "EMN",
  "EMR",
  "ENPH",
  "EOG",
  "EPAM",
  "EQIX",
  "EQR",
  "EQT",
  "ERIE",
  "ES",
  "ESS",
  "ETN",
  "ETR",
  "ETSY",
  "EVRG",
  "EW",
  "EXC",
  "EXPD",
  "EXPE",
  "EXR",
  "F",
  "FANG",
  "FAST",
  "FCX",
  "FDS",
  "FDX",
  "FE",
  "FFIV",
  "FI",
  "FICO",
  "FITB",
  "FIVE",
  "FL",
  "FLR",
  "FLS",
  "FMC",
  "FOX",
  "FOXA",
  "FRT",
  "FSLR",
  "FTNT",
  "FTV",
  "GD",
  "GDDY",
  "GE",
  "GEV",
  "GILD",
  "GIS",
  "GL",
  "GLW",
  "GM",
  "GNRC",
  "GOOG",
  "GOOGL",
  "GPC",
  "GPN",
  "GRMN",
  "GS",
  "GWW",
  "HAL",
  "HAS",
  "HBAN",
  "HCA",
  "HD",
  "HES",
  "HIG",
  "HII",
  "HLT",
  "HOLX",
  "HON",
  "HOOD",
  "HPQ",
  "HRL",
  "HSIC",
  "HST",
  "HSY",
  "HUBB",
  "HUBS",
  "HUM",
  "HWM",
  "IBM",
  "ICE",
  "IDXX",
  "IEX",
  "IFF",
  "ILMN",
  "INCY",
  "INTC",
  "INTU",
  "INVH",
  "IP",
  "IPG",
  "IQV",
  "IR",
  "IRM",
  "ISRG",
  "IT",
  "ITW",
  "IVZ",
  "J",
  "JBHT",
  "JCI",
  "JKHY",
  "JNJ",
  "JNPR",
  "JPM",
  "K",
  "KDP",
  "KEY",
  "KEYS",
  "KHC",
  "KIM",
  "KKR",
  "KLAC",
  "KMB",
  "KMI",
  "KMX",
  "KO",
  "KR",
  "KVUE",
  "L",
  "LHX",
  "LH",
  "LEN",
  "LEN.B",
  "LII",
  "LIN",
  "LKQ",
  "LLY",
  "LMT",
  "LNC",
  "LOW",
  "LPLA",
  "LRCX",
  "LVS",
  "LW",
  "LYB",
  "LYV",
  "MA",
  "MAA",
  "MAR",
  "MAS",
  "MCD",
  "MCHP",
  "MCK",
  "MCO",
  "MDLZ",
  "MDT",
  "MET",
  "META",
  "MGM",
  "MHK",
  "MKC",
  "MKTX",
  "MLM",
  "MMC",
  "MMM",
  "MNST",
  "MO",
  "MOH",
  "MOS",
  "MPC",
  "MPWR",
  "MRK",
  "MRNA",
  "MS",
  "MSFT",
  "MSI",
  "MTB",
  "MTCH",
  "MTN",
  "MU",
  "NCLH",
  "NDAQ",
  "NDSN",
  "NEE",
  "NEM",
  "NFLX",
  "NI",
  "NKE",
  "NOC",
  "NOW",
  "NRG",
  "NSC",
  "NTAP",
  "NTRS",
  "NUE",
  "NVDA",
  "NVR",
  "NVS",
  "NWL",
  "NWS",
  "NWSA",
  "NXPI",
  "O",
  "ODFL",
  "OKE",
  "OMC",
  "ON",
  "ONON",
  "ORCL",
  "ORLY",
  "OTIS",
  "OXY",
  "PANW",
  "PARA",
  "PAYC",
  "PAYX",
  "PCAR",
  "PCG",
  "PEG",
  "PEP",
  "PFE",
  "PFG",
  "PG",
  "PGR",
  "PH",
  "PHM",
  "PKG",
  "PLD",
  "PLTR",
  "PM",
  "PNC",
  "PNR",
  "PNW",
  "PODD",
  "POOL",
  "PPG",
  "PPL",
  "PRU",
  "PSA",
  "PSX",
  "PTC",
  "PWR",
  "PYPL",
  "QCOM",
  "QRVO",
  "RCL",
  "REG",
  "REGN",
  "RF",
  "RHI",
  "RJF",
  "RL",
  "RMD",
  "ROK",
  "ROL",
  "ROP",
  "ROST",
  "RSG",
  "RTX",
  "SBUX",
  "SCHW",
  "SHW",
  "SJM",
  "SLB",
  "SMCI",
  "SNA",
  "SNPS",
  "SO",
  "SPG",
  "SPGI",
  "SRE",
  "STE",
  "STLD",
  "STT",
  "STX",
  "STZ",
  "SWK",
  "SWKS",
  "SYF",
  "SYK",
  "SYY",
  "T",
  "TAP",
  "TDG",
  "TDY",
  "TECH",
  "TEL",
  "TFC",
  "TGT",
  "TJX",
  "TKO",
  "TMO",
  "TMUS",
  "TPR",
  "TRGP",
  "TROW",
  "TRV",
  "TSCO",
  "TSLA",
  "TSN",
  "TT",
  "TTWO",
  "TXN",
  "TXT",
  "UBER",
  "UDR",
  "UHS",
  "ULTA",
  "UNH",
  "UNP",
  "UPS",
  "URI",
  "USB",
  "V",
  "VFC",
  "VICI",
  "VLO",
  "VMC",
  "VRSK",
  "VRSN",
  "VRTX",
  "VST",
  "VTR",
  "VTRS",
  "VZ",
  "WAB",
  "WAT",
  "WBA",
  "WBD",
  "WDC",
  "WEC",
  "WELL",
  "WFC",
  "WHR",
  "WM",
  "WMB",
  "WMT",
  "WRB",
  "WST",
  "WTW",
  "WY",
  "WYNN",
  "XEL",
  "XOM",
  "XYL",
  "YUM",
  "ZBRA",
  "ZBH",
  "ZTS",
  "ACAD",
  "AAL",
  "AAON",
  "AAP",
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [tradingStyle, setTradingStyle] = useState<
  "Scalping" | "Day Trading" | "Swing" | "Long Term"
>("Scalping");
  const [analysisMode, setAnalysisMode] = useState<"live" | "chart">("chart");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [cryptoSymbol, setCryptoSymbol] = useState("");
  const [showCryptoSelector, setShowCryptoSelector] = useState(false);
  const [indianSymbol, setIndianSymbol] = useState("");
  const [showIndianSelector, setShowIndianSelector] = useState(false);
  const [forexSymbol, setForexSymbol] = useState("");
  const [showForexSelector, setShowForexSelector] = useState(false);
  const [stockSymbol, setStockSymbol] = useState("");
  const [showStockSelector, setShowStockSelector] = useState(false);
  const [stockSearch, setStockSearch] = useState("");
  const [forexSearch, setForexSearch] = useState("");
  const [timeframe, setTimeframe] = useState("15m");
  const marketSectionRef = useRef<HTMLDivElement | null>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.assign("/login?redirect=/");
      return;
    }

    if (analysisMode === "live" && !selectedMarket) {
      alert("Please select a market first for Live Data Analysis.");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      alert("Please select a chart image.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10 MB.");
      return;
    }

    setFile(selectedFile);
    setAnalysis(null);
  }

  function chooseLiveAnalysis() {
    setAnalysisMode("live");
    setFile(null);
    setAnalysis(null);
    setTimeout(() => {
      marketSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  function chooseChartOnlyAnalysis() {
    setAnalysisMode("chart");
    setSelectedMarket("");
    setIndianSymbol("");
    setCryptoSymbol("");
    setForexSymbol("");
    setStockSymbol("");
    setFile(null);
    setAnalysis(null);
    setShowIndianSelector(false);
    setShowCryptoSelector(false);
    setShowForexSelector(false);
    setShowStockSelector(false);
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  function selectIndianMarket(symbol: string) {
    setIndianSymbol(symbol);
    setCryptoSymbol("");
    setForexSymbol("");
    setStockSymbol("");
    setSelectedMarket(symbol);
    setShowIndianSelector(false);
    setShowCryptoSelector(false);
    setShowForexSelector(false);
    setShowStockSelector(false);
    setFile(null);
    setAnalysis(null);
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  function selectForexMarket(symbol: string) {
    setForexSymbol(symbol);
    setCryptoSymbol("");
    setIndianSymbol("");
    setStockSymbol("");
    setSelectedMarket(symbol);
    setShowForexSelector(false);
    setShowCryptoSelector(false);
    setShowIndianSelector(false);
    setShowStockSelector(false);
    setFile(null);
    setAnalysis(null);
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  function selectStockMarket(symbol: string) {
    setStockSymbol(symbol);
    setCryptoSymbol("");
    setIndianSymbol("");
    setForexSymbol("");
    setSelectedMarket(symbol);
    setShowStockSelector(false);
    setShowCryptoSelector(false);
    setShowIndianSelector(false);
    setShowForexSelector(false);
    setFile(null);
    setAnalysis(null);
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  function selectCryptoMarket(symbol: string) {
    setCryptoSymbol(symbol);
    setIndianSymbol("");
    setForexSymbol("");
    setStockSymbol("");
    setSelectedMarket(symbol);
    setShowCryptoSelector(false);
    setShowIndianSelector(false);
    setShowForexSelector(false);
    setShowStockSelector(false);
    setFile(null);
    setAnalysis(null);
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
  }

  async function analyzeChart() {
    if (analysisMode === "live" && !selectedMarket) {
      alert("Please select a market first for Live Data Analysis.");
      chooseLiveAnalysis();
      return;
    }

    if (!file) {
      alert("Please select a chart image first.");
      return;
    }

  setAnalyzing(true);
  setAnalysis(null);

  try {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("analysisMode", analysisMode);
    formData.append("tradingStyle", tradingStyle);
    formData.append("selectedMarket", selectedMarket);
    formData.append("cryptoSymbol", cryptoSymbol);
    formData.append("indianSymbol", indianSymbol);
    formData.append("forexSymbol", forexSymbol);
    formData.append("stockSymbol", stockSymbol);
    formData.append("timeframe", timeframe);
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        "Server returned an unexpected response. Please try again."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error || "AI analysis failed. Please try again."
      );
    }

    if (!data || typeof data !== "object") {
      throw new Error("AI returned an invalid analysis.");
    }

    setAnalysis(data);
  } catch (error) {
    console.error("Analysis error:", error);

    alert(
      error instanceof Error
        ? error.message
        : "Unable to analyze the chart. Please try again."
    );
  } finally {
    setAnalyzing(false);
  }
}

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#090e19]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              AI<span className="text-cyan-400">Trade</span> Analyzer
            </h1>

            <p className="text-xs text-slate-400">
              AI-Powered Chart Analysis
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.assign("/pricing")}
              className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5 md:block"
            >
              Pricing
            </button>

            <button
              type="button"
              onClick={() => window.location.assign("/login?redirect=/")}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-5 pb-16 pt-12 md:px-8 md:pt-16">
        {/* Hero */}
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            ✦ AI Chart Intelligence
          </div>

          <h2 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Turn Any Trading Chart Into
            <span className="block text-cyan-400">
              Actionable AI Analysis
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            Upload a TradingView, Binance or other trading chart screenshot.
            Get trend, entry zone, stop loss, targets, support, resistance
            and AI confidence.
          </p>
        </div>

        {/* Analysis Mode + Upload */}
        <div ref={uploadSectionRef} className="mx-auto mt-10 max-w-5xl">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={chooseLiveAnalysis}
              className={`rounded-2xl border p-5 text-left transition ${
                analysisMode === "live"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-white/10 bg-[#0d1422] hover:border-cyan-400/40"
              }`}
            >
              <p className="text-lg font-bold text-cyan-300">
                ⚡ Live Data Analysis
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Select your market first. AI will validate the chart with the
                selected market's available market data.
              </p>
            </button>

            <button
              type="button"
              onClick={chooseChartOnlyAnalysis}
              className={`rounded-2xl border p-5 text-left transition ${
                analysisMode === "chart"
                  ? "border-cyan-400 bg-cyan-400/10"
                  : "border-white/10 bg-[#0d1422] hover:border-cyan-400/40"
              }`}
            >
              <p className="text-lg font-bold text-slate-200">
                🖼️ Chart-Only Analysis
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Upload a chart without selecting a market. Analysis is based
                only on the chart image.
              </p>
            </button>
          </div>

          {analysisMode === "live" && !selectedMarket && (
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-center text-sm text-yellow-300">
              ⚠️ Please select a market below before uploading your chart.
            </div>
          )}

          {analysisMode === "live" && selectedMarket && (
            <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-400/5 p-4 text-center text-sm text-green-300">
              ✓ Selected market: <strong>{selectedMarket}</strong>. You can now
              upload its chart.
            </div>
          )}

          <label
            htmlFor="chart-upload"
            className={`mt-5 block rounded-3xl border border-dashed p-5 md:p-8 ${
              analysisMode === "live" && !selectedMarket
                ? "cursor-not-allowed border-white/10 bg-[#0d1422]/60 opacity-60"
                : "cursor-pointer border-cyan-400/30 bg-[#0d1422] transition hover:border-cyan-400/60"
            }`}
          >
            <input
              id="chart-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={analysisMode === "live" && !selectedMarket}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!preview ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-400/10 text-4xl text-cyan-400">
                  ↑
                </div>

                <h3 className="text-2xl font-semibold">
                  {analysisMode === "live" && !selectedMarket
                    ? "Select Market First"
                    : "Upload Your Chart"}
                </h3>

                <p className="mt-3 max-w-md text-slate-400">
                  {analysisMode === "live" && !selectedMarket
                    ? "Choose Live Data Analysis and select a market below before uploading."
                    : "Drag & drop your screenshot here, or click to browse from your computer."}
                </p>

                <div className="mt-7 rounded-xl bg-cyan-400 px-7 py-3 font-semibold text-slate-950">
                  {analysisMode === "live" && !selectedMarket
                    ? "Market Selection Required"
                    : "Choose Chart Image"}
                </div>

                <p className="mt-5 text-xs text-slate-500">
                  PNG, JPG or WEBP • Maximum 10 MB
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <img
                    src={preview}
                    alt="Uploaded trading chart"
                    className="mx-auto max-h-[650px] w-full object-contain"
                  />
                </div>

                <p className="mt-4 text-sm text-green-400">
                  ✓ {file?.name}
                </p>
              </div>
            )}
          </label>

          {/* Analyze button */}
          {file && (
            <>
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-300">
                  Trading Style
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Select your preferred trading style
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {(["Scalping", "Day Trading", "Swing", "Long Term"] as const).map(
                    (style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setTradingStyle(style)}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          tradingStyle === style
                            ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/40"
                        }`}
                      >
                        {style}
                      </button>
                    )
                  )}
                </div>
              </div>

              <button
                onClick={analyzeChart}
                disabled={analyzing}
                className="mt-5 w-full rounded-2xl bg-cyan-400 px-6 py-4 text-lg font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    Analyzing Chart...
                  </span>
                ) : (
                  "✦ Analyze Chart"
                )}
              </button>
            </>
          )}
        </div>

      {/* Professional Analysis Report */}
{analysis && (
  <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d1422] shadow-2xl">

    {/* Report Header */}
    <div className="border-b border-white/10 bg-white/[0.02] p-5 md:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Professional AI Analysis
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Trading decision based on chart structure, indicators and live market data.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div
            className={`rounded-2xl border px-6 py-4 text-center ${
              analysis.signal === "BUY"
                ? "border-green-400/30 bg-green-400/10"
                : analysis.signal === "SELL"
                  ? "border-red-400/30 bg-red-400/10"
                  : "border-yellow-400/30 bg-yellow-400/10"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Signal
            </p>

            <p
              className={`mt-1 text-3xl font-bold ${
                analysis.signal === "BUY"
                  ? "text-green-400"
                  : analysis.signal === "SELL"
                    ? "text-red-400"
                    : "text-yellow-400"
              }`}
            >
              {analysis.signal}
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-6 py-4 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Confidence
            </p>

            <p className="mt-1 text-3xl font-bold text-cyan-400">
              {analysis.confidence}%
            </p>
          </div>
        </div>

      </div>
    </div>

    {/* Trade Plan */}
    <div className="p-5 md:p-7">
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-200">
          Trade Plan
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Key levels and risk/reward structure
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ResultBox title="Trend" value={analysis.trend} />
        <ResultBox title="Entry Zone" value={analysis.entry} />
        <ResultBox title="Stop Loss" value={analysis.stopLoss} />
        <ResultBox title="Risk / Reward" value={analysis.riskReward} />
        <ResultBox title="TP1" value={analysis.tp1} />
        <ResultBox title="TP2" value={analysis.tp2} />
        <ResultBox title="TP3" value={analysis.tp3} />
      </div>

      {/* Bullish Scenario */}
      <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/5 p-5">
        <p className="text-sm font-semibold text-green-300">
          Bullish Scenario
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ResultBox
            compact
            title="Probability"
            value={`${analysis.bullishProbability}%`}
          />

          <ResultBox
            title="Trigger"
            value={analysis.bullishTrigger}
          />

          <ResultBox
            compact
            title="Target"
            value={analysis.bullishTarget}
          />
        </div>
      </div>

      {/* Bearish Scenario */}
      <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
        <p className="text-sm font-semibold text-red-300">
          Bearish Scenario
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ResultBox
            compact
            title="Probability"
            value={`${analysis.bearishProbability}%`}
          />

          <ResultBox
            title="Trigger"
            value={analysis.bearishTrigger}
          />

          <ResultBox
            compact
            title="Target"
            value={analysis.bearishTarget}
          />
        </div>
      </div>

      {/* Technical Confirmation */}
      <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
        <p className="text-sm font-semibold text-cyan-300">
          Technical Confirmation
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <ResultBox
            title="EMA 7/25/99"
            value={analysis.emaConfirmation}
          />

          <ResultBox
            title="RSI"
            value={analysis.rsiConfirmation}
          />

          <ResultBox
            title="MACD"
            value={analysis.macdConfirmation}
          />

          <ResultBox
            title="Supertrend"
            value={analysis.supertrendConfirmation}
          />

          <ResultBox
            title="Volume"
            value={analysis.volumeConfirmation}
          />
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
        <p className="text-sm font-semibold text-yellow-300">
          AI Reasoning
        </p>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          {analysis.reason}
        </p>
      </div>

      {/* Step 37 — Stock Fundamentals */}
      {analysis.fundamentals && (
        <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cyan-300">
                Stock Fundamentals
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {analysis.fundamentals.companyName || analysis.selectedSymbol}
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {analysis.selectedSymbol}
            </span>
          </div>

          <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ResultBox compact title="Sector" value={analysis.fundamentals.sector || "Not available"} />
            <ResultBox compact title="Industry" value={analysis.fundamentals.industry || "Not available"} />
            <ResultBox compact title="Market Cap" value={formatFinancialValue(analysis.fundamentals.marketCap)} />
            <ResultBox compact title="P/E Ratio" value={formatNumber(analysis.fundamentals.peRatio)} />
            <ResultBox compact title="Forward P/E" value={formatNumber(analysis.fundamentals.forwardPE)} />
            <ResultBox compact title="EPS" value={formatNumber(analysis.fundamentals.eps)} />
            <ResultBox compact title="Dividend Yield" value={formatPercent(analysis.fundamentals.dividendYield)} />
            <ResultBox compact title="Revenue" value={formatFinancialValue(analysis.fundamentals.revenue)} />
            <ResultBox compact title="Profit Margin" value={formatPercent(analysis.fundamentals.profitMargin)} />
            <ResultBox compact title="Debt / Equity" value={formatNumber(analysis.fundamentals.debtToEquity)} />
            <ResultBox compact title="Return on Equity" value={formatPercent(analysis.fundamentals.returnOnEquity)} />
          </div>
        </div>
      )}

      {/* Step 38 — Earnings Information */}
      {analysis.earnings && (
        <div className="mt-6 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-300">
                Earnings Information
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Latest reported earnings and upcoming earnings information.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {analysis.selectedSymbol}
            </span>
          </div>

          <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ResultBox compact title="Last Earnings Date" value={analysis.earnings.lastEarningsDate || "Not available"} />
            <ResultBox compact title="Next Earnings Date" value={analysis.earnings.nextEarningsDate || "Not available"} />
            <ResultBox compact title="EPS Actual" value={formatNumber(analysis.earnings.epsActual)} />
            <ResultBox compact title="EPS Estimate" value={formatNumber(analysis.earnings.epsEstimate)} />
            <ResultBox compact title="EPS Surprise" value={formatPercent(analysis.earnings.epsSurprisePercent)} />
            <ResultBox compact title="Revenue Actual" value={formatFinancialValue(analysis.earnings.revenueActual)} />
            <ResultBox compact title="Revenue Estimate" value={formatFinancialValue(analysis.earnings.revenueEstimate)} />
          </div>
        </div>
      )}

      {/* Step 39 — Analyst Targets */}
      {analysis.analystTargets && analysis.fundamentals && (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-300">Analyst Targets</p>
              <p className="mt-1 text-xs text-slate-500">
                Wall Street analyst price targets and consensus.
              </p>
            </div>
            <span className="text-xs text-slate-500">{analysis.selectedSymbol}</span>
          </div>

          <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ResultBox compact title="Target Low" value={formatPrice(analysis.analystTargets.targetLow)} />
            <ResultBox compact title="Target Average" value={formatPrice(analysis.analystTargets.targetAverage)} />
            <ResultBox compact title="Target High" value={formatPrice(analysis.analystTargets.targetHigh)} />
            <ResultBox compact title="Analysts" value={formatNumber(analysis.analystTargets.numberOfAnalysts)} />
            <ResultBox compact title="Recommendation" value={analysis.analystTargets.recommendation || "Not available"} />
          </div>
        </div>
      )}

      {/* Step 40 — Fundamental + Technical Combined Analysis */}
      {analysis.combinedAnalysis && analysis.fundamentals && (
        <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
          <p className="text-sm font-semibold text-emerald-300">
            Fundamental + Technical Combined Analysis
          </p>
          <p className="mt-1 text-xs text-slate-500">
            AI combines the technical chart analysis with global stock fundamentals.
          </p>

          <div className="mt-4 grid items-start gap-4 sm:grid-cols-3">
            <ResultBox
              compact
              title="Combined Score"
              value={
                analysis.combinedAnalysis.score != null
                  ? `${analysis.combinedAnalysis.score}/100`
                  : "Not available"
              }
            />
            <ResultBox
              compact
              title="Combined Bias"
              value={analysis.combinedAnalysis.bias || "Not available"}
            />
            <ResultBox
              compact
              title="AI Conclusion"
              value={analysis.combinedAnalysis.conclusion || "Not available"}
            />
          </div>
        </div>
      )}

      {/* Step 41 + 42 — News Analysis & News Sentiment */}
      {analysis.selectedSymbol && (analysis.news || analysis.newsSentiment) && (
        <div className="mt-6 rounded-2xl border border-blue-400/20 bg-blue-400/5 p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-300">News Analysis</p>
              <p className="mt-1 text-xs text-slate-500">
                Important recent company or market news with AI sentiment.
              </p>
            </div>
            <span className="text-xs text-slate-500">{analysis.selectedSymbol}</span>
          </div>

          {analysis.newsSentiment && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-slate-200">
                  Overall News Sentiment
                </span>
                <SentimentBadge sentiment={analysis.newsSentiment.overall} />
                {analysis.newsSentiment.score != null && (
                  <span className="text-xs text-slate-500">
                    Score: {analysis.newsSentiment.score}/100
                  </span>
                )}
              </div>
              {analysis.newsSentiment.reason && (
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {analysis.newsSentiment.reason}
                </p>
              )}
            </div>
          )}

          {analysis.news && analysis.news.length > 0 ? (
            <div className="mt-4 space-y-3">
              {analysis.news.map((item, index) => (
                <div
                  key={`${item.headline || "news"}-${index}`}
                  className="rounded-xl border border-white/10 bg-[#0a101c] p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100">
                        {item.headline || "News item"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.source || "Unknown source"}
                        {item.publishedAt ? ` • ${item.publishedAt}` : ""}
                      </p>
                    </div>
                    <SentimentBadge sentiment={item.sentiment} />
                  </div>
                  {item.summary && (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {item.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No recent news is currently available.
            </p>
          )}
        </div>
      )}

    </div>
  </div>
)}
        {/* Features */}
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Feature
            icon="↗"
            title="Trend Detection"
            text="Identify bullish, bearish and sideways market structure."
          />

          <Feature
            icon="◎"
            title="Entry + Risk"
            text="Calculate entry zones, stop loss and risk/reward."
          />

          <Feature
            icon="◆"
            title="Smart Targets"
            text="Generate TP1, TP2 and TP3 from market structure."
          />
        </div>

        {/* Markets */}
        <div ref={marketSectionRef} className="mt-12 rounded-3xl border border-white/10 bg-[#0d1422] p-6 md:p-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Live Market Selection
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Select the exact market whose chart you are going to upload.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
              <Market
                name="NIFTY"
                active={selectedMarket === "NIFTY"}
                onIndianClick={selectIndianMarket}
              />
              <Market
                name="BANKNIFTY"
                active={selectedMarket === "BANKNIFTY"}
                onIndianClick={selectIndianMarket}
              />
              <Market
                name="SENSEX"
                active={selectedMarket === "SENSEX"}
                onIndianClick={selectIndianMarket}
              />
              <Market
                name="Stocks"
                active={Boolean(stockSymbol) && selectedMarket === stockSymbol}
                onStockClick={() => {
                  setStockSearch("");
                  setShowStockSelector(true);
                }}
              />
              <Market
                name="Forex"
                active={Boolean(forexSymbol) && selectedMarket === forexSymbol}
                onForexClick={() => setShowForexSelector(true)}
              />
              <Market
                name="Crypto"
                active={Boolean(cryptoSymbol) && selectedMarket === cryptoSymbol}
                onCryptoClick={() => setShowCryptoSelector(true)}
              />
            </div>

            {selectedMarket && analysisMode === "live" && (
              <>
              <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-center text-sm text-cyan-300">
                Selected for Live Data: <strong>{selectedMarket}</strong>
                <span className="mx-2 text-slate-500">•</span>
                Timeframe: <strong>{timeframe}</strong>
              </div>

              {/* Step 36 — Timeframe Selection */}
              <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5">
                <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-200">
                      Select Timeframe
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      AI will use this timeframe for live market-data calculations.
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                    Selected: {timeframe}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
                  {["1m", "5m", "15m", "30m", "1h", "4h", "1d"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setTimeframe(value);
                        setAnalysis(null);
                      }}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        timeframe === value
                          ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                          : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-400/40"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              </>
            )}

            {showIndianSelector && (
              <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-slate-200">
                  Select Indian Market
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-3">
                  {["NIFTY", "BANKNIFTY", "SENSEX"].map((symbol) => (
                    <button
                      key={symbol}
                      type="button"
                      onClick={() => selectIndianMarket(symbol)}
                      className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                        selectedMarket === symbol
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                          : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-400/40"
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showStockSelector && (
              <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5">
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-200">
                      Select Global Stock
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      500 global stock symbols • Search by ticker
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                    {GLOBAL_STOCKS.length} Stocks
                  </span>
                </div>

                <input
                  type="text"
                  value={stockSearch}
                  onChange={(event) => setStockSearch(event.target.value)}
                  placeholder="Search stock ticker e.g. AAPL, TSLA, NVDA"
                  className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                />

                <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-white/5 bg-black/10 p-3">
                  <div className="flex flex-wrap justify-center gap-2">
                    {GLOBAL_STOCKS
                      .filter((symbol) =>
                        symbol.toLowerCase().includes(stockSearch.trim().toLowerCase())
                      )
                      .map((symbol) => (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => {
                            setStockSearch("");
                            selectStockMarket(symbol);
                          }}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                            selectedMarket === symbol
                              ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                              : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-400/40"
                          }`}
                        >
                          {symbol}
                        </button>
                      ))}
                  </div>

                  {GLOBAL_STOCKS.filter((symbol) =>
                    symbol.toLowerCase().includes(stockSearch.trim().toLowerCase())
                  ).length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No stock found. Try another ticker.
                    </p>
                  )}
                </div>
              </div>
            )}

            {showForexSelector && (
              <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5">
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-200">
                      Select Forex Market
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      50 forex pairs • Search by currency pair
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-xs text-cyan-300">
                    50 Pairs
                  </span>
                </div>

                <input
                  type="text"
                  value={forexSearch}
                  onChange={(event) => setForexSearch(event.target.value)}
                  placeholder="Search forex pair e.g. EURUSD, GBPJPY, USDINR"
                  className="mt-4 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                />

                <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-white/5 bg-black/10 p-3">
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
                      "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURCHF",
                      "GBPCHF", "AUDCAD", "AUDCHF", "AUDNZD", "CADJPY", "CHFJPY",
                      "GBPAUD", "GBPCAD", "EURAUD", "EURCAD", "EURNZD", "GBPNZD",
                      "NZDCAD", "NZDCHF", "CADCHF", "USDSGD", "USDNOK", "USDSEK",
                      "USDDKK", "USDPLN", "USDZAR", "USDTRY", "USDMXN", "USDHKD",
                      "USDTHB", "EURPLN", "EURSEK", "EURTRY", "EURZAR", "GBPZAR",
                      "GBPTRY", "GBPNOK", "AUDSGD", "AUDNOK", "CADNOK", "NOKSEK",
                      "SEKJPY", "USDINR",
                    ]
                      .filter((symbol) =>
                        symbol.toLowerCase().includes(forexSearch.trim().toLowerCase())
                      )
                      .map((symbol) => (
                        <button
                          key={symbol}
                          type="button"
                          onClick={() => {
                            setForexSearch("");
                            selectForexMarket(symbol);
                          }}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                            selectedMarket === symbol
                              ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                              : "border-white/10 bg-black/20 text-slate-300 hover:border-cyan-400/40"
                          }`}
                        >
                          {symbol}
                        </button>
                      ))}
                  </div>

                  {[
                    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD",
                    "NZDUSD", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "EURCHF",
                    "GBPCHF", "AUDCAD", "AUDCHF", "AUDNZD", "CADJPY", "CHFJPY",
                    "GBPAUD", "GBPCAD", "EURAUD", "EURCAD", "EURNZD", "GBPNZD",
                    "NZDCAD", "NZDCHF", "CADCHF", "USDSGD", "USDNOK", "USDSEK",
                    "USDDKK", "USDPLN", "USDZAR", "USDTRY", "USDMXN", "USDHKD",
                    "USDTHB", "EURPLN", "EURSEK", "EURTRY", "EURZAR", "GBPZAR",
                    "GBPTRY", "GBPNOK", "AUDSGD", "AUDNOK", "CADNOK", "NOKSEK",
                    "SEKJPY", "USDINR",
                  ].filter((symbol) =>
                    symbol.toLowerCase().includes(forexSearch.trim().toLowerCase())
                  ).length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No forex pair found. Try another pair.
                    </p>
                  )}
                </div>
              </div>
            )}

            {showCryptoSelector && (
              <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-white/[0.03] p-5">
                <p className="text-sm font-semibold text-slate-200">
                  Select Crypto
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={cryptoSymbol}
                    onChange={(e) => setCryptoSymbol(e.target.value.toUpperCase())}
                    placeholder="Enter symbol e.g. LTCUSDT"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = cryptoSymbol.trim().toUpperCase();
                      if (!value) {
                        alert("Please enter a crypto symbol");
                        return;
                      }
                      const symbol = value.endsWith("USDT") ? value : `${value}USDT`;
                      selectCryptoMarket(symbol);
                    }}
                    className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-black"
                  >
                    Select
                  </button>
                </div>
              </div>
            )}

            {analysisMode === "live" && selectedMarket && (
              <p className="mt-5 text-xs leading-5 text-yellow-400/80">
                ⚠️ Important: upload the chart of <strong>{selectedMarket}</strong>.
                If the chart belongs to another market, the server should reject
                the analysis instead of treating it as the selected market.
              </p>
            )}
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-6 text-slate-500">
          AITrade Analyzer provides technical analysis for informational and
          educational purposes only. It does not guarantee profits or future
          market performance.
        </p>
      </section>
    </main>
  );
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }
  return `${Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
}

function formatFinancialValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Not available";
  }

  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (absolute >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (absolute >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (absolute >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPrice(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
}

function SentimentBadge({
  sentiment,
}: {
  sentiment?: string | null;
}) {
  const normalized = (sentiment || "Neutral").toLowerCase();

  if (normalized.includes("positive")) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
        🟢 Positive
      </span>
    );
  }

  if (normalized.includes("negative")) {
    return (
      <span className="inline-flex w-fit items-center gap-1 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-300">
        🔴 Negative
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-xs font-medium text-yellow-300">
      🟡 Neutral
    </span>
  );
}

function ResultBox({
  title,
  value,
  compact = false,
}: {
  title: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${
        compact ? "h-[108px] overflow-y-auto p-4" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-base font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-6 transition hover:border-cyan-400/30">
      <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-xl text-cyan-400">
        {icon}
      </div>

      <h3 className="text-lg font-semibold">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
    </div>
  );
}

function Market({
  name,
  active,
  onCryptoClick,
  onIndianClick,
  onForexClick,
  onStockClick,
}: {
  name: string;
  active?: boolean;
  onCryptoClick?: () => void;
  onIndianClick?: (name: string) => void;
  onForexClick?: () => void;
  onStockClick?: () => void;
}) {
  const isCrypto = name === "Crypto";
  const isIndianMarket =
    name === "NIFTY" ||
    name === "BANKNIFTY" ||
    name === "SENSEX";

  return (
    <button
      type="button"
      onClick={() => {
        if (isCrypto) {
          onCryptoClick?.();
        } else if (isIndianMarket) {
          onIndianClick?.(name);
        } else if (name === "Forex") {
          onForexClick?.();
        } else if (name === "Stocks") {
          onStockClick?.();
        }
      }}
      className={`rounded-xl border px-4 py-4 text-sm font-semibold transition ${
        active
          ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
          : isCrypto
            ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20"
            : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-400/30"
      }`}
    >
      {name}
    </button>
  );
}
