export type AlertType =
  | "price"
  | "ai_analysis"
  | "risk"
  | "system";

export type AlertSeverity =
  | "info"
  | "success"
  | "warning"
  | "critical";

export type AlertChannel =
  | "in_app"
  | "email"
  | "push";

export interface TradingAlert {
  id: string;
  userId: string;
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
  channels: AlertChannel[];
  read: boolean;
  createdAt: string;
  expiresAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CreateAlertInput {
  userId: string;
  type: AlertType;
  severity?: AlertSeverity;
  title: string;
  message: string;
  symbol?: string;
  market?: string;
  timeframe?: string;
  triggerPrice?: number;
  currentPrice?: number;
  signal?: string;
  confidence?: number;
  channels?: AlertChannel[];
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface PriceAlertRule {
  id: string;
  userId: string;
  symbol: string;
  market: string;
  condition: "above" | "below";
  targetPrice: number;
  enabled: boolean;
  channels: AlertChannel[];
  createdAt: string;
  updatedAt: string;
}

const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_ALERTS_PER_BATCH = 20;

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validPositiveNumber(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function validConfidence(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function normalizeChannels(
  channels?: AlertChannel[]
): AlertChannel[] {
  const allowed: AlertChannel[] = [
    "in_app",
    "email",
    "push",
  ];

  const selected = Array.isArray(channels)
    ? channels.filter((channel) =>
        allowed.includes(channel)
      )
    : ["in_app"] as AlertChannel[];

  return [...new Set(selected)].slice(0, 3);
}

export function createAlert(
  input: CreateAlertInput
): TradingAlert {
  if (!input.userId?.trim()) {
    throw new Error("Alert user ID is required.");
  }

  const title = cleanText(
    input.title,
    MAX_TITLE_LENGTH
  );
  const message = cleanText(
    input.message,
    MAX_MESSAGE_LENGTH
  );

  if (!title || !message) {
    throw new Error("Alert title and message are required.");
  }

  if (
    input.triggerPrice !== undefined &&
    !validPositiveNumber(input.triggerPrice)
  ) {
    throw new Error("Invalid alert trigger price.");
  }

  if (
    input.currentPrice !== undefined &&
    !validPositiveNumber(input.currentPrice)
  ) {
    throw new Error("Invalid alert current price.");
  }

  if (
    input.confidence !== undefined &&
    !validConfidence(input.confidence)
  ) {
    throw new Error("Alert confidence must be between 0 and 100.");
  }

  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    type: input.type,
    severity: input.severity ?? "info",
    title,
    message,
    symbol: cleanText(input.symbol, 40) || null,
    market: cleanText(input.market, 40) || null,
    timeframe: cleanText(input.timeframe, 20) || null,
    triggerPrice:
      input.triggerPrice !== undefined
        ? Number(input.triggerPrice)
        : null,
    currentPrice:
      input.currentPrice !== undefined
        ? Number(input.currentPrice)
        : null,
    signal: cleanText(input.signal, 40) || null,
    confidence:
      input.confidence !== undefined
        ? Number(input.confidence)
        : null,
    channels: normalizeChannels(input.channels),
    read: false,
    createdAt: now,
    expiresAt: input.expiresAt ?? null,
    metadata: input.metadata ?? {},
  };
}

export function createPriceAlert(
  input: Omit<CreateAlertInput, "type" | "title" | "message"> & {
    title?: string;
    message?: string;
  }
): TradingAlert {
  const symbol = cleanText(input.symbol, 40);

  if (!symbol) {
    throw new Error("Price alert symbol is required.");
  }

  const condition =
    input.metadata?.condition === "below"
      ? "below"
      : "above";

  const targetPrice = input.triggerPrice;

  if (
    targetPrice === undefined ||
    !validPositiveNumber(targetPrice)
  ) {
    throw new Error("A valid target price is required.");
  }

  return createAlert({
    ...input,
    type: "price",
    title:
      input.title ??
      `${symbol} price alert`,
    message:
      input.message ??
      `${symbol} price moved ${condition} the configured level.`,
    metadata: {
      ...(input.metadata ?? {}),
      condition,
      targetPrice,
    },
  });
}

export function createAIAnalysisAlert(
  input: Omit<CreateAlertInput, "type">
): TradingAlert {
  return createAlert({
    ...input,
    type: "ai_analysis",
    severity: input.severity ?? "info",
  });
}

export function isAlertExpired(
  alert: TradingAlert,
  now = new Date()
) {
  if (!alert.expiresAt) {
    return false;
  }

  const expiresAt = new Date(alert.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return true;
  }

  return expiresAt.getTime() <= now.getTime();
}

export function markAlertRead(
  alert: TradingAlert
): TradingAlert {
  return {
    ...alert,
    read: true,
  };
}

export function markAlertsRead(
  alerts: TradingAlert[],
  ids?: string[]
): TradingAlert[] {
  const idSet = ids?.length
    ? new Set(ids)
    : null;

  return alerts.map((alert) => {
    if (!idSet || idSet.has(alert.id)) {
      return markAlertRead(alert);
    }

    return alert;
  });
}

export function filterActiveAlerts(
  alerts: TradingAlert[],
  now = new Date()
) {
  return alerts.filter(
    (alert) => !isAlertExpired(alert, now)
  );
}

export function sortAlerts(
  alerts: TradingAlert[]
): TradingAlert[] {
  return [...alerts].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}

export function getUnreadAlertCount(
  alerts: TradingAlert[]
) {
  return filterActiveAlerts(alerts).filter(
    (alert) => !alert.read
  ).length;
}

export function getAlertSummary(
  alerts: TradingAlert[]
) {
  const active = filterActiveAlerts(alerts);

  return {
    total: active.length,
    unread: active.filter(
      (alert) => !alert.read
    ).length,
    critical: active.filter(
      (alert) => alert.severity === "critical"
    ).length,
    warnings: active.filter(
      (alert) => alert.severity === "warning"
    ).length,
    price: active.filter(
      (alert) => alert.type === "price"
    ).length,
    aiAnalysis: active.filter(
      (alert) => alert.type === "ai_analysis"
    ).length,
  };
}

export function validateAlertBatch(
  alerts: TradingAlert[]
) {
  if (!Array.isArray(alerts)) {
    throw new Error("Alerts must be an array.");
  }

  if (alerts.length > MAX_ALERTS_PER_BATCH) {
    throw new Error(
      `A maximum of ${MAX_ALERTS_PER_BATCH} alerts can be processed at once.`
    );
  }

  return alerts;
}

export function shouldTriggerPriceAlert(
  rule: PriceAlertRule,
  currentPrice: number
) {
  if (
    !rule.enabled ||
    !validPositiveNumber(currentPrice) ||
    !validPositiveNumber(rule.targetPrice)
  ) {
    return false;
  }

  if (rule.condition === "above") {
    return currentPrice >= rule.targetPrice;
  }

  return currentPrice <= rule.targetPrice;
}

export function buildPriceAlertMessage(
  rule: PriceAlertRule,
  currentPrice: number
) {
  const direction =
    rule.condition === "above"
      ? "reached or moved above"
      : "reached or moved below";

  return `${rule.symbol} ${direction} ${rule.targetPrice}. Current price: ${currentPrice}.`;
}

/**
 * Creates a price alert only when a rule has actually triggered.
 * Callers should persist/send the returned alert through the API layer.
 */
export function evaluatePriceAlert(
  rule: PriceAlertRule,
  currentPrice: number
): TradingAlert | null {
  if (!shouldTriggerPriceAlert(rule, currentPrice)) {
    return null;
  }

  return createPriceAlert({
    userId: rule.userId,
    symbol: rule.symbol,
    market: rule.market,
    currentPrice,
    triggerPrice: rule.targetPrice,
    channels: rule.channels,
    metadata: {
      condition: rule.condition,
      ruleId: rule.id,
    },
    message: buildPriceAlertMessage(
      rule,
      currentPrice
    ),
  });
}

export function buildAIAnalysisAlertMessage(
  symbol: string,
  signal: string,
  confidence?: number
) {
  const confidenceText =
    validConfidence(confidence)
      ? ` Confidence: ${confidence}%.`
      : "";

  return `AI analysis for ${symbol}: ${signal}.${confidenceText}`;
}
