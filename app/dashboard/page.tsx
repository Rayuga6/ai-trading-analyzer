"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SubscriptionPlan =
  | "free"
  | "basic"
  | "starter"
  | "pro"
  | "elite"
  | "elite_yearly";

type SubscriptionInfo = {
  plan: SubscriptionPlan;
  status: string;
  isActive: boolean;
  isPaid: boolean;
  limit: number;
  used: number;
  remaining: number;
  periodStart: string | null;
  periodEnd: string | null;
};

type HistoryItem = {
  id?: string;
  selected_market?: string | null;
  selected_symbol?: string | null;
  trend?: string | null;
  signal?: string | null;
  confidence?: number | null;
  created_at?: string | null;
};

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  free: "Free",
  basic: "Basic",
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
  elite_yearly: "Elite Yearly",
};

const PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free: 1,
  basic: 25,
  starter: 50,
  pro: 150,
  elite: 500,
  elite_yearly: 6000,
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function extractList<T>(data: any, keys: string[]): T[] {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return Array.isArray(data) ? data : [];
}

export default function DashboardPage() {
  const [subscription, setSubscription] =
    useState<SubscriptionInfo | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setError("");

    try {
      const [subscriptionResponse, historyResponse] = await Promise.all([
        fetch("/api/subscription/status", {
          cache: "no-store",
        }),
        fetch("/api/history", {
          cache: "no-store",
        }),
      ]);

      if (subscriptionResponse.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (historyResponse.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        const raw = subscriptionData?.subscription ??
          subscriptionData?.access ??
          subscriptionData;

        if (raw?.plan) {
          const plan = String(raw.plan) as SubscriptionPlan;
          const limit =
            normalizeNumber(raw.limit, PLAN_LIMITS[plan] ?? 1);

          setSubscription({
            plan,
            status: String(raw.status ?? "active"),
            isActive: Boolean(raw.isActive ?? true),
            isPaid: Boolean(raw.isPaid ?? plan !== "free"),
            limit,
            used: normalizeNumber(raw.used ?? raw.analyses_used),
            remaining: normalizeNumber(
              raw.remaining,
              Math.max(0, limit - normalizeNumber(raw.used))
            ),
            periodStart: raw.periodStart ?? raw.current_period_start ?? null,
            periodEnd: raw.periodEnd ?? raw.current_period_end ?? null,
          });
        }
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(
          extractList<HistoryItem>(historyData, [
            "history",
            "items",
            "analyses",
          ]).slice(0, 50)
        );
      }
    } catch (loadError) {
      console.error("Dashboard load error:", loadError);
      setError("Unable to load some dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const usagePercent = useMemo(() => {
    if (!subscription || subscription.limit <= 0) return 0;
    return Math.min(
      100,
      Math.max(0, (subscription.used / subscription.limit) * 100)
    );
  }, [subscription]);

  const signalStats = useMemo(() => {
    const counts = {
      BUY: 0,
      SELL: 0,
      HOLD: 0,
      OTHER: 0,
    };

    for (const item of history) {
      const signal = String(item.signal ?? "").toUpperCase();

      if (signal.includes("BUY")) counts.BUY += 1;
      else if (signal.includes("SELL")) counts.SELL += 1;
      else if (signal.includes("HOLD")) counts.HOLD += 1;
      else counts.OTHER += 1;
    }

    return counts;
  }, [history]);

  const confidenceAverage = useMemo(() => {
    const values = history
      .map((item) => normalizeNumber(item.confidence, -1))
      .filter((value) => value >= 0 && value <= 100);

    if (!values.length) return null;

    return Math.round(
      values.reduce((sum, value) => sum + value, 0) / values.length
    );
  }, [history]);

  const chartData = useMemo(() => {
    const recent = [...history]
      .reverse()
      .slice(-12);

    return recent.map((item, index) => ({
      label: item.selected_symbol || item.selected_market || `#${index + 1}`,
      value: Math.min(
        100,
        Math.max(8, normalizeNumber(item.confidence, 50))
      ),
    }));
  }, [history]);

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      window.location.assign("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setError("Unable to log out. Please try again.");
    }
  }

  async function refresh() {
    setRefreshing(true);
    await loadDashboard();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] px-5 py-8 text-white md:px-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-8 w-52 rounded-lg bg-white/10" />
          <div className="mt-3 h-4 w-80 rounded bg-white/5" />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
          <div className="mt-6 h-80 rounded-2xl border border-white/10 bg-white/[0.03]" />
        </div>
      </main>
    );
  }

  const activeSubscription = subscription ?? {
    plan: "free" as SubscriptionPlan,
    status: "active",
    isActive: true,
    isPaid: false,
    limit: 1,
    used: 0,
    remaining: 1,
    periodStart: null,
    periodEnd: null,
  };

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <header className="border-b border-white/10 bg-[#090e19]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <div>
            <Link
              href="/"
              className="text-xl font-bold tracking-tight md:text-2xl"
            >
              AI<span className="text-cyan-400">Trade</span> Analyzer
            </Link>
            <p className="mt-1 text-xs text-slate-400">
              Professional trading analysis dashboard
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="hidden rounded-lg px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 md:block"
            >
              Pricing
            </Link>

            <Link
              href="/"
              className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
            >
              New Analysis
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-7 md:px-8 md:py-10">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-cyan-300">
              Account Overview
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
              Trading Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Track your AI analyses, usage and recent signals in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm text-yellow-300">
            {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-5 shadow-lg shadow-black/10">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Current Plan
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold">
                {PLAN_NAMES[activeSubscription.plan] ?? "Free"}
              </p>
              <span className="rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-1 text-xs text-green-300">
                {activeSubscription.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-5 shadow-lg shadow-black/10">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Analyses Used
            </p>
            <p className="mt-3 text-2xl font-bold">
              {activeSubscription.used.toLocaleString("en-IN")}
              <span className="ml-1 text-sm font-normal text-slate-500">
                / {activeSubscription.limit.toLocaleString("en-IN")}
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-5 shadow-lg shadow-black/10">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Remaining
            </p>
            <p className="mt-3 text-2xl font-bold text-cyan-300">
              {activeSubscription.remaining.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeSubscription.plan === "free"
                ? "Lifetime free allowance"
                : "Available this billing period"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1422] p-5 shadow-lg shadow-black/10">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Avg. AI Confidence
            </p>
            <p className="mt-3 text-2xl font-bold">
              {confidenceAverage === null ? "—" : `${confidenceAverage}%`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Based on saved analyses
            </p>
          </div>
        </div>

        {/* Usage + plan */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-[#0d1422] p-6 lg:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Analysis Usage</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {activeSubscription.used.toLocaleString("en-IN")} used of{" "}
                  {activeSubscription.limit.toLocaleString("en-IN")}
                </p>
              </div>

              <span className="text-sm font-semibold text-cyan-300">
                {Math.round(usagePercent)}%
              </span>
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-slate-500">Period Start</p>
                <p className="mt-1 font-medium">
                  {formatDate(activeSubscription.periodStart)}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-slate-500">Period End</p>
                <p className="mt-1 font-medium">
                  {formatDate(activeSubscription.periodEnd)}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                <p className="text-slate-500">Status</p>
                <p className="mt-1 font-medium capitalize">
                  {activeSubscription.status.replace("_", " ")}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-transparent p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Plan
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {PLAN_NAMES[activeSubscription.plan]}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {activeSubscription.isPaid
                ? "Your premium analysis allowance is active."
                : "Start with your lifetime free analysis or upgrade for more AI analyses."}
            </p>

            <Link
              href="/pricing"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              {activeSubscription.isPaid ? "Manage Plan" : "View Premium Plans"}
            </Link>
          </section>
        </div>

        {/* Signal overview + confidence chart */}
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <section className="rounded-2xl border border-white/10 bg-[#0d1422] p-6 lg:col-span-2">
            <div>
              <h2 className="text-lg font-bold">Signal Overview</h2>
              <p className="mt-1 text-sm text-slate-400">
                Signals from your saved analyses.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {[
                ["BUY", signalStats.BUY],
                ["SELL", signalStats.SELL],
                ["HOLD", signalStats.HOLD],
                ["OTHER", signalStats.OTHER],
              ].map(([label, value]) => {
                const total = Math.max(1, history.length);
                const percent = Math.round(
                  (Number(value) / total) * 100
                );

                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-300">
                        {label}
                      </span>
                      <span className="text-slate-500">
                        {value} · {percent}%
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-slate-300 transition-all duration-700"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d1422] p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Confidence Trend</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Recent saved-analysis confidence levels.
                </p>
              </div>
              <span className="text-xs text-slate-500">
                Last {chartData.length || 0}
              </span>
            </div>

            {chartData.length ? (
              <div className="mt-8 flex h-48 items-end gap-2 overflow-hidden">
                {chartData.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    title={`${item.label}: ${item.value}%`}
                  >
                    <span className="text-[10px] text-slate-500 opacity-0 transition group-hover:opacity-100">
                      {item.value}%
                    </span>
                    <div
                      className="w-full min-w-2 rounded-t-md bg-cyan-400/70 transition-all duration-500 group-hover:bg-cyan-300"
                      style={{ height: `${item.value}%` }}
                    />
                    <span className="w-full truncate text-center text-[10px] text-slate-600">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 flex h-48 items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    No chart data yet
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Complete an analysis to build your confidence trend.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Recent history */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-[#0d1422]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold">Recent Analyses</h2>
              <p className="mt-1 text-sm text-slate-400">
                Your latest AI analysis history.
              </p>
            </div>

            <Link
              href="/history"
              className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
            >
              View All →
            </Link>
          </div>

          {historyLoading ? (
            <div className="p-6 text-sm text-slate-500">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-slate-300">
                No analyses yet
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Start your first AI chart analysis to see it here.
              </p>
              <Link
                href="/"
                className="mt-5 inline-flex rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/15"
              >
                Start Analysis
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Market</th>
                    <th className="px-6 py-4 font-medium">Symbol</th>
                    <th className="px-6 py-4 font-medium">Signal</th>
                    <th className="px-6 py-4 font-medium">Confidence</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((item, index) => (
                    <tr
                      key={item.id ?? `${item.created_at}-${index}`}
                      className="border-t border-white/5 transition hover:bg-white/[0.025]"
                    >
                      <td className="px-6 py-4 text-slate-300">
                        {item.selected_market || "—"}
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {item.selected_symbol || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold">
                          {item.signal || item.trend || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {item.confidence === null ||
                        item.confidence === undefined
                          ? "—"
                          : `${item.confidence}%`}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 pb-4 text-center text-xs text-slate-600">
          AITrade Analyzer provides analytical information, not financial advice.
        </footer>
      </section>
    </main>
  );
}
