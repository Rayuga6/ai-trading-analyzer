import { NextRequest, NextResponse } from "next/server";
import {
  getAccuracyRecords,
  getPerformanceSummary,
  saveAccuracyRecord,
  updateAccuracyRecord,
  type SignalResult,
} from "@/lib/accuracy";
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

function isSignalResult(value: unknown): value is SignalResult {
  return (
    value === "correct" ||
    value === "incorrect" ||
    value === "neutral" ||
    value === "pending"
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireUser();

    const symbol =
      request.nextUrl.searchParams.get("symbol")?.trim() ||
      undefined;

    const resultParam =
      request.nextUrl.searchParams.get("result")?.trim();

    const result = isSignalResult(resultParam)
      ? resultParam
      : undefined;

    const limitParam =
      request.nextUrl.searchParams.get("limit");

    const parsedLimit = limitParam
      ? Number(limitParam)
      : undefined;

    if (
      parsedLimit !== undefined &&
      (!Number.isInteger(parsedLimit) ||
        parsedLimit < 1 ||
        parsedLimit > 500)
    ) {
      return json(
        {
          success: false,
          error: "Limit must be an integer between 1 and 500.",
        },
        400,
      );
    }

    const [records, summary] = await Promise.all([
      getAccuracyRecords({
        symbol,
        result,
        limit: parsedLimit,
      }),
      getPerformanceSummary(),
    ]);

    return json({
      success: true,
      records,
      summary,
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
        error: "Unable to load accuracy data.",
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
      if (typeof body.analysisId !== "string") {
        return json(
          {
            success: false,
            error: "Analysis ID is required.",
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

      if (typeof body.timeframe !== "string") {
        return json(
          {
            success: false,
            error: "Timeframe is required.",
          },
          400,
        );
      }

      if (typeof body.signal !== "string") {
        return json(
          {
            success: false,
            error: "Signal is required.",
          },
          400,
        );
      }

      const record = await saveAccuracyRecord({
        analysisId: body.analysisId.trim(),
        symbol: body.symbol.trim(),
        timeframe: body.timeframe.trim(),
        signal: body.signal.trim(),
        confidence:
          body.confidence === null ||
          body.confidence === undefined
            ? null
            : Number(body.confidence),
        entryPrice:
          body.entryPrice === null ||
          body.entryPrice === undefined
            ? null
            : Number(body.entryPrice),
      });

      return json(
        {
          success: true,
          record,
        },
        201,
      );
    }

    if (action === "evaluate") {
      const recordId =
        typeof body.recordId === "string"
          ? body.recordId.trim()
          : "";

      if (!recordId) {
        return json(
          {
            success: false,
            error: "Accuracy record ID is required.",
          },
          400,
        );
      }

      const evaluatedPrice = Number(
        body.evaluatedPrice,
      );

      if (
        !Number.isFinite(evaluatedPrice) ||
        evaluatedPrice <= 0
      ) {
        return json(
          {
            success: false,
            error: "Evaluated price must be greater than zero.",
          },
          400,
        );
      }

      const neutralThreshold =
        body.neutralThresholdPercent ===
          undefined ||
        body.neutralThresholdPercent === null
          ? 0.1
          : Number(body.neutralThresholdPercent);

      if (
        !Number.isFinite(neutralThreshold) ||
        neutralThreshold < 0 ||
        neutralThreshold > 100
      ) {
        return json(
          {
            success: false,
            error: "Invalid neutral threshold.",
          },
          400,
        );
      }

      const record = await updateAccuracyRecord(
        recordId,
        evaluatedPrice,
        neutralThreshold,
      );

      return json({
        success: true,
        record,
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
        { success: false, error: msg },
        401,
      );
    }

    const clientErrors = [
      "Analysis ID is required.",
      "Symbol is required.",
      "Timeframe is required.",
      "Signal is required.",
      "Invalid analysis ID.",
      "Invalid symbol.",
      "Invalid timeframe.",
      "Invalid signal.",
      "Confidence must be between 0 and 100.",
      "Entry price must be greater than zero.",
      "Invalid accuracy record ID.",
      "Invalid evaluated price.",
      "Accuracy record not found.",
      "Accuracy record has no entry price.",
      "Invalid neutral threshold.",
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
        error: "Unable to process accuracy request.",
      },
      500,
    );
  }
}
