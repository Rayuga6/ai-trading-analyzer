import { createClient } from "@/lib/supabase/server";

export type BacktestSignal = "BUY" | "SELL" | "HOLD";

export interface BacktestCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface BacktestTrade {
  index: number;
  entryTime: number;
  exitTime: number;
  signal: BacktestSignal;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  result: "win" | "loss" | "breakeven";
}

export interface BacktestResult {
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

export interface BacktestInput {
  symbol: string;
  timeframe: string;
  candles: BacktestCandle[];
  initialCapital: number;
  positionSizePercent?: number;
  feePercent?: number;
}

const MAX_CANDLES = 10_000;

function finitePositive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be greater than zero.`);
  }
}

export function validateBacktestInput(input: BacktestInput) {
  if (
    !input.symbol ||
    input.symbol.length > 30 ||
    !/^[a-zA-Z0-9._/-]+$/.test(input.symbol)
  ) {
    throw new Error("Invalid symbol.");
  }

  if (!input.timeframe || input.timeframe.length > 20) {
    throw new Error("Invalid timeframe.");
  }

  finitePositive(input.initialCapital, "Initial capital");

  if (!Array.isArray(input.candles) || input.candles.length < 2) {
    throw new Error("At least two candles are required.");
  }

  if (input.candles.length > MAX_CANDLES) {
    throw new Error(`Maximum ${MAX_CANDLES} candles are allowed.`);
  }

  for (const candle of input.candles) {
    if (
      !Number.isFinite(candle.timestamp) ||
      !Number.isFinite(candle.open) ||
      !Number.isFinite(candle.high) ||
      !Number.isFinite(candle.low) ||
      !Number.isFinite(candle.close)
    ) {
      throw new Error("Invalid candle data.");
    }

    if (
      candle.open <= 0 ||
      candle.high <= 0 ||
      candle.low <= 0 ||
      candle.close <= 0 ||
      candle.high < candle.low
    ) {
      throw new Error("Invalid candle prices.");
    }
  }

  const positionSizePercent = input.positionSizePercent ?? 100;
  const feePercent = input.feePercent ?? 0.1;

  if (
    !Number.isFinite(positionSizePercent) ||
    positionSizePercent <= 0 ||
    positionSizePercent > 100
  ) {
    throw new Error("Position size must be between 0 and 100 percent.");
  }

  if (
    !Number.isFinite(feePercent) ||
    feePercent < 0 ||
    feePercent > 10
  ) {
    throw new Error("Fee must be between 0 and 10 percent.");
  }
}

function movingAverage(
  values: number[],
  period: number,
  index: number,
): number | null {
  if (index + 1 < period) return null;

  let sum = 0;

  for (
    let cursor = index - period + 1;
    cursor <= index;
    cursor += 1
  ) {
    sum += values[cursor];
  }

  return sum / period;
}

function generateSignal(
  closes: number[],
  index: number,
): BacktestSignal {
  const fast = movingAverage(closes, 9, index);
  const slow = movingAverage(closes, 21, index);

  if (fast === null || slow === null) {
    return "HOLD";
  }

  if (fast > slow) return "BUY";
  if (fast < slow) return "SELL";
  return "HOLD";
}

/**
 * Simple long/short-free signal backtest:
 * BUY opens a long position, SELL closes it and can open a short position.
 * A later opposite signal closes the current position.
 *
 * This is a historical simulation, not a prediction or guarantee.
 */
export function runBacktest(input: BacktestInput): BacktestResult {
  validateBacktestInput(input);

  const positionSizePercent =
    input.positionSizePercent ?? 100;
  const feePercent = input.feePercent ?? 0.1;

  const closes = input.candles.map(
    (candle) => candle.close,
  );

  let capital = input.initialCapital;
  let peakCapital = capital;
  let maxDrawdownPercent = 0;

  let position:
    | {
        signal: "BUY" | "SELL";
        entryPrice: number;
        entryTime: number;
        quantity: number;
      }
    | null = null;

  const trades: BacktestTrade[] = [];

  const feeRate = feePercent / 100;

  function updateDrawdown() {
    peakCapital = Math.max(peakCapital, capital);

    if (peakCapital > 0) {
      const drawdown =
        ((peakCapital - capital) / peakCapital) * 100;

      maxDrawdownPercent = Math.max(
        maxDrawdownPercent,
        drawdown,
      );
    }
  }

  function closePosition(
    exitPrice: number,
    exitTime: number,
  ) {
    if (!position) return;

    const direction =
      position.signal === "BUY" ? 1 : -1;

    const grossPnl =
      (exitPrice - position.entryPrice) *
      position.quantity *
      direction;

    const entryValue =
      position.entryPrice * position.quantity;
    const exitValue =
      exitPrice * position.quantity;

    const fees =
      (entryValue + exitValue) * feeRate;

    const pnl = grossPnl - fees;

    capital += pnl;
    updateDrawdown();

    const pnlPercent =
      entryValue > 0
        ? (pnl / entryValue) * 100
        : 0;

    const result =
      pnl > 0
        ? "win"
        : pnl < 0
          ? "loss"
          : "breakeven";

    trades.push({
      index: trades.length + 1,
      entryTime: position.entryTime,
      exitTime,
      signal: position.signal,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      pnl,
      pnlPercent,
      result,
    });

    position = null;
  }

  for (
    let index = 0;
    index < input.candles.length;
    index += 1
  ) {
    const candle = input.candles[index];
    const signal = generateSignal(closes, index);

    if (signal === "HOLD") {
      updateDrawdown();
      continue;
    }

    if (!position) {
      const allocation =
        capital * (positionSizePercent / 100);

      const quantity =
        allocation / candle.close;

      if (quantity > 0) {
        position = {
          signal,
          entryPrice: candle.close,
          entryTime: candle.timestamp,
          quantity,
        };
      }

      updateDrawdown();
      continue;
    }

    if (position.signal !== signal) {
      closePosition(
        candle.close,
        candle.timestamp,
      );

      const allocation =
        capital * (positionSizePercent / 100);

      const quantity =
        allocation / candle.close;

      if (quantity > 0) {
        position = {
          signal,
          entryPrice: candle.close,
          entryTime: candle.timestamp,
          quantity,
        };
      }
    }

    updateDrawdown();
  }

  const lastCandle =
    input.candles[input.candles.length - 1];

  if (position) {
    closePosition(
      lastCandle.close,
      lastCandle.timestamp,
    );
  }

  const netProfit =
    capital - input.initialCapital;

  const returnPercent =
    (netProfit / input.initialCapital) * 100;

  const winningTrades = trades.filter(
    (trade) => trade.result === "win",
  ).length;

  const losingTrades = trades.filter(
    (trade) => trade.result === "loss",
  ).length;

  const breakevenTrades = trades.filter(
    (trade) => trade.result === "breakeven",
  ).length;

  const evaluatedTrades = trades.length;

  return {
    initialCapital: input.initialCapital,
    finalCapital: capital,
    netProfit,
    returnPercent,
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate:
      evaluatedTrades > 0
        ? (winningTrades / evaluatedTrades) * 100
        : 0,
    maxDrawdownPercent,
    trades,
  };
}

export async function saveBacktestResult(
  symbol: string,
  timeframe: string,
  result: BacktestResult,
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required.");
  }

  const { error } = await supabase
    .from("backtest_results")
    .insert({
      user_id: user.id,
      symbol,
      timeframe,
      initial_capital: result.initialCapital,
      final_capital: result.finalCapital,
      net_profit: result.netProfit,
      return_percent: result.returnPercent,
      total_trades: result.totalTrades,
      winning_trades: result.winningTrades,
      losing_trades: result.losingTrades,
      breakeven_trades: result.breakevenTrades,
      win_rate: result.winRate,
      max_drawdown_percent: result.maxDrawdownPercent,
    });

  if (error) {
    throw new Error("Unable to save backtest result.");
  }
}

export function summarizeBacktest(
  result: BacktestResult,
) {
  return {
    returnPercent: Number(
      result.returnPercent.toFixed(2),
    ),
    netProfit: Number(
      result.netProfit.toFixed(2),
    ),
    winRate: Number(
      result.winRate.toFixed(2),
    ),
    maxDrawdownPercent: Number(
      result.maxDrawdownPercent.toFixed(2),
    ),
    totalTrades: result.totalTrades,
    winningTrades: result.winningTrades,
    losingTrades: result.losingTrades,
    breakevenTrades: result.breakevenTrades,
  };
}
