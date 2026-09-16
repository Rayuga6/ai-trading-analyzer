import { NextRequest, NextResponse } from "next/server";
import {
  trackAnalyticsEvent,
  getAnalyticsEvents,
  summarizeAnalytics,
  getAnalyticsConfig,
  type AnalyticsEventName,
} from "@/lib/analytics";
import { getServerUser } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

const EVENT_NAMES: AnalyticsEventName[] = [
  "page_view",
  "analysis_started",
  "analysis_completed",
  "analysis_failed",
  "subscription_viewed",
  "subscription_started",
  "subscription_cancelled",
  "alert_created",
  "share_created",
  "feedback_submitted",
  "backtest_run",
  "paper_trade_created",
  "contact_submitted",
];

function isEventName(
  value: unknown,
): value is AnalyticsEventName {
  return (
    typeof value === "string" &&
    EVENT_NAMES.includes(value as AnalyticsEventName)
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    if (!getAnalyticsConfig().enabled) {
      return jsonResponse({
        success: true,
        enabled: false,
        events: [],
        summary: {
          totalEvents: 0,
          uniqueUsers: 0,
          byEvent: {},
          byPlan: {},
          byPath: {},
          periodStart: new Date().toISOString(),
          periodEnd: new Date().toISOString(),
        },
      });
    }

    const eventParam = request.nextUrl.searchParams.get("event");
    const event = isEventName(eventParam)
      ? eventParam
      : undefined;

    const requestedLimit = Number(
      request.nextUrl.searchParams.get("limit") ?? "100",
    );

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(500, Math.max(1, Math.floor(requestedLimit)))
      : 100;

    const events = await getAnalyticsEvents({
      userId: user.id,
      event,
      limit,
    });

    const now = new Date().toISOString();
    const periodStart =
      events.length > 0
        ? events[events.length - 1].createdAt
        : now;
    const periodEnd =
      events.length > 0
        ? events[0].createdAt
        : now;

    return jsonResponse({
      success: true,
      enabled: true,
      events,
      summary: summarizeAnalytics(
        events,
        periodStart,
        periodEnd,
      ),
    });
  } catch (error) {
    console.error(
      "Analytics GET error:",
      sanitizeText(
        error instanceof Error
          ? error.message
          : "Unknown error",
        { maxLength: 300 },
      ),
    );

    return jsonResponse(
      { error: "Unable to load analytics." },
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return jsonResponse({ error: "Unauthorized." }, 401);
    }

    if (!getAnalyticsConfig().enabled) {
      return jsonResponse({
        success: true,
        enabled: false,
        message: "Analytics is currently disabled.",
      });
    }

    const contentLength = Number(
      request.headers.get("content-length") ?? "0",
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_BODY_BYTES
    ) {
      return jsonResponse(
        { error: "Request body is too large." },
        413,
      );
    }

    let body: Record<string, unknown>;

    try {
      const parsed = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return jsonResponse(
          { error: "Invalid JSON body." },
          400,
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body." },
        400,
      );
    }

    const event = body.event;

    if (!isEventName(event)) {
      return jsonResponse(
        { error: "Invalid analytics event." },
        400,
      );
    }

    const properties: Record<string, unknown> = {};

    if (
      body.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
    ) {
      Object.assign(
        properties,
        body.metadata as Record<string, unknown>,
      );
    }

    if (typeof body.sessionId === "string") {
      properties.sessionId = body.sessionId;
    }

    const analyticsEvent = await trackAnalyticsEvent({
      userId: user.id,
      event,
      path:
        typeof body.path === "string"
          ? body.path
          : null,
      symbol:
        typeof body.symbol === "string"
          ? body.symbol
          : null,
      plan:
        typeof body.plan === "string"
          ? body.plan
          : null,
      properties,
    });

    return jsonResponse(
      {
        success: true,
        event: analyticsEvent,
      },
      201,
    );
  } catch (error) {
    console.error(
      "Analytics POST error:",
      sanitizeText(
        error instanceof Error
          ? error.message
          : "Unknown error",
        { maxLength: 300 },
      ),
    );

    const message =
      error instanceof Error &&
      error.message.startsWith("Invalid")
        ? error.message
        : "Unable to record analytics event.";

    return jsonResponse(
      { error: message },
      message.startsWith("Invalid") ? 400 : 500,
    );
  }
}
