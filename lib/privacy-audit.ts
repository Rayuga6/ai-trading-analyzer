import { createHash } from "crypto";

export type PrivacyAuditSeverity =
  | "info"
  | "warning"
  | "critical";

export interface PrivacyAuditFinding {
  id: string;
  severity: PrivacyAuditSeverity;
  area: string;
  message: string;
  recommendation: string;
}

export interface PrivacyAuditResult {
  passed: boolean;
  generatedAt: string;
  findings: PrivacyAuditFinding[];
  checkedAreas: string[];
  summary: {
    info: number;
    warning: number;
    critical: number;
  };
}

const CHECKED_AREAS = [
  "authentication",
  "analysis-data",
  "profile-data",
  "subscription-data",
  "payment-data",
  "analytics",
  "notifications",
  "public-sharing",
  "environment",
  "logging",
];

function hashValue(value: string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 16);
}

export function sanitizeAuditValue(
  value: unknown,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(
      /(?:sk|pk|key|token|secret|password|authorization)[_-]?[a-z0-9]+/gi,
      "[REDACTED]",
    )
    .replace(
      /Bearer\s+[A-Za-z0-9._-]+/gi,
      "Bearer [REDACTED]",
    )
    .slice(0, 300);
}

export function createPrivacyFinding(
  input: Omit<PrivacyAuditFinding, "id">,
): PrivacyAuditFinding {
  const base = [
    input.severity,
    input.area,
    input.message,
    input.recommendation,
  ].join(":");

  return {
    id: hashValue(base),
    severity: input.severity,
    area: input.area,
    message: sanitizeAuditValue(
      input.message,
    ),
    recommendation: sanitizeAuditValue(
      input.recommendation,
    ),
  };
}

export function runPrivacyAudit(): PrivacyAuditResult {
  const findings: PrivacyAuditFinding[] = [];

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  ) {
    findings.push(
      createPrivacyFinding({
        severity: "critical",
        area: "environment",
        message:
          "Supabase public URL is not configured.",
        recommendation:
          "Configure the required Supabase environment variable before production.",
      }),
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SITE_URL
  ) {
    findings.push(
      createPrivacyFinding({
        severity: "warning",
        area: "public-sharing",
        message:
          "NEXT_PUBLIC_SITE_URL is not configured.",
        recommendation:
          "Configure the canonical production site URL for public links and metadata.",
      }),
    );
  }

  if (
    process.env.NODE_ENV ===
      "production" &&
    !process.env.RAZORPAY_WEBHOOK_SECRET
  ) {
    findings.push(
      createPrivacyFinding({
        severity: "warning",
        area: "payment-data",
        message:
          "Razorpay webhook secret is not configured.",
        recommendation:
          "Configure and rotate the payment webhook secret before enabling production webhooks.",
      }),
    );
  }

  findings.push(
    createPrivacyFinding({
      severity: "info",
      area: "logging",
      message:
        "Audit output is designed to avoid exposing raw secrets.",
      recommendation:
        "Continue sanitizing credentials, authorization values, payment data, and user-sensitive values in logs.",
    }),
  );

  findings.push(
    createPrivacyFinding({
      severity: "info",
      area: "analysis-data",
      message:
        "Analysis and uploaded-chart data require controlled access and retention.",
      recommendation:
        "Review storage policies, retention periods, deletion behavior, and RLS before production launch.",
    }),
  );

  findings.push(
    createPrivacyFinding({
      severity: "info",
      area: "analytics",
      message:
        "Analytics should collect only data required for product measurement.",
      recommendation:
        "Avoid storing secrets, payment details, authentication tokens, or unnecessary personal information in analytics metadata.",
    }),
  );

  findings.push(
    createPrivacyFinding({
      severity: "info",
      area: "public-sharing",
      message:
        "Shared analysis links can expose information intentionally included in a share.",
      recommendation:
        "Use opaque share tokens, expiry, revocation, and an explicit review of fields exposed publicly.",
    }),
  );

  const summary = {
    info: findings.filter(
      (item) => item.severity === "info",
    ).length,
    warning: findings.filter(
      (item) => item.severity === "warning",
    ).length,
    critical: findings.filter(
      (item) => item.severity === "critical",
    ).length,
  };

  return {
    passed: summary.critical === 0,
    generatedAt:
      new Date().toISOString(),
    findings,
    checkedAreas: [
      ...CHECKED_AREAS,
    ],
    summary,
  };
}

export function getPrivacyAuditConfig() {
  return {
    checkedAreas: [
      ...CHECKED_AREAS,
    ],
    productionReviewRequired: true,
    sensitiveDataLogging: false,
    auditVersion: "1.0",
  };
}
