"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PaperTradeSide = "buy" | "sell";
type PaperTradeStatus = "open" | "closed" | "cancelled";

interface PaperTrade {
  id: string;
  symbol: string;
  side: PaperTradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  status: PaperTradeStatus;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
}

interface PaperTradingResponse {
  success?: boolean;
  trades?: PaperTrade[];
  summary?: {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakevenTrades: number;
    totalPnl: number;
    winRate: number;
  };
  error?: string;
}

const EMPTY_SUMMARY = {
  totalTrades: 0,
  openTrades: 0,
  closedTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  breakevenTrades: 0,
  totalPnl: 0,
  winRate: 0,
};

function formatNumber(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

export default function PaperTradingPage() {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [summary, setSummary] =
    useState(EMPTY_SUMMARY);
  const [statusFilter, setStatusFilter] =
    useState<"all" | PaperTradeStatus>("all");

  const [symbol, setSymbol] = useState("BTCUSDT");
  const [side, setSide] =
    useState<PaperTradeSide>("buy");
  const [quantity, setQuantity] = useState("0.01");
  const [entryPrice, setEntryPrice] =
    useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] =
    useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTrades = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query =
        statusFilter === "all"
          ? "/api/paper-trading?limit=100"
          : `/api/paper-trading?limit=100&status=${statusFilter}`;

      const response = await fetch(query, {
        method: "GET",
        cache: "no-store",
      });

      const data: PaperTradingResponse =
        await response.json();

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/paper-trading";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to load paper trades.",
        );
      }

      setTrades(
        Array.isArray(data.trades)
          ? data.trades
          : [],
      );
      setSummary(data.summary ?? EMPTY_SUMMARY);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load paper trades.",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadTrades();
  }, [loadTrades]);

  async function createTrade() {
    setCreating(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/paper-trading",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "create",
            symbol,
            side,
            quantity: Number(quantity),
            entryPrice: Number(entryPrice),
            stopLoss: stopLoss
              ? Number(stopLoss)
              : null,
            takeProfit: takeProfit
              ? Number(takeProfit)
              : null,
            notes: notes || null,
          }),
        },
      );

      const data: PaperTradingResponse =
        await response.json();

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/paper-trading";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to create paper trade.",
        );
      }

      setEntryPrice("");
      setStopLoss("");
      setTakeProfit("");
      setNotes("");
      setNotice("Paper trade created.");
      await loadTrades();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create paper trade.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function closeTrade(trade: PaperTrade) {
    const value = window.prompt(
      `Exit price for ${trade.symbol}:`,
      trade.entryPrice.toString(),
    );

    if (value === null) return;

    const exitPrice = Number(value);

    if (!Number.isFinite(exitPrice) || exitPrice <= 0) {
      setError("Exit price must be greater than zero.");
      return;
    }

    setActionId(trade.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/paper-trading",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "close",
            tradeId: trade.id,
            exitPrice,
          }),
        },
      );

      const data: PaperTradingResponse =
        await response.json();

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/paper-trading";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to close paper trade.",
        );
      }

      setNotice("Paper trade closed.");
      await loadTrades();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to close paper trade.",
      );
    } finally {
      setActionId("");
    }
  }

  async function cancelTrade(trade: PaperTrade) {
    if (
      !window.confirm(
        `Cancel the open ${trade.symbol} paper trade?`,
      )
    ) {
      return;
    }

    setActionId(trade.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/paper-trading",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "cancel",
            tradeId: trade.id,
          }),
        },
      );

      const data: PaperTradingResponse =
        await response.json();

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/paper-trading";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to cancel paper trade.",
        );
      }

      setNotice("Paper trade cancelled.");
      await loadTrades();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel paper trade.",
      );
    } finally {
      setActionId("");
    }
  }

  const filteredTrades = useMemo(() => {
    return trades;
  }, [trades]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-blue-400">
              AITrade Analyzer
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Paper Trading
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Practice trades with virtual positions. No real money is used.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadTrades()}
            className="app-button border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            Refresh
          </button>
        </header>

        {notice && (
          <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {notice}
          </div>
        )}

        {error && (
          <div className="app-error mb-4">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="app-card p-5">
            <p className="text-sm text-slate-400">
              Total trades
            </p>
            <p className="mt-2 text-3xl font-bold text-white">
              {summary.totalTrades}
            </p>
          </div>

          <div className="app-card p-5">
            <p className="text-sm text-slate-400">
              Open
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-300">
              {summary.openTrades}
            </p>
          </div>

          <div className="app-card p-5">
            <p className="text-sm text-slate-400">
              Win rate
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {formatNumber(summary.winRate)}%
            </p>
          </div>

          <div className="app-card p-5">
            <p className="text-sm text-slate-400">
              Total P&L
            </p>
            <p
              className={`mt-2 text-3xl font-bold ${
                summary.totalPnl > 0
                  ? "text-emerald-300"
                  : summary.totalPnl < 0
                    ? "text-red-300"
                    : "text-slate-300"
              }`}
            >
              {formatNumber(summary.totalPnl)}
            </p>
          </div>
        </section>

        <section className="app-card mt-5 p-5">
          <h2 className="text-lg font-semibold text-white">
            Open paper trade
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Create a virtual position for testing and practice.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label>
              <span className="app-label">
                Symbol
              </span>
              <input
                value={symbol}
                onChange={(event) =>
                  setSymbol(event.target.value)
                }
                className="app-input"
                maxLength={30}
              />
            </label>

            <label>
              <span className="app-label">
                Side
              </span>
              <select
                value={side}
                onChange={(event) =>
                  setSide(
                    event.target.value as PaperTradeSide,
                  )
                }
                className="app-input"
              >
                <option value="buy">BUY</option>
                <option value="sell">SELL</option>
              </select>
            </label>

            <label>
              <span className="app-label">
                Quantity
              </span>
              <input
                value={quantity}
                onChange={(event) =>
                  setQuantity(event.target.value)
                }
                className="app-input"
                type="number"
                min="0"
                step="any"
              />
            </label>

            <label>
              <span className="app-label">
                Entry price
              </span>
              <input
                value={entryPrice}
                onChange={(event) =>
                  setEntryPrice(event.target.value)
                }
                className="app-input"
                type="number"
                min="0"
                step="any"
                placeholder="Current price"
              />
            </label>

            <label>
              <span className="app-label">
                Stop loss
              </span>
              <input
                value={stopLoss}
                onChange={(event) =>
                  setStopLoss(event.target.value)
                }
                className="app-input"
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
              />
            </label>

            <label>
              <span className="app-label">
                Take profit
              </span>
              <input
                value={takeProfit}
                onChange={(event) =>
                  setTakeProfit(event.target.value)
                }
                className="app-input"
                type="number"
                min="0"
                step="any"
                placeholder="Optional"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="app-label">
                Notes
              </span>
              <input
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                className="app-input"
                maxLength={1000}
                placeholder="Optional notes"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void createTrade()}
            disabled={creating}
            className="app-button mt-5 w-full bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50 sm:w-auto"
          >
            {creating
              ? "Creating..."
              : "Create paper trade"}
          </button>
        </section>

        <section className="app-card mt-5 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Trade history
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Virtual trades only
              </p>
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {(
                [
                  ["all", "All"],
                  ["open", "Open"],
                  ["closed", "Closed"],
                  ["cancelled", "Cancelled"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStatusFilter(value)
                  }
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                    statusFilter === value
                      ? "bg-blue-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              <div className="h-16 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-800" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-800" />
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="app-empty rounded-none border-0">
              <div className="mx-auto max-w-md">
                <div className="mb-3 text-4xl">
                  📋
                </div>
                <h3 className="font-semibold text-white">
                  No paper trades
                </h3>
                <p className="mt-2 text-sm">
                  Create a virtual trade above to start tracking
                  paper performance.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Side</th>
                    <th className="px-4 py-3">Quantity</th>
                    <th className="px-4 py-3">Entry</th>
                    <th className="px-4 py-3">Exit</th>
                    <th className="px-4 py-3">SL / TP</th>
                    <th className="px-4 py-3">P&L</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Opened</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {filteredTrades.map((trade) => (
                    <tr
                      key={trade.id}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-4 font-semibold text-white">
                        {trade.symbol}
                      </td>

                      <td
                        className={`px-4 py-4 font-semibold ${
                          trade.side === "buy"
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {trade.side.toUpperCase()}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {formatNumber(trade.quantity)}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {formatNumber(trade.entryPrice)}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {formatNumber(trade.exitPrice)}
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-400">
                        <div>
                          SL: {formatNumber(trade.stopLoss)}
                        </div>
                        <div className="mt-1">
                          TP: {formatNumber(trade.takeProfit)}
                        </div>
                      </td>

                      <td
                        className={`px-4 py-4 font-medium ${
                          trade.pnl === null
                            ? "text-slate-400"
                            : trade.pnl > 0
                              ? "text-emerald-300"
                              : trade.pnl < 0
                                ? "text-red-300"
                                : "text-slate-300"
                        }`}
                      >
                        {formatNumber(trade.pnl)}
                        {trade.pnlPercent !== null && (
                          <div className="text-xs">
                            {formatNumber(
                              trade.pnlPercent,
                            )}%
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            trade.status === "open"
                              ? "bg-blue-500/15 text-blue-300"
                              : trade.status === "closed"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {trade.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-500">
                        {formatDate(trade.openedAt)}
                      </td>

                      <td className="px-4 py-4">
                        {trade.status === "open" ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={actionId === trade.id}
                              onClick={() =>
                                void closeTrade(trade)
                              }
                              className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                            >
                              Close
                            </button>

                            <button
                              type="button"
                              disabled={actionId === trade.id}
                              onClick={() =>
                                void cancelTrade(trade)
                              }
                              className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">
                            —
                          </span>
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
          Paper trading is a simulation for practice and testing.
          It does not execute orders or use real funds. Simulated
          results may differ from live-market execution.
        </div>
      </div>
    </main>
  );
}
