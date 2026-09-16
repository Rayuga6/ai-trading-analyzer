import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getUserSubscription } from "@/lib/database";
import {
  getPlanConfig,
  isSubscriptionActive,
  isSubscriptionExpired,
  resolveSubscription,
} from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * GET /api/subscription/status
 *
 * Returns the authenticated user's effective subscription status,
 * usage and remaining analysis entitlement.
 *
 * No payment secrets or internal provider credentials are returned.
 */
export async function GET() {
  try {
    const user = await requireCurrentUser();
    const subscription = await getUserSubscription();

    const access = resolveSubscription(subscription);
    const plan = getPlanConfig(access.plan);

    const analysesUsed = access.used;
    const remaining = access.remaining;

    // A missing subscription is treated as the active Free plan.
    const active = subscription
      ? isSubscriptionActive(subscription)
      : true;
    const expired = subscription
      ? isSubscriptionExpired(subscription)
      : false;

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            monthly_limit: subscription.monthly_limit,
            analyses_used: analysesUsed,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancelled_at: subscription.cancelled_at,
            payment_provider: subscription.payment_provider ?? null,
          }
        : null,
      access: {
        plan: access.plan,
        status: access.status,
        active,
        expired,
        canAnalyze: access.isActive && remaining > 0,
        analysesUsed,
        remaining,
        limit: access.limit,
      },
      plan: {
        id: plan.id,
        name: plan.name,
        priceInr: plan.priceInr,
        billingInterval: plan.billingInterval,
        analysisLimit: plan.analysisLimit,
        popular: plan.popular ?? false,
      },
    });
  } catch (error) {
    console.error("Subscription status error:", error);

    const message = error instanceof Error ? error.message : "";

    if (message === "Authentication required.") {
      return json({ error: "Authentication required." }, 401);
    }

    return json({ error: "Unable to load subscription status." }, 500);
  }
}
