"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SignalResult = "correct" | "incorrect" | "neutral" | "pending";

interface AccuracyRecord {
  id: string;
  analysisId: string;
  symbol: string;
  timeframe: string;
  signal: string;
  confidence: number | null;
  result: SignalResult;
  entryPrice: number | null;
  evaluatedPrice: number | null;
  priceChangePercent: number | null;
  evaluatedAt: string | null;
  createdAt: string;
}

interface AccuracySummary {
  total: number;
  evaluated: number;
  correct: number;
  incorrect: number;
  neutral: number;
  pending: number;
  accuracyPercent: number | null;
}

interface AccuracyResponse {
  success?: boolean;
  records?: AccuracyRecord[];
  summary?: AccuracySummary;
  error?: string;
}

const EMPTY_SUMMARY: AccuracySummary = {
  total: 0,
  evaluated: 0,
  correct: 0,
  incorrect: 0,
  neutral: 0,
  pending: 0,
  accuracyPercent: null,
};

function resultClass(result: SignalResult) {
  if (result === "correct") return "text-emerald-300";
  if (result === "incorrect") return "text-red-300";
  if (result === "neutral") return "text-amber-300";
  return "text-slate-400";
}

function resultLabel(result: SignalResult) {
  if (result === "correct") return "Correct";
  if (result === "incorrect") return "Incorrect";
  if (result === "neutral") return "Neutral";
  return "Pending";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function formatNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export default function PerformancePage() {
  const [summary, setSummary] =
    useState<AccuracySummary>(EMPTY_SUMMARY);
  const [records, setRecords] = useState<AccuracyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] =
    useState<"all" | SignalResult>("all");

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/accuracy?limit=100",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data: AccuracyResponse =
        await response.json();

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/performance";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load performance data.",
        );
      }

      setSummary(data.summary ?? EMPTY_SUMMARY);
      setRecords(
        Array.isArray(data.records)
          ? data.records
          : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load performance data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPerformance();
  }, [loadPerformance]);

  const visibleRecords = useMemo(() => {
    if (filter === "all") return records;
    return records.filter(
      (record) => record.result === filter,
    );
  }, [filter, records]);

  const accuracyText =
    summary.accuracyPercent === null
      ? "—"
      : `${summary.accuracyPercent}%`;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-blue-400">
              AITrade Analyzer
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Performance
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Track how recorded AI signals performed after evaluation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPerformance()}
            className="app-button self-start border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 sm:self-auto"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div className="app-error mb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadPerformance()}
                className="app-button bg-red-500/20 text-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <section className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="app-card h-28 animate-pulse"
                />
              ))}
            </div>
            <div className="app-card h-80 animate-pulse" />
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="app-card p-5">
                <p className="text-sm text-slate-400">
                  Accuracy
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-300">
                  {accuracyText}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Based on evaluated signals
                </p>
              </div>

              <div className="app-card p-5">
                <p className="text-sm text-slate-400">
                  Evaluated
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {summary.evaluated}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  of {summary.total} recorded
                </p>
              </div>

              <div className="app-card p-5">
                <p className="text-sm text-slate-400">
                  Correct
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-300">
                  {summary.correct}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Incorrect: {summary.incorrect}
                </p>
              </div>

              <div className="app-card p-5">
                <p className="text-sm text-slate-400">
                  Pending
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-300">
                  {summary.pending}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Awaiting evaluation
                </p>
              </div>
            </section>

            <section className="app-card mt-5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Result breakdown
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Distribution of recorded signal outcomes.
                  </p>
                </div>

                <div className="w-full max-w-xs">
                  <div className="mb-2 flex justify-between text-xs text-slate-500">
                    <span>Correct</span>
                    <span>{summary.correct}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all"
                      style={{
                        width: `${
                          summary.evaluated > 0
                            ? Math.min(
                                100,
                                (summary.correct /
                                  summary.evaluated) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["Correct", summary.correct, "text-emerald-300"],
                  ["Incorrect", summary.incorrect, "text-red-300"],
                  ["Neutral", summary.neutral, "text-amber-300"],
                  ["Pending", summary.pending, "text-slate-300"],
                ].map(([label, value, className]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-white/5 bg-slate-950/40 p-4"
                  >
                    <p className="text-xs text-slate-500">
                      {label}
                    </p>
                    <p
                      className={`mt-1 text-2xl font-semibold ${className}`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="app-card mt-5 overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-white">
                    Signal history
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Latest 100 accuracy records
                  </p>
                </div>

                <div className="flex gap-2 overflow-x-auto">
                  {(
                    [
                      ["all", "All"],
                      ["correct", "Correct"],
                      ["incorrect", "Incorrect"],
                      ["neutral", "Neutral"],
                      ["pending", "Pending"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        filter === value
                          ? "bg-blue-500 text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {visibleRecords.length === 0 ? (
                <div className="app-empty rounded-none border-0">
                  <h3 className="font-semibold text-white">
                    No performance records
                  </h3>
                  <p className="mt-2 text-sm">
                    Run analyses and record their outcomes to build your
                    performance history.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-slate-950/50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3">Signal</th>
                        <th className="px-4 py-3">Confidence</th>
                        <th className="px-4 py-3">Entry</th>
                        <th className="px-4 py-3">Evaluated</th>
                        <th className="px-4 py-3">Change</th>
                        <th className="px-4 py-3">Result</th>
                        <th className="px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {visibleRecords.map((record) => (
                        <tr
                          key={record.id}
                          className="hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-4 font-semibold text-white">
                            {record.symbol}
                            <div className="text-xs font-normal text-slate-500">
                              {record.timeframe}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-200">
                            {record.signal}
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {record.confidence === null
                              ? "—"
                              : `${record.confidence}%`}
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {formatNumber(record.entryPrice)}
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {formatNumber(record.evaluatedPrice)}
                          </td>
                          <td className="px-4 py-4">
                            {record.priceChangePercent === null
                              ? "—"
                              : `${record.priceChangePercent.toFixed(2)}%`}
                          </td>
                          <td
                            className={`px-4 py-4 font-medium ${resultClass(
                              record.result,
                            )}`}
                          >
                            {resultLabel(record.result)}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-500">
                            {formatDate(
                              record.evaluatedAt ||
                                record.createdAt,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200">
              Performance statistics describe recorded historical signals
              only. They are not a guarantee of future trading results.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
