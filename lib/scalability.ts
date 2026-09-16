export type ScalabilityStatus =
  | "pass"
  | "warning"
  | "fail";

export interface ScalabilityCheck {
  id: string;
  area: string;
  status: ScalabilityStatus;
  metric: string;
  threshold: string;
  recommendation?: string;
}

export interface ScalabilityReport {
  passed: boolean;
  generatedAt: string;
  checks: ScalabilityCheck[];
  summary: {
    pass: number;
    warning: number;
    fail: number;
  };
}

const DEFAULT_LIMITS = {
  maxConcurrentAnalyses: 25,
  maxRequestBytes: 12 * 1024 * 1024,
  maxBacktestCandles: 10_000,
  maxNotificationsPerBatch: 100,
  maxAnalyticsEventsPerRequest: 1,
  maxDatabaseRowsPerBackup: 50_000,
};

function numberFromEnv(
  name: string,
  fallback: number,
): number {
  const value = Number(
    process.env[name],
  );

  return Number.isFinite(value) &&
    value > 0
    ? value
    : fallback;
}

export function getScalabilityLimits() {
  return {
    maxConcurrentAnalyses:
      numberFromEnv(
        "MAX_CONCURRENT_ANALYSES",
        DEFAULT_LIMITS.maxConcurrentAnalyses,
      ),
    maxRequestBytes:
      numberFromEnv(
        "MAX_REQUEST_BYTES",
        DEFAULT_LIMITS.maxRequestBytes,
      ),
    maxBacktestCandles:
      numberFromEnv(
        "MAX_BACKTEST_CANDLES",
        DEFAULT_LIMITS.maxBacktestCandles,
      ),
    maxNotificationsPerBatch:
      numberFromEnv(
        "MAX_NOTIFICATIONS_PER_BATCH",
        DEFAULT_LIMITS.maxNotificationsPerBatch,
      ),
    maxAnalyticsEventsPerRequest:
      DEFAULT_LIMITS.maxAnalyticsEventsPerRequest,
    maxDatabaseRowsPerBackup:
      numberFromEnv(
        "MAX_DATABASE_ROWS_PER_BACKUP",
        DEFAULT_LIMITS.maxDatabaseRowsPerBackup,
      ),
  };
}

export function validateScalabilityValue(
  value: number,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): boolean {
  return (
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

export function buildScalabilityReport(
  overrides?: Partial<
    Record<
      keyof ReturnType<
        typeof getScalabilityLimits
      >,
      number
    >
  >,
): ScalabilityReport {
  const limits = {
    ...getScalabilityLimits(),
    ...overrides,
  };

  const checks: ScalabilityCheck[] = [
    {
      id: "concurrent-analysis",
      area: "AI analysis",
      status:
        limits.maxConcurrentAnalyses >= 50
          ? "pass"
          : limits.maxConcurrentAnalyses >= 10
            ? "warning"
            : "fail",
      metric: `${limits.maxConcurrentAnalyses} concurrent analyses`,
      threshold: ">= 50 recommended for higher scale",
      recommendation:
        "Use queueing, rate limiting, caching, and provider-aware concurrency controls as traffic grows.",
    },
    {
      id: "request-size",
      area: "API",
      status:
        limits.maxRequestBytes >=
        10 * 1024 * 1024
          ? "pass"
          : "warning",
      metric: `${Math.round(limits.maxRequestBytes / (1024 * 1024))} MB maximum request`,
      threshold: ">= 10 MB for chart/image workflows",
      recommendation:
        "Keep uploads bounded and move large files to controlled object storage when needed.",
    },
    {
      id: "backtest-candles",
      area: "Backtesting",
      status:
        limits.maxBacktestCandles >=
        10_000
          ? "pass"
          : "warning",
      metric: `${limits.maxBacktestCandles} candles`,
      threshold: ">= 10,000 candles",
      recommendation:
        "For larger datasets, use pagination, streaming, or background jobs.",
    },
    {
      id: "notification-batch",
      area: "Notifications",
      status:
        limits.maxNotificationsPerBatch >=
        100
          ? "pass"
          : "warning",
      metric: `${limits.maxNotificationsPerBatch} notifications per batch`,
      threshold: ">= 100",
      recommendation:
        "Use background delivery and batching for high-volume notifications.",
    },
    {
      id: "analytics-batch",
      area: "Analytics",
      status:
        limits.maxAnalyticsEventsPerRequest <= 1
          ? "pass"
          : "warning",
      metric: `${limits.maxAnalyticsEventsPerRequest} event per request`,
      threshold: "Small bounded event payloads",
      recommendation:
        "Keep event payloads small and avoid sensitive or unnecessary metadata.",
    },
    {
      id: "backup-rows",
      area: "Database backup",
      status:
        limits.maxDatabaseRowsPerBackup >=
        50_000
          ? "pass"
          : "warning",
      metric: `${limits.maxDatabaseRowsPerBackup} rows per table`,
      threshold: ">= 50,000",
      recommendation:
        "For larger databases, use incremental or provider-native backups.",
    },
  ];

  const summary = {
    pass: checks.filter(
      (check) => check.status === "pass",
    ).length,
    warning: checks.filter(
      (check) => check.status === "warning",
    ).length,
    fail: checks.filter(
      (check) => check.status === "fail",
    ).length,
  };

  return {
    passed: summary.fail === 0,
    generatedAt:
      new Date().toISOString(),
    checks,
    summary,
  };
}

export function getScalabilityChecklist() {
  return [
    "Rate-limit expensive AI requests.",
    "Keep API request and upload sizes bounded.",
    "Use pagination for database reads.",
    "Avoid unbounded analytics and notification payloads.",
    "Use background jobs for long-running workloads.",
    "Cache safe, repeatable read operations.",
    "Monitor AI provider usage and cost.",
    "Use database indexes for frequent filters.",
    "Keep backup operations bounded.",
    "Test failure and recovery paths before production.",
  ];
}
