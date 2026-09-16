export type FeatureFlagKey =
  | "referrals"
  | "coupons"
  | "alerts"
  | "paperTrading"
  | "backtesting"
  | "notifications"
  | "analytics"
  | "multiLanguage"
  | "pwa"
  | "adminDashboard";

export type FeatureFlagValue =
  | boolean
  | number
  | string;

export interface FeatureFlag {
  key: FeatureFlagKey;
  enabled: boolean;
  value?: FeatureFlagValue;
  description: string;
}

const DEFAULT_FLAGS: Record<
  FeatureFlagKey,
  FeatureFlag
> = {
  referrals: {
    key: "referrals",
    enabled:
      process.env.REFERRAL_ENABLED !== "false",
    description:
      "Referral program availability.",
  },
  coupons: {
    key: "coupons",
    enabled:
      process.env.COUPONS_ENABLED !== "false",
    description:
      "Coupon and promotional-code availability.",
  },
  alerts: {
    key: "alerts",
    enabled:
      process.env.ALERTS_ENABLED !== "false",
    description:
      "Trading and system alert functionality.",
  },
  paperTrading: {
    key: "paperTrading",
    enabled:
      process.env.PAPER_TRADING_ENABLED !==
      "false",
    description:
      "Simulated paper-trading functionality.",
  },
  backtesting: {
    key: "backtesting",
    enabled:
      process.env.BACKTESTING_ENABLED !==
      "false",
    description:
      "Historical strategy backtesting.",
  },
  notifications: {
    key: "notifications",
    enabled:
      process.env.NOTIFICATIONS_ENABLED !==
      "false",
    description:
      "User notification functionality.",
  },
  analytics: {
    key: "analytics",
    enabled:
      process.env.ANALYTICS_ENABLED !== "false",
    description:
      "Platform analytics functionality.",
  },
  multiLanguage: {
    key: "multiLanguage",
    enabled:
      process.env.MULTILANGUAGE_ENABLED !==
      "false",
    description:
      "English, Hindi, and Gujarati language support.",
  },
  pwa: {
    key: "pwa",
    enabled:
      process.env.PWA_ENABLED !== "false",
    description:
      "Progressive Web App functionality.",
  },
  adminDashboard: {
    key: "adminDashboard",
    enabled:
      process.env.ADMIN_DASHBOARD_ENABLED !==
      "false",
    description:
      "Administrative dashboard functionality.",
  },
};

function isFeatureFlagKey(
  value: unknown,
): value is FeatureFlagKey {
  return (
    value === "referrals" ||
    value === "coupons" ||
    value === "alerts" ||
    value === "paperTrading" ||
    value === "backtesting" ||
    value === "notifications" ||
    value === "analytics" ||
    value === "multiLanguage" ||
    value === "pwa" ||
    value === "adminDashboard"
  );
}

export function getFeatureFlag(
  key: FeatureFlagKey,
): FeatureFlag {
  return {
    ...DEFAULT_FLAGS[key],
  };
}

export function isFeatureEnabled(
  key: FeatureFlagKey,
): boolean {
  return DEFAULT_FLAGS[key].enabled;
}

export function getFeatureFlags(): Record<
  FeatureFlagKey,
  FeatureFlag
> {
  return Object.fromEntries(
    Object.entries(DEFAULT_FLAGS).map(
      ([key, flag]) => [
        key,
        { ...flag },
      ],
    ),
  ) as Record<
    FeatureFlagKey,
    FeatureFlag
  >;
}

export function getPublicFeatureFlags() {
  const flags = getFeatureFlags();

  return Object.fromEntries(
    Object.entries(flags).map(
      ([key, flag]) => [
        key,
        {
          enabled: flag.enabled,
        },
      ],
    ),
  ) as Record<
    FeatureFlagKey,
    { enabled: boolean }
  >;
}

export function getFeatureFlagKeys(): FeatureFlagKey[] {
  return Object.keys(
    DEFAULT_FLAGS,
  ) as FeatureFlagKey[];
}

export function parseFeatureFlagKey(
  value: unknown,
): FeatureFlagKey | null {
  return isFeatureFlagKey(value)
    ? value
    : null;
}

export function setRuntimeFeatureFlag(
  key: FeatureFlagKey,
  enabled: boolean,
): FeatureFlag {
  // Runtime overrides are intentionally not persisted
  // in this module. Environment configuration remains
  // the production source of truth.
  return {
    ...DEFAULT_FLAGS[key],
    enabled: Boolean(enabled),
  };
}

export function getFeatureFlagConfig() {
  return {
    flags: getFeatureFlags(),
    keys: getFeatureFlagKeys(),
  };
}
