"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type AlertType = "price" | "ai_analysis" | "risk" | "system";
type AlertSeverity = "info" | "success" | "warning" | "critical";

interface TradingAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  symbol?: string | null;
  market?: string | null;
  timeframe?: string | null;
  triggerPrice?: number | null;
  currentPrice?: number | null;
  signal?: string | null;
  confidence?: number | null;
  read: boolean;
  createdAt: string;
  expiresAt?: string | null;
}

interface AlertsResponse {
  success?: boolean;
  alerts?: TradingAlert[];
  error?: string;
  message?: string;
}

const FILTERS: Array<{
  value: "all" | AlertType;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "price", label: "Price" },
  { value: "ai_analysis", label: "AI Analysis" },
  { value: "risk", label: "Risk" },
  { value: "system", label: "System" },
];

function severityClass(severity: AlertSeverity) {
  if (severity === "critical") {
    return "border-red-400/30 bg-red-500/10";
  }

  if (severity === "warning") {
    return "border-amber-400/30 bg-amber-500/10";
  }

  if (severity === "success") {
    return "border-emerald-400/30 bg-emerald-500/10";
  }

  return "border-blue-400/20 bg-blue-500/10";
}

function typeLabel(type: AlertType) {
  return type === "ai_analysis"
    ? "AI Analysis"
    : type.charAt(0).toUpperCase() + type.slice(1);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toLocaleString();
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<TradingAlert[]>([]);
  const [filter, setFilter] = useState<"all" | AlertType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/alerts", {
        method: "GET",
        cache: "no-store",
      });

      const data: AlertsResponse = await response.json();

      if (response.status === 401) {
        window.location.href = "/login?redirect=/alerts";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to load alerts."
        );
      }

      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);

      if (data.message) {
        setNotice(data.message);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load alerts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const visibleAlerts = useMemo(() => {
    if (filter === "all") {
      return alerts;
    }

    return alerts.filter(
      (alert) => alert.type === filter
    );
  }, [alerts, filter]);

  const unreadCount = alerts.filter(
    (alert) => !alert.read
  ).length;

  async function markAllRead() {
    if (!unreadCount) {
      return;
    }

    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark-read",
          ids: alerts
            .filter((alert) => !alert.read)
            .map((alert) => alert.id),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        window.location.href = "/login?redirect=/alerts";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to update alerts."
        );
      }

      /*
       * Optimistic UI update. The API currently validates the request;
       * persistent alert storage is enabled when the alerts table is wired.
       */
      setAlerts((current) =>
        current.map((alert) => ({
          ...alert,
          read: true,
        }))
      );

      setNotice(
        data.message ||
          "Alerts marked as read."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update alerts."
      );
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-blue-400">
              AITrade Analyzer
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Alerts
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Price and AI analysis notifications in one place.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadAlerts()}
              className="app-button border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={!unreadCount}
              className="app-button bg-blue-500 text-white hover:bg-blue-400"
            >
              Mark all read
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="app-card p-5">
            <p className="text-sm text-slate-400">
              Total alerts
            </p>
            <p className="mt-2 text-3xl font-bold">
              {alerts.length}
            </p>
          </div>

          <div className="app-card p-5">
            <p className="text-sm text-slate-400">
              Unread
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-300">
              {unreadCount}
            </p>
          </div>

          <div className="app-card p-5">
            <p className="text-sm text-slate-400">
              AI alerts
            </p>
            <p className="mt-2 text-3xl font-bold">
              {
                alerts.filter(
                  (alert) =>
                    alert.type === "ai_analysis"
                ).length
              }
            </p>
          </div>
        </section>

        <section className="app-card mb-6 overflow-hidden">
          <div className="flex gap-2 overflow-x-auto p-3">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filter === item.value
                    ? "bg-blue-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {notice && (
          <div className="mb-4 rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            {notice}
          </div>
        )}

        {error && (
          <div className="app-error mb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void loadAlerts()}
                className="app-button bg-red-500/20 text-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <section className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="app-card h-32 animate-pulse p-5"
              >
                <div className="h-4 w-1/3 rounded bg-slate-700" />
                <div className="mt-4 h-3 w-3/4 rounded bg-slate-800" />
                <div className="mt-3 h-3 w-1/2 rounded bg-slate-800" />
              </div>
            ))}
          </section>
        ) : visibleAlerts.length === 0 ? (
          <section className="app-empty">
            <div className="mx-auto max-w-md">
              <div className="mb-3 text-4xl">🔔</div>
              <h2 className="text-lg font-semibold text-white">
                No alerts yet
              </h2>
              <p className="mt-2 text-sm">
                {filter === "all"
                  ? "Your price and AI analysis alerts will appear here."
                  : `No ${typeLabel(filter).toLowerCase()} alerts found.`}
              </p>
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            {visibleAlerts.map((alert) => (
              <article
                key={alert.id}
                className={`rounded-2xl border p-5 transition ${
                  severityClass(alert.severity)
                } ${
                  alert.read
                    ? "opacity-80"
                    : "shadow-lg"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-950/50 px-2.5 py-1 text-xs font-medium text-slate-300">
                        {typeLabel(alert.type)}
                      </span>

                      <span className="rounded-full bg-slate-950/50 px-2.5 py-1 text-xs uppercase tracking-wide text-slate-400">
                        {alert.severity}
                      </span>

                      {!alert.read && (
                        <span className="rounded-full bg-blue-400/20 px-2.5 py-1 text-xs font-medium text-blue-200">
                          New
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-semibold text-white">
                      {alert.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {alert.message}
                    </p>
                  </div>

                  <time
                    dateTime={alert.createdAt}
                    className="shrink-0 text-xs text-slate-400"
                  >
                    {formatDate(alert.createdAt)}
                  </time>
                </div>

                {(alert.symbol ||
                  alert.currentPrice !== null ||
                  alert.triggerPrice !== null ||
                  alert.signal ||
                  alert.confidence !== null) && (
                  <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-5">
                    {alert.symbol && (
                      <div>
                        <p className="text-xs text-slate-500">
                          Symbol
                        </p>
                        <p className="font-medium text-white">
                          {alert.symbol}
                        </p>
                      </div>
                    )}

                    {alert.currentPrice !== null &&
                      alert.currentPrice !== undefined && (
                        <div>
                          <p className="text-xs text-slate-500">
                            Current
                          </p>
                          <p className="font-medium text-white">
                            {alert.currentPrice}
                          </p>
                        </div>
                      )}

                    {alert.triggerPrice !== null &&
                      alert.triggerPrice !== undefined && (
                        <div>
                          <p className="text-xs text-slate-500">
                            Trigger
                          </p>
                          <p className="font-medium text-white">
                            {alert.triggerPrice}
                          </p>
                        </div>
                      )}

                    {alert.signal && (
                      <div>
                        <p className="text-xs text-slate-500">
                          Signal
                        </p>
                        <p className="font-medium text-white">
                          {alert.signal}
                        </p>
                      </div>
                    )}

                    {alert.confidence !== null &&
                      alert.confidence !== undefined && (
                        <div>
                          <p className="text-xs text-slate-500">
                            Confidence
                          </p>
                          <p className="font-medium text-white">
                            {alert.confidence}%
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
