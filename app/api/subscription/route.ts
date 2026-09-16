import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import {
  getUserSubscription,
  upsertUserSubscription,
} from "@/lib/database";
import {
  getPaymentSubscription,
  unixSecondsToIso,
  mapProviderSubscriptionStatus,
} from "@/lib/payment";
import {
  getPlanConfig,
  resolveSubscription,
} from "@/lib/subscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * GET /api/subscription
 *
 * Returns the authenticated user's current subscription and effective
 * entitlement summary.
 */
export async function GET() {
  try {
    await requireCurrentUser();

    const subscription = await getUserSubscription();
    const access = resolveSubscription(subscription);

    return json({
      success: true,
      subscription,
      access,
      plan: getPlanConfig(access.plan),
    });
  } catch (error) {
    console.error("Subscription GET error:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (message === "Authentication required.") {
      return json({ error: "Authentication required." }, 401);
    }

    return json(
      { error: "Unable to load subscription." },
      500
    );
  }
}

/**
 * POST /api/subscription
 *
 * action=sync
 * Synchronizes an existing Razorpay subscription with the local record.
 *
 * The provider subscription ID is read from the authenticated user's
 * subscription record. It is never accepted from the browser.
 */
export async function POST(request: Request) {
  try {
    await requireCurrentUser();

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const action =
      typeof body === "object" &&
      body !== null &&
      "action" in body &&
      typeof (body as { action?: unknown }).action === "string"
        ? (body as { action: string }).action.trim()
        : "";

    if (action !== "sync") {
      return json(
        { error: "Invalid subscription action." },
        400
      );
    }

    const subscription = await getUserSubscription();

    if (!subscription) {
      return json(
        {
          success: true,
          message: "No paid subscription found.",
          subscription: null,
        }
      );
    }

    if (
      subscription.plan === "free" ||
      !subscription.payment_subscription_id
    ) {
      return json({
        success: true,
        message: "This subscription does not have a provider subscription to sync.",
        subscription,
      });
    }

    const providerSubscription = await getPaymentSubscription(
      subscription.payment_subscription_id
    );

    const providerStatus = mapProviderSubscriptionStatus(
      providerSubscription.status
    );

    const currentStart = unixSecondsToIso(
      providerSubscription.current_start
    );

    const currentEnd = unixSecondsToIso(
      providerSubscription.current_end
    );

    /*
     * Preserve local entitlement information while synchronizing only
     * provider-controlled lifecycle fields.
     */
    const nextStatus = providerStatus ?? subscription.status;

    const updated = await upsertUserSubscription({
      plan: subscription.plan,
      status: nextStatus,
      monthly_limit:
        subscription.monthly_limit ??
        getPlanConfig(subscription.plan).analysisLimit,
      analyses_used: subscription.analyses_used ?? 0,
      current_period_start:
        currentStart ?? subscription.current_period_start,
      current_period_end:
        currentEnd ?? subscription.current_period_end,
      cancelled_at:
        providerStatus === "cancelled"
          ? new Date().toISOString()
          : subscription.cancelled_at,
      payment_provider:
        subscription.payment_provider ?? "razorpay",
      payment_subscription_id:
        subscription.payment_subscription_id,
    });

    return json({
      success: true,
      message: "Subscription synchronized.",
      subscription: updated,
    });
  } catch (error) {
    console.error("Subscription POST error:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (message === "Authentication required.") {
      return json({ error: "Authentication required." }, 401);
    }

    return json(
      { error: "Unable to synchronize subscription." },
      500
    );
  }
}
