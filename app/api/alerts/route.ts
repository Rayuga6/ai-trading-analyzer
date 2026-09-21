import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";

import {
  createAlert as createInMemoryAlert,
  validateAlertBatch,
  type AlertChannel,
  type AlertSeverity,
  type AlertType,
} from "@/lib/alerts";

import {
  createAlert as createDatabaseAlert,
  getUserAlerts,
  markAlertsRead as markDatabaseAlertsRead,
} from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isAlertType(value: unknown): value is AlertType {
  return (
    value === "price" ||
    value === "ai_analysis" ||
    value === "risk" ||
    value === "system"
  );
}

function isSeverity(value: unknown): value is AlertSeverity {
  return (
    value === "info" ||
    value === "success" ||
    value === "warning" ||
    value === "critical"
  );
}

function normalizeChannels(value: unknown): AlertChannel[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const allowed: AlertChannel[] = ["in_app", "email", "push"];

  return [
    ...new Set(
      value.filter((channel): channel is AlertChannel =>
        allowed.includes(channel)
      )
    ),
  ].slice(0, 3);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const alerts = await getUserAlerts();

    return json({
      success: true,
      userId: user.id,
      alerts,
      persisted: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "Authentication required.") {
      return json({ error: "Authentication required." }, 401);
    }

    console.error("Alerts GET error:", error);

    return json({ error: "Unable to load alerts." }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();

    const contentLength = Number(
      request.headers.get("content-length") || 0
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_BODY_BYTES
    ) {
      return json({ error: "Alert request is too large." }, 413);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON request body." }, 400);
    }

    if (!isRecord(body)) {
      return json({ error: "Invalid alert request." }, 400);
    }

    const action =
      typeof body.action === "string" ? body.action.trim() : "create";

    if (action === "create") {
      if (!isAlertType(body.type)) {
        return json({ error: "Invalid alert type." }, 400);
      }

      const title = cleanText(body.title, 120);
      const message = cleanText(body.message, 1000);

      if (!title || !message) {
        return json(
          { error: "Alert title and message are required." },
          400
        );
      }

      const severity = isSeverity(body.severity) ? body.severity : "info";
      const channels = normalizeChannels(body.channels);

      const symbol = cleanText(body.symbol, 40);
      const market = cleanText(body.market, 40);
      const timeframe = cleanText(body.timeframe, 20);
      const signal = cleanText(body.signal, 40);

      const confidence = isFiniteNumber(body.confidence)
        ? body.confidence
        : undefined;

      const triggerPrice = isFiniteNumber(body.triggerPrice)
        ? body.triggerPrice
        : undefined;

      const currentPrice = isFiniteNumber(body.currentPrice)
        ? body.currentPrice
        : undefined;

      if (
        confidence !== undefined &&
        (confidence < 0 || confidence > 100)
      ) {
        return json(
          { error: "Confidence must be between 0 and 100." },
          400
        );
      }

      const expiresAt =
        typeof body.expiresAt === "string"
          ? body.expiresAt
          : undefined;

      const metadata = isRecord(body.metadata)
        ? body.metadata
        : undefined;

      const validatedAlert = createInMemoryAlert({
        userId: user.id,
        type: body.type,
        severity,
        title,
        message,
        symbol: symbol || undefined,
        market: market || undefined,
        timeframe: timeframe || undefined,
        signal: signal || undefined,
        confidence,
        triggerPrice,
        currentPrice,
        channels,
        expiresAt,
        metadata,
      });

      const persistedAlert = await createDatabaseAlert({
        type: validatedAlert.type,
        severity: validatedAlert.severity,
        title: validatedAlert.title,
        message: validatedAlert.message,
        symbol: validatedAlert.symbol ?? null,
        market: validatedAlert.market ?? null,
        timeframe: validatedAlert.timeframe ?? null,
        trigger_price: validatedAlert.triggerPrice ?? null,
        current_price: validatedAlert.currentPrice ?? null,
        signal: validatedAlert.signal ?? null,
        confidence: validatedAlert.confidence ?? null,
        channels: validatedAlert.channels ?? ["in_app"],
        expires_at: validatedAlert.expiresAt ?? null,
        metadata: validatedAlert.metadata ?? {},
        read: false,
      });

      return json(
        {
          success: true,
          alert: persistedAlert,
          persisted: true,
        },
        201
      );
    }

    if (action === "mark-read") {
      const ids = Array.isArray(body.ids)
        ? body.ids
            .filter((id): id is string => typeof id === "string")
            .map((id) => cleanText(id, 100))
            .filter(Boolean)
            .slice(0, 50)
        : [];

      if (ids.length === 0) {
        return json(
          { error: "At least one alert ID is required." },
          400
        );
      }

      const updated = await markDatabaseAlertsRead(ids);

      return json({
        success: true,
        updated,
        persisted: true,
      });
    }

    if (action === "validate-batch") {
      const alerts = Array.isArray(body.alerts) ? body.alerts : [];

      try {
        validateAlertBatch(alerts as never[]);
      } catch (error) {
        return json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Invalid alert batch.",
          },
          400
        );
      }

      return json({
        success: true,
        valid: true,
        count: alerts.length,
      });
    }

    return json({ error: "Invalid alert action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "Authentication required.") {
      return json({ error: "Authentication required." }, 401);
    }

    console.error("Alerts POST error:", error);

    return json(
      { error: "Unable to process alert request." },
      500
    );
  }
}