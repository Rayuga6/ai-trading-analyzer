"use client";

import { useEffect, useState } from "react";

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
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

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

  function analyzeChart() {
    if (!file) return;

    setAnalyzing(true);
    setAnalysis(null);

    // Demo result.
    // Real AI analysis will be connected in the next step.
    setTimeout(() => {
      setAnalysis({
        signal: "WAIT",
        trend: "Neutral / Sideways",
        entry: "Waiting for confirmation",
        stopLoss: "Structure dependent",
        tp1: "—",
        tp2: "—",
        tp3: "—",
        confidence: 68,
        riskReward: "Not confirmed",
      });

      setAnalyzing(false);
    }, 1800);
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
            <button className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-white/5 md:block">
              Pricing
            </button>

            <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10">
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

        {/* Upload */}
        <div className="mx-auto mt-10 max-w-5xl">
          <label
            htmlFor="chart-upload"
            className="block cursor-pointer rounded-3xl border border-dashed border-cyan-400/30 bg-[#0d1422] p-5 transition hover:border-cyan-400/60 md:p-8"
          >
            <input
              id="chart-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!preview ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-cyan-400/10 text-4xl text-cyan-400">
                  ↑
                </div>

                <h3 className="text-2xl font-semibold">
                  Upload Your Chart
                </h3>

                <p className="mt-3 max-w-md text-slate-400">
                  Drag & drop your screenshot here, or click to browse from
                  your computer.
                </p>

                <div className="mt-7 rounded-xl bg-cyan-400 px-7 py-3 font-semibold text-slate-950">
                  Choose Chart Image
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
          )}
        </div>

        {/* Analysis Result */}
        {analysis && (
          <div className="mx-auto mt-10 max-w-5xl rounded-3xl border border-white/10 bg-[#0d1422] p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-slate-500">AI SIGNAL</p>

                <h3
                  className={`mt-1 text-4xl font-bold ${
                    analysis.signal === "BUY"
                      ? "text-green-400"
                      : analysis.signal === "SELL"
                        ? "text-red-400"
                        : "text-yellow-400"
                  }`}
                >
                  {analysis.signal}
                </h3>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4">
                <p className="text-xs text-slate-500">CONFIDENCE</p>
                <p className="mt-1 text-2xl font-bold text-cyan-400">
                  {analysis.confidence}%
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ResultBox title="Trend" value={analysis.trend} />
              <ResultBox title="Entry" value={analysis.entry} />
              <ResultBox title="Stop Loss" value={analysis.stopLoss} />
              <ResultBox title="Risk / Reward" value={analysis.riskReward} />
              <ResultBox title="TP1" value={analysis.tp1} />
              <ResultBox title="TP2" value={analysis.tp2} />
              <ResultBox title="TP3" value={analysis.tp3} />
            </div>

            <div className="mt-7 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <p className="text-sm font-semibold text-yellow-300">
                AI Analysis Status
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                This is currently a demo analysis interface. Real chart
                vision, technical indicators and market-data analysis will be
                connected to the AI backend next.
              </p>
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
        <div className="mt-12 rounded-3xl border border-white/10 bg-[#0d1422] p-6 md:p-8">
          <div className="text-center">
            <p className="text-sm uppercase tracking-widest text-slate-500">
              Supported Markets
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              <Market name="NIFTY" />
              <Market name="SENSEX" />
              <Market name="Stocks" />
              <Market name="Forex" />
              <Market name="Crypto" />
            </div>
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

function ResultBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
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

function Market({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-slate-300">
      {name}
    </div>
  );
}