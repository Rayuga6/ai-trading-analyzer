"use client";

import { useMemo, useState } from "react";

interface BacktestTrade {
  index: number;
  entryTime: number;
  exitTime: number;
  signal: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  result: "win" | "loss" | "breakeven";
}

interface BacktestResult {
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  returnPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  maxDrawdownPercent: number;
  trades: BacktestTrade[];
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  summary?: {
    returnPercent: number;
    netProfit: number;
    winRate: number;
    maxDrawdownPercent: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakevenTrades: number;
  };
  result?: BacktestResult;
}

interface CandleRow {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const DEFAULT_CANDLES = `[
  {"timestamp":1720000000000,"open":100,"high":103,"low":99,"close":102},
  {"timestamp":1720000060000,"open":102,"high":105,"low":101,"close":104},
  {"timestamp":1720000120000,"open":104,"high":106,"low":102,"close":105},
  {"timestamp":1720000180000,"open":105,"high":107,"low":103,"close":106}
]`;

function formatNumber(value: number, digits = 2) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1m");
  const [initialCapital, setInitialCapital] =
    useState("10000");
  const [positionSize, setPositionSize] =
    useState("100");
  const [fee, setFee] = useState("0.1");
  const [candlesText, setCandlesText] =
    useState(DEFAULT_CANDLES);

  const [result, setResult] =
    useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runBacktest() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let parsedCandles: unknown;

      try {
        parsedCandles = JSON.parse(candlesText);
      } catch {
        throw new Error(
          "Candles JSON is invalid. Please check the format.",
        );
      }

      if (!Array.isArray(parsedCandles)) {
        throw new Error(
          "Candles must be a JSON array.",
        );
      }

      const response = await fetch(
        "/api/backtest",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "run",
            symbol,
            timeframe,
            initialCapital: Number(initialCapital),
            positionSizePercent: Number(positionSize),
            feePercent: Number(fee),
            candles: parsedCandles,
          }),
        },
      );

      const data: ApiResponse =
        await response.json();

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/backtest";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to run backtest.",
        );
      }

      if (!data.result) {
        throw new Error(
          "Backtest returned no result.",
        );
      }

      setResult(data.result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to run backtest.",
      );
    } finally {
      setLoading(false);
    }
  }

  const resultClass = useMemo(() => {
    if (!result) return "text-slate-300";
    if (result.netProfit > 0)
      return "text-emerald-300";
    if (result.netProfit < 0)
      return "text-red-300";
    return "text-slate-300";
  }, [result]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <p className="mb-1 text-sm font-medium text-blue-400">
            AITrade Analyzer
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Backtesting
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Test the historical signal logic against candle data.
            Backtests are simulations and do not guarantee future results.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <section className="app-card p-5">
            <h2 className="text-lg font-semibold text-white">
              Backtest settings
            </h2>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="app-label">
                  Symbol
                </span>
                <input
                  value={symbol}
                  onChange={(event) =>
                    setSymbol(event.target.value)
                  }
                  className="app-input"
                  placeholder="BTCUSDT"
                  maxLength={30}
                />
              </label>

              <label className="block">
                <span className="app-label">
                  Timeframe
                </span>
                <select
                  value={timeframe}
                  onChange={(event) =>
                    setTimeframe(event.target.value)
                  }
                  className="app-input"
                >
                  <option value="1m">1m</option>
                  <option value="5m">5m</option>
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1d">1d</option>
                </select>
              </label>

              <label className="block">
                <span className="app-label">
                  Initial capital
                </span>
                <input
                  value={initialCapital}
                  onChange={(event) =>
                    setInitialCapital(
                      event.target.value,
                    )
                  }
                  className="app-input"
                  inputMode="decimal"
                  type="number"
                  min="0"
                />
              </label>

              <label className="block">
                <span className="app-label">
                  Position size %
                </span>
                <input
                  value={positionSize}
                  onChange={(event) =>
                    setPositionSize(
                      event.target.value,
                    )
                  }
                  className="app-input"
                  inputMode="decimal"
                  type="number"
                  min="1"
                  max="100"
                />
              </label>

              <label className="block">
                <span className="app-label">
                  Fee %
                </span>
                <input
                  value={fee}
                  onChange={(event) =>
                    setFee(event.target.value)
                  }
                  className="app-input"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="app-label mb-0">
                    Candle JSON
                  </span>
                  <span className="text-xs text-slate-500">
                    Max 10,000
                  </span>
                </div>

                <textarea
                  value={candlesText}
                  onChange={(event) =>
                    setCandlesText(
                      event.target.value,
                    )
                  }
                  className="min-h-64 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 font-mono text-xs leading-5 text-slate-200 outline-none transition focus:border-blue-400/50"
                  spellCheck={false}
                />
              </label>

              {error && (
                <div className="app-error">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => void runBacktest()}
                disabled={loading}
                className="app-button w-full bg-blue-500 text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Running backtest..."
                  : "Run backtest"}
              </button>
            </div>
          </section>

          <section>
            {!result && !loading ? (
              <div className="app-empty min-h-[500px]">
                <div className="mx-auto max-w-md">
                  <div className="mb-4 text-4xl">
                    📊
                  </div>
                  <h2 className="text-xl font-semibold text-white">
                    No backtest result yet
                  </h2>
                  <p className="mt-2 text-sm leading-6">
                    Enter your historical candle data and run the
                    simulation to see the performance summary.
                  </p>
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="app-card h-28 animate-pulse" />
                  <div className="app-card h-28 animate-pulse" />
                  <div className="app-card h-28 animate-pulse" />
                  <div className="app-card h-28 animate-pulse" />
                </div>
                <div className="app-card h-72 animate-pulse" />
              </div>
            ) : result ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="app-card p-5">
                    <p className="text-sm text-slate-400">
                      Net profit
                    </p>
                    <p
                      className={`mt-2 text-3xl font-bold ${resultClass}`}
                    >
                      {formatNumber(result.netProfit)}
                    </p>
                  </div>

                  <div className="app-card p-5">
                    <p className="text-sm text-slate-400">
                      Return
                    </p>
                    <p className="mt-2 text-3xl font-bold text-white">
                      {formatNumber(result.returnPercent)}%
                    </p>
                  </div>

                  <div className="app-card p-5">
                    <p className="text-sm text-slate-400">
                      Win rate
                    </p>
                    <p className="mt-2 text-3xl font-bold text-blue-300">
                      {formatNumber(result.winRate)}%
                    </p>
                  </div>

                  <div className="app-card p-5">
                    <p className="text-sm text-slate-400">
                      Max drawdown
                    </p>
                    <p className="mt-2 text-3xl font-bold text-red-300">
                      {formatNumber(
                        result.maxDrawdownPercent,
                      )}%
                    </p>
                  </div>
                </div>

                <section className="app-card mt-5 p-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Initial capital
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatNumber(
                          result.initialCapital,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Final capital
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatNumber(
                          result.finalCapital,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Total trades
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {result.totalTrades}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="app-card mt-5 overflow-hidden">
                  <div className="border-b border-white/10 p-5">
                    <h2 className="font-semibold text-white">
                      Trade history
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {result.trades.length} simulated trades
                    </p>
                  </div>

                  {result.trades.length === 0 ? (
                    <div className="app-empty rounded-none border-0">
                      No trades were generated by the strategy.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-[850px] w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Signal</th>
                            <th className="px-4 py-3">Entry</th>
                            <th className="px-4 py-3">Exit</th>
                            <th className="px-4 py-3">P&L</th>
                            <th className="px-4 py-3">P&L %</th>
                            <th className="px-4 py-3">Result</th>
                            <th className="px-4 py-3">Exit time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {result.trades.map((trade) => (
                            <tr
                              key={trade.index}
                              className="hover:bg-white/[0.02]"
                            >
                              <td className="px-4 py-4 text-slate-500">
                                {trade.index}
                              </td>
                              <td
                                className={`px-4 py-4 font-semibold ${
                                  trade.signal === "BUY"
                                    ? "text-emerald-300"
                                    : "text-red-300"
                                }`}
                              >
                                {trade.signal}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {formatNumber(
                                  trade.entryPrice,
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {formatNumber(
                                  trade.exitPrice,
                                )}
                              </td>
                              <td
                                className={`px-4 py-4 font-medium ${
                                  trade.pnl > 0
                                    ? "text-emerald-300"
                                    : trade.pnl < 0
                                      ? "text-red-300"
                                      : "text-slate-300"
                                }`}
                              >
                                {formatNumber(
                                  trade.pnl,
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {formatNumber(
                                  trade.pnlPercent,
                                )}%
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={
                                    trade.result === "win"
                                      ? "text-emerald-300"
                                      : trade.result === "loss"
                                        ? "text-red-300"
                                        : "text-amber-300"
                                  }
                                >
                                  {trade.result}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-500">
                                {formatDate(
                                  trade.exitTime,
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
                  This is a historical simulation. Fees, slippage,
                  liquidity and real-market execution can differ from
                  the simulation. Results do not guarantee future
                  performance.
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
