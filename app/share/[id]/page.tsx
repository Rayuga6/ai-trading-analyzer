"use client";

import { useCallback, useEffect, useState } from "react";

interface SharedAnalysisResponse {
  success?: boolean;
  error?: string;
  share?: {
    id: string;
    analysisId: string;
    expiresAt: string | null;
    createdAt: string;
  };
  analysis?: Record<string, unknown>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No expiry";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString();
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

export default function SharedAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [shareId, setShareId] = useState("");
  const [data, setData] = useState<SharedAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadShare = useCallback(async (id: string) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/analysis/share?token=${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const result: SharedAnalysisResponse =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "This shared analysis is unavailable.",
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This shared analysis is unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void params.then(({ id }) => {
      if (!active) return;

      const decodedId = decodeURIComponent(id);
      setShareId(decodedId);
      void loadShare(decodedId);
    });

    return () => {
      active = false;
    };
  }, [params, loadShare]);

  const analysis = data?.analysis ?? {};
  const entries = Object.entries(analysis);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="mb-1 text-sm font-medium text-blue-400">
            AITrade Analyzer
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Shared Analysis
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Read-only analysis shared through a secure link.
          </p>
        </header>

        {loading ? (
          <section className="space-y-4">
            <div className="app-card h-28 animate-pulse" />
            <div className="app-card h-72 animate-pulse" />
            <div className="app-card h-40 animate-pulse" />
          </section>
        ) : error ? (
          <section className="app-error">
            <div className="mx-auto max-w-lg text-center">
              <div className="mb-3 text-4xl">🔒</div>
              <h2 className="text-xl font-semibold text-white">
                Analysis unavailable
              </h2>
              <p className="mt-2 text-sm">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadShare(shareId)}
                className="app-button mt-5 bg-blue-500 text-white hover:bg-blue-400"
              >
                Try again
              </button>
            </div>
          </section>
        ) : data?.success && data.share && data.analysis ? (
          <>
            <section className="app-card mb-5 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Analysis ID
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-slate-200">
                    {data.share.analysisId}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Shared
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatDate(data.share.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Expires: {formatDate(data.share.expiresAt)}
                  </p>
                </div>
              </div>
            </section>

            <section className="app-card overflow-hidden">
              <div className="border-b border-white/10 px-5 py-4">
                <h2 className="font-semibold text-white">
                  Analysis Result
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Read-only shared result
                </p>
              </div>

              {entries.length === 0 ? (
                <div className="app-empty rounded-none border-0">
                  No analysis data is available.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {entries.map(([key, value]) => (
                    <div
                      key={key}
                      className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr]"
                    >
                      <div className="text-sm font-medium text-slate-400">
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/[_-]/g, " ")
                          .replace(/^./, (char) =>
                            char.toUpperCase(),
                          )}
                      </div>

                      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950/50 p-3 text-sm leading-6 text-slate-200">
                        {displayValue(value)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-200">
              Shared analysis is informational only. Trading involves
              risk, and past or AI-generated analysis does not guarantee
              future results.
            </div>
          </>
        ) : (
          <section className="app-empty">
            <h2 className="text-lg font-semibold text-white">
              Shared analysis not found
            </h2>
            <p className="mt-2 text-sm">
              The link may be invalid, revoked, expired, or unavailable.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
