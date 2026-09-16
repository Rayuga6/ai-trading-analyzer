import { NextRequest, NextResponse } from "next/server";
import {
  runBacktest,
  summarizeBacktest,
  type BacktestCandle,
} from "@/lib/backtest";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_CANDLES = 10_000;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Request could not be completed.";
}

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function isCandle(value: unknown): value is BacktestCandle {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candle = value as Record<string, unknown>;

  return (
    Number.isFinite(Number(candle.timestamp)) &&
    Number.isFinite(Number(candle.open)) &&
    Number.isFinite(Number(candle.high)) &&
    Number.isFinite(Number(candle.low)) &&
    Number.isFinite(Number(candle.close))
  );
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(
      request.headers.get("content-length") ?? "0",
    );

    if (contentLength > MAX_BODY_BYTES) {
      return json(
        {
          success: false,
          error: "Request body is too large.",
        },
        413,
      );
    }

    await requireUser();

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return json(
        {
          success: false,
          error: "Invalid request body.",
        },
        400,
      );
    }

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "run";

    if (action !== "run") {
      return json(
        {
          success: false,
          error: "Unsupported action.",
        },
        400,
      );
    }

    const symbol =
      typeof body.symbol === "string"
        ? body.symbol.trim()
        : "";

    const timeframe =
      typeof body.timeframe === "string"
        ? body.timeframe.trim()
        : "";

    const candlesInput: unknown[] = Array.isArray(body.candles)
      ? body.candles
      : [];

    if (!symbol) {
      return json(
        {
          success: false,
          error: "Symbol is required.",
        },
        400,
      );
    }

    if (!timeframe) {
      return json(
        {
          success: false,
          error: "Timeframe is required.",
        },
        400,
      );
    }

    if (
      candlesInput.length < 2 ||
      candlesInput.length > MAX_CANDLES
    ) {
      return json(
        {
          success: false,
          error: `Candles must contain 2 to ${MAX_CANDLES} records.`,
        },
        400,
      );
    }

    if (!candlesInput.every(isCandle)) {
      return json(
        {
          success: false,
          error: "Invalid candle data.",
        },
        400,
      );
    }

    const candles: BacktestCandle[] =
      candlesInput.map((candle) => ({
        timestamp: Number(candle.timestamp),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      }));

    const initialCapital = Number(
      body.initialCapital,
    );

    const positionSizePercent =
      body.positionSizePercent === undefined ||
      body.positionSizePercent === null
        ? undefined
        : Number(body.positionSizePercent);

    const feePercent =
      body.feePercent === undefined ||
      body.feePercent === null
        ? undefined
        : Number(body.feePercent);

    const result = runBacktest({
      symbol,
      timeframe,
      candles,
      initialCapital,
      positionSizePercent,
      feePercent,
    });

    return json({
      success: true,
      symbol,
      timeframe,
      summary: summarizeBacktest(result),
      result,
    });
  } catch (error) {
    const msg = errorMessage(error);

    if (msg === "Authentication required.") {
      return json(
        {
          success: false,
          error: msg,
        },
        401,
      );
    }

    const clientErrors = [
      "Invalid symbol.",
      "Invalid timeframe.",
      "Initial capital must be greater than zero.",
      "At least two candles are required.",
      `Maximum ${MAX_CANDLES} candles are allowed.`,
      "Invalid candle data.",
      "Invalid candle prices.",
      "Position size must be between 0 and 100 percent.",
      "Fee must be between 0 and 10 percent.",
    ];

    if (clientErrors.includes(msg)) {
      return json(
        {
          success: false,
          error: msg,
        },
        400,
      );
    }

    if (msg.includes("must be greater than zero.")) {
      return json(
        {
          success: false,
          error: msg,
        },
        400,
      );
    }

    return json(
      {
        success: false,
        error: "Unable to run backtest.",
      },
      500,
    );
  }
}

export async function GET() {
  try {
    await requireUser();

    return json({
      success: true,
      message:
        "Backtest API is available. Send POST with symbol, timeframe, candles and initialCapital.",
    });
  } catch (error) {
    if (
      errorMessage(error) ===
      "Authentication required."
    ) {
      return json(
        {
          success: false,
          error: "Authentication required.",
        },
        401,
      );
    }

    return json(
      {
        success: false,
        error: "Unable to access backtest API.",
      },
      500,
    );
  }
}
