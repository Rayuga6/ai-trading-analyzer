import type {
  SubscriptionPlan,
  SubscriptionStatus,
  UserSubscription,
  UsageRecord,
} from "@/lib/database";

/**
 * Subscription business rules
 *
 * Roadmap:
 * 49 Free Plan
 * 50 Usage Limits
 * 51 Premium Plans
 * 54 Subscription Activation
 * 55 Cancellation
 * 56 Expiry / Renewal
 *
 * Payment gateway integration is intentionally NOT implemented here.
 * That belongs to the payment files in the later coding order.
 */

export type BillingInterval = "lifetime" | "month" | "year";

export type SubscriptionPlanConfig = {
  id: SubscriptionPlan;
  name: string;
  priceInr: number;
  billingInterval: BillingInterval;
  analysisLimit: number;
  description: string;
  popular?: boolean;
};

export const FREE_PLAN: SubscriptionPlanConfig = {
  id: "free",
  name: "Free",
  priceInr: 0,
  billingInterval: "lifetime",
  analysisLimit: 1,
  description: "1 lifetime AI analysis",
};

export const SUBSCRIPTION_PLANS: Record<
  Exclude<SubscriptionPlan, "free">,
  SubscriptionPlanConfig
> = {
  basic: {
    id: "basic",
    name: "Basic",
    priceInr: 999,
    billingInterval: "month",
    analysisLimit: 25,
    description: "25 analyses per month",
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceInr: 1499,
    billingInterval: "month",
    analysisLimit: 50,
    description: "50 analyses per month",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceInr: 2499,
    billingInterval: "month",
    analysisLimit: 150,
    description: "150 analyses per month",
    popular: true,
  },
  elite: {
    id: "elite",
    name: "Elite",
    priceInr: 4999,
    billingInterval: "month",
    analysisLimit: 500,
    description: "500 analyses per month",
  },
  elite_yearly: {
    id: "elite_yearly",
    name: "Elite Yearly",
    priceInr: 39999,
    billingInterval: "year",
    analysisLimit: 6000,
    description: "6,000 analyses per year",
  },
};

export const ALL_PLAN_CONFIGS: Record<
  SubscriptionPlan,
  SubscriptionPlanConfig
> = {
  free: FREE_PLAN,
  ...SUBSCRIPTION_PLANS,
};

export const LAUNCH_OFFER = {
  discountPercent: 25,
  durationDays: 30,
} as const;

export type SubscriptionAccess = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isActive: boolean;
  isPaid: boolean;
  limit: number;
  used: number;
  remaining: number;
  periodStart: string | null;
  periodEnd: string | null;
  cancelledAt: string | null;
};

function toSafeInteger(value: unknown, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.floor(number));
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getPlanConfig(plan: SubscriptionPlan): SubscriptionPlanConfig {
  return ALL_PLAN_CONFIGS[plan] ?? FREE_PLAN;
}

export function getPlanLimit(plan: SubscriptionPlan) {
  return getPlanConfig(plan).analysisLimit;
}

export function isPaidPlan(plan: SubscriptionPlan) {
  return plan !== "free";
}

export function isSubscriptionActive(
  subscription: Pick<UserSubscription, "status" | "current_period_end">
) {
  if (
    subscription.status !== "active" &&
    subscription.status !== "trialing"
  ) {
    return false;
  }

  const periodEnd = toTimestamp(subscription.current_period_end);

  // If there is no period end, trust the active/trialing status.
  if (periodEnd === null) {
    return true;
  }

  return periodEnd > Date.now();
}

export function isSubscriptionExpired(
  subscription: Pick<UserSubscription, "status" | "current_period_end">
) {
  const periodEnd = toTimestamp(subscription.current_period_end);

  if (periodEnd !== null && periodEnd <= Date.now()) {
    return true;
  }

  return (
    subscription.status === "expired" ||
    subscription.status === "past_due"
  );
}

export function getUsageCount(
  subscription: Pick<UserSubscription, "analyses_used"> | null,
  usage: Pick<UsageRecord, "analyses_used"> | null
) {
  // usage_records is the preferred usage source.
  if (usage?.analyses_used !== undefined && usage?.analyses_used !== null) {
    return toSafeInteger(usage.analyses_used);
  }

  return toSafeInteger(subscription?.analyses_used);
}

export function getRemainingAnalyses(
  limit: number,
  used: number
) {
  if (limit < 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, limit - used);
}

/**
 * Returns the effective subscription.
 *
 * Missing, expired, or cancelled subscriptions fall back to Free.
 * This keeps the analysis API fail-closed instead of accidentally granting
 * paid access when subscription data is invalid.
 */
export function resolveSubscription(
  subscription: UserSubscription | null,
  usage: UsageRecord | null = null
): SubscriptionAccess {
  if (!subscription) {
    const used = getUsageCount(null, usage);

    return {
      plan: "free",
      status: "active",
      isActive: true,
      isPaid: false,
      limit: FREE_PLAN.analysisLimit,
      used,
      remaining: getRemainingAnalyses(FREE_PLAN.analysisLimit, used),
      periodStart: null,
      periodEnd: null,
      cancelledAt: null,
    };
  }

  const plan = ALL_PLAN_CONFIGS[subscription.plan]
    ? subscription.plan
    : "free";

  const active = isSubscriptionActive(subscription);

  // Cancelled/expired paid plans no longer receive paid entitlements.
  const effectivePlan: SubscriptionPlan =
    active && plan !== "free" ? plan : "free";

  const config = getPlanConfig(effectivePlan);
  const used = getUsageCount(subscription, usage);

  return {
    plan: effectivePlan,
    status: active ? subscription.status : "expired",
    isActive: active,
    isPaid: isPaidPlan(effectivePlan),
    limit: config.analysisLimit,
    used,
    remaining: getRemainingAnalyses(config.analysisLimit, used),
    periodStart: subscription.current_period_start ?? null,
    periodEnd: subscription.current_period_end ?? null,
    cancelledAt: subscription.cancelled_at ?? null,
  };
}

export function canRunAnalysis(access: SubscriptionAccess) {
  return access.remaining > 0;
}

export function getUsageMessage(access: SubscriptionAccess) {
  if (access.remaining <= 0) {
    if (access.plan === "free") {
      return "Your 1 lifetime free analysis has been used. Please choose a premium plan to continue.";
    }

    return `Your ${getPlanConfig(access.plan).name} analysis limit has been reached. Please renew or upgrade your plan.`;
  }

  return `${access.remaining} analysis${
    access.remaining === 1 ? "" : "es"
  } remaining.`;
}

export function createMonthlyPeriod(
  start = new Date()
) {
  const periodStart = new Date(start);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

export function createYearlyPeriod(
  start = new Date()
) {
  const periodStart = new Date(start);
  const periodEnd = new Date(periodStart);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

export function createFreeSubscription(userId: string): UserSubscription {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    plan: "free",
    status: "active",
    monthly_limit: FREE_PLAN.analysisLimit,
    analyses_used: 0,
    current_period_start: now,
    current_period_end: null,
    cancelled_at: null,
    payment_provider: null,
    payment_subscription_id: null,
  };
}

export function createPaidSubscription(
  userId: string,
  plan: Exclude<SubscriptionPlan, "free">,
  paymentProvider: string | null = null,
  paymentSubscriptionId: string | null = null,
  start = new Date()
): UserSubscription {
  const config = getPlanConfig(plan);
  const period =
    config.billingInterval === "year"
      ? createYearlyPeriod(start)
      : createMonthlyPeriod(start);

  return {
    user_id: userId,
    plan,
    status: "active",
    monthly_limit: config.analysisLimit,
    analyses_used: 0,
    current_period_start: period.periodStart,
    current_period_end: period.periodEnd,
    cancelled_at: null,
    payment_provider: paymentProvider,
    payment_subscription_id: paymentSubscriptionId,
  };
}

export function markSubscriptionCancelled(
  subscription: UserSubscription,
  cancelledAt = new Date()
): UserSubscription {
  return {
    ...subscription,
    status: "cancelled",
    cancelled_at: cancelledAt.toISOString(),
  };
}

export function shouldRenewSubscription(
  subscription: Pick<
    UserSubscription,
    "status" | "current_period_end" | "plan"
  >
) {
  if (subscription.plan === "free") {
    return false;
  }

  const periodEnd = toTimestamp(subscription.current_period_end);

  return (
    subscription.status === "active" &&
    periodEnd !== null &&
    periodEnd <= Date.now()
  );
}

export function getLaunchOfferPrice(
  priceInr: number,
  discountPercent = LAUNCH_OFFER.discountPercent
) {
  const discount = Math.max(0, Math.min(100, discountPercent));

  return Math.round(priceInr * (1 - discount / 100));
}

export function getLaunchOfferEndDate(start = new Date()) {
  const end = new Date(start);
  end.setDate(end.getDate() + LAUNCH_OFFER.durationDays);

  return end;
}

export function isLaunchOfferActive(
  offerEndDate: string | Date,
  now = new Date()
) {
  const end =
    offerEndDate instanceof Date
      ? offerEndDate.getTime()
      : Date.parse(offerEndDate);

  return Number.isFinite(end) && end > now.getTime();
}

export function validateSubscriptionPlan(
  value: unknown
): value is SubscriptionPlan {
  return (
    value === "free" ||
    value === "basic" ||
    value === "starter" ||
    value === "pro" ||
    value === "elite" ||
    value === "elite_yearly"
  );
}

export function getPlanSummary() {
  return Object.values(ALL_PLAN_CONFIGS).map((plan) => ({
    id: plan.id,
    name: plan.name,
    priceInr: plan.priceInr,
    billingInterval: plan.billingInterval,
    analysisLimit: plan.analysisLimit,
    description: plan.description,
    popular: Boolean(plan.popular),
  }));
}
