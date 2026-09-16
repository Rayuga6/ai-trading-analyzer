import { NextRequest, NextResponse } from "next/server";
import {
  cancelPaperTrade,
  closePaperTrade,
  createPaperTrade,
  getPaperTrades,
  getPaperTradingSummary,
  type PaperTradeSide,
  type PaperTradeStatus,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

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

function isSide(value: unknown): value is PaperTradeSide {
  return value === "buy" || value === "sell";
}

function isStatus(
  value: unknown,
): value is PaperTradeStatus {
  return (
    value === "open" ||
    value === "closed" ||
    value === "cancelled"
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const statusParam =
      request.nextUrl.searchParams.get("status");
    const symbol =
      request.nextUrl.searchParams.get("symbol")?.trim() ||
      undefined;
    const limitParam =
      request.nextUrl.searchParams.get("limit");

    if (
      statusParam &&
      !isStatus(statusParam)
    ) {
      return json(
        {
          success: false,
          error: "Invalid paper trade status.",
        },
        400,
      );
    }

    const limit = limitParam
      ? Number(limitParam)
      : undefined;

    if (
      limit !== undefined &&
      (!Number.isInteger(limit) ||
        limit < 1 ||
        limit > 500)
    ) {
      return json(
        {
          success: false,
          error: "Limit must be an integer between 1 and 500.",
        },
        400,
      );
    }

    const trades = await getPaperTrades({
      status: statusParam
        ? (statusParam as PaperTradeStatus)
        : undefined,
      symbol,
      limit,
    });

    return json({
      success: true,
      trades,
      summary: getPaperTradingSummary(trades),
    });
  } catch (error) {
    const msg = errorMessage(error);

    if (msg === "Authentication required.") {
      return json(
        { success: false, error: msg },
        401,
      );
    }

    return json(
      {
        success: false,
        error: "Unable to load paper trades.",
      },
      500,
    );
  }
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
        : "create";

    if (action === "create") {
      if (!isSide(body.side)) {
        return json(
          {
            success: false,
            error: "Invalid trade side.",
          },
          400,
        );
      }

      if (typeof body.symbol !== "string") {
        return json(
          {
            success: false,
            error: "Symbol is required.",
          },
          400,
        );
      }

      const trade = await createPaperTrade({
        symbol: body.symbol,
        side: body.side,
        quantity: Number(body.quantity),
        entryPrice: Number(body.entryPrice),
        stopLoss:
          body.stopLoss === null ||
          body.stopLoss === undefined
            ? null
            : Number(body.stopLoss),
        takeProfit:
          body.takeProfit === null ||
          body.takeProfit === undefined
            ? null
            : Number(body.takeProfit),
        notes:
          typeof body.notes === "string"
            ? body.notes
            : null,
      });

      return json(
        {
          success: true,
          trade,
        },
        201,
      );
    }

    if (action === "close") {
      const tradeId =
        typeof body.tradeId === "string"
          ? body.tradeId.trim()
          : "";

      if (!tradeId) {
        return json(
          {
            success: false,
            error: "Paper trade ID is required.",
          },
          400,
        );
      }

      const exitPrice = Number(
        body.exitPrice,
      );

      if (
        !Number.isFinite(exitPrice) ||
        exitPrice <= 0
      ) {
        return json(
          {
            success: false,
            error: "Exit price must be greater than zero.",
          },
          400,
        );
      }

      const trade = await closePaperTrade(
        tradeId,
        { exitPrice },
      );

      return json({
        success: true,
        trade,
      });
    }

    if (action === "cancel") {
      const tradeId =
        typeof body.tradeId === "string"
          ? body.tradeId.trim()
          : "";

      if (!tradeId) {
        return json(
          {
            success: false,
            error: "Paper trade ID is required.",
          },
          400,
        );
      }

      await cancelPaperTrade(tradeId);

      return json({
        success: true,
        message: "Paper trade cancelled.",
      });
    }

    return json(
      {
        success: false,
        error: "Unsupported action.",
      },
      400,
    );
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
      "Invalid trade side.",
      "Quantity must be greater than zero.",
      "Entry price must be greater than zero.",
      "Exit price must be greater than zero.",
      "Stop loss must be greater than zero.",
      "Take profit must be greater than zero.",
      "Buy stop loss must be below entry price.",
      "Buy take profit must be above entry price.",
      "Sell stop loss must be above entry price.",
      "Sell take profit must be below entry price.",
      "Paper trade not found.",
      "Only open paper trades can be closed.",
      "Invalid paper trade ID.",
      "Notes cannot exceed 1000 characters.",
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

    return json(
      {
        success: false,
        error: "Unable to process paper trade request.",
      },
      500,
    );
  }
}
