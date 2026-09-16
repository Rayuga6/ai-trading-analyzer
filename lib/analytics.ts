import { createHash, randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { assertValidId, sanitizeText } from "@/lib/security";

export type AnalyticsEventName =
  | "page_view"
  | "analysis_started"
  | "analysis_completed"
  | "analysis_failed"
  | "subscription_viewed"
  | "subscription_started"
  | "subscription_cancelled"
  | "alert_created"
  | "share_created"
  | "feedback_submitted"
  | "backtest_run"
  | "paper_trade_created"
  | "contact_submitted";

export type AnalyticsEvent = {
  id: string;
  userId?: string | null;
  event: AnalyticsEventName;
  path?: string | null;
  symbol?: string | null;
  plan?: string | null;
  properties?: Record<string, unknown>;
  createdAt: string;
};

export type AnalyticsSummary = {
  totalEvents: number;
  uniqueUsers: number;
  byEvent: Record<string, number>;
  byPlan: Record<string, number>;
  byPath: Record<string, number>;
  periodStart: string;
  periodEnd: string;
};

const MAX_PROPERTY_KEYS = 30;
const MAX_STRING_LENGTH = 300;

const ALLOWED_EVENTS = new Set<AnalyticsEventName>([
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
]);

function cleanProperties(
  properties?: Record<string, unknown>,
): Record<string, unknown> {
  if (!properties || typeof properties !== "object") return {};

  const result: Record<string, unknown> = {};

  for (const [rawKey, value] of Object.entries(properties).slice(0, MAX_PROPERTY_KEYS)) {
    const key = sanitizeText(rawKey, {
      fallback: "property",
      maxLength: 80,
      lowercase: true,
    });

    if (!key) continue;

    if (typeof value === "string") {
      result[key] = sanitizeText(value, {
        fallback: "",
        maxLength: MAX_STRING_LENGTH,
      });
    } else if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = value;
    } else if (typeof value === "boolean" || value === null) {
      result[key] = value;
    }
  }

  return result;
}

function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

export function validateAnalyticsEvent(
  event: string,
): event is AnalyticsEventName {
  return ALLOWED_EVENTS.has(event as AnalyticsEventName);
}

export function createAnalyticsEvent(input: {
  event: AnalyticsEventName;
  userId?: string | null;
  path?: string | null;
  symbol?: string | null;
  plan?: string | null;
  properties?: Record<string, unknown>;
}): AnalyticsEvent {
  if (!validateAnalyticsEvent(input.event)) {
    throw new Error("Invalid analytics event.");
  }

  let userId: string | null = null;

  if (input.userId) {
    try {
      userId = assertValidId(input.userId);
    } catch {
      userId = null;
    }
  }

  return {
    id: randomUUID(),
    userId,
    event: input.event,
    path: input.path
      ? sanitizeText(input.path, { fallback: "/", maxLength: 200 })
      : null,
    symbol: input.symbol
      ? sanitizeText(input.symbol, {
          fallback: "",
          maxLength: 30,
          lowercase: true,
        })
      : null,
    plan: input.plan
      ? sanitizeText(input.plan, {
          fallback: "",
          maxLength: 50,
          lowercase: true,
        })
      : null,
    properties: cleanProperties(input.properties),
    createdAt: new Date().toISOString(),
  };
}

export async function trackAnalyticsEvent(input: {
  event: AnalyticsEventName;
  userId?: string | null;
  path?: string | null;
  symbol?: string | null;
  plan?: string | null;
  properties?: Record<string, unknown>;
}): Promise<AnalyticsEvent> {
  const event = createAnalyticsEvent(input);
  const supabase = await createClient();

  const { error } = await supabase.from("analytics_events").insert({
    id: event.id,
    user_id: event.userId ? hashUserId(event.userId) : null,
    event_name: event.event,
    path: event.path,
    symbol: event.symbol,
    plan: event.plan,
    properties: event.properties,
    created_at: event.createdAt,
  });

  if (error) throw new Error("Failed to store analytics event.");

  return event;
}

type AnalyticsDbRow = {
  id: string;
  user_id: string | null;
  event_name: string;
  path: string | null;
  symbol: string | null;
  plan: string | null;
  properties: unknown;
  created_at: string;
};

export async function getAnalyticsEvents(options?: {
  userId?: string;
  event?: AnalyticsEventName;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<AnalyticsEvent[]> {
  const supabase = await createClient();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 1000);

  let query = supabase
    .from("analytics_events")
    .select("id,user_id,event_name,path,symbol,plan,properties,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.userId) {
    try {
      const userId = assertValidId(options.userId);
      query = query.eq("user_id", hashUserId(userId));
    } catch {
      // Ignore an invalid optional user ID filter.
    }
  }

  if (options?.event && validateAnalyticsEvent(options.event)) {
    query = query.eq("event_name", options.event);
  }

  if (options?.startDate) query = query.gte("created_at", options.startDate);
  if (options?.endDate) query = query.lte("created_at", options.endDate);

  const { data, error } = await query;
  if (error) throw new Error("Failed to load analytics events.");

  return (data ?? []).map((row: AnalyticsDbRow) => ({
    id: row.id,
    userId: null,
    event: row.event_name as AnalyticsEventName,
    path: row.path,
    symbol: row.symbol,
    plan: row.plan,
    properties:
      row.properties && typeof row.properties === "object" && !Array.isArray(row.properties)
        ? (row.properties as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  }));
}

export function summarizeAnalytics(
  events: AnalyticsEvent[],
  periodStart: string,
  periodEnd: string,
): AnalyticsSummary {
  const byEvent: Record<string, number> = {};
  const byPlan: Record<string, number> = {};
  const byPath: Record<string, number> = {};
  const users = new Set<string>();

  for (const event of events) {
    byEvent[event.event] = (byEvent[event.event] ?? 0) + 1;
    if (event.plan) byPlan[event.plan] = (byPlan[event.plan] ?? 0) + 1;
    if (event.path) byPath[event.path] = (byPath[event.path] ?? 0) + 1;
    if (event.userId) users.add(event.userId);
  }

  return {
    totalEvents: events.length,
    uniqueUsers: users.size,
    byEvent,
    byPlan,
    byPath,
    periodStart,
    periodEnd,
  };
}

export function getAnalyticsConfig() {
  return {
    enabled: process.env.ANALYTICS_ENABLED !== "false",
    retentionDays: Number(process.env.ANALYTICS_RETENTION_DAYS ?? 90),
    maxProperties: MAX_PROPERTY_KEYS,
    maxStringLength: MAX_STRING_LENGTH,
  };
}
