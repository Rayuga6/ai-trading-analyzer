import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/auth";
import { getUserSubscription, upsertUserSubscription } from "@/lib/database";
import {
  cancelPaymentSubscription,
  getPaymentSubscription,
  mapProviderSubscriptionStatus,
} from "@/lib/payment";

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
 * POST /api/subscription/cancel
 *
 * Cancels the authenticated user's paid subscription at the payment
 * provider and marks the local subscription as cancelled.
 *
 * The provider subscription ID is taken only from the authenticated
 * user's server-side subscription record.
 */
export async function POST() {
  try {
    await requireCurrentUser();

    const subscription = await getUserSubscription();

    if (!subscription) {
      return json(
        { error: "No subscription found." },
        404
      );
    }

    if (subscription.plan === "free") {
      return json(
        {
          success: true,
          message: "Free plan does not need cancellation.",
          subscription,
        }
      );
    }

    if (subscription.status === "cancelled") {
      return json({
        success: true,
        message: "Subscription is already cancelled.",
        subscription,
      });
    }

    const providerSubscriptionId =
      subscription.payment_subscription_id;

    /*
     * If there is no provider subscription ID, we still cancel the local
     * entitlement rather than accepting an ID from the browser.
     */
    if (providerSubscriptionId) {
      await cancelPaymentSubscription(providerSubscriptionId);

      /*
       * Confirm provider state when possible. This is informational;
       * the local cancellation remains tied to the authenticated user.
       */
      try {
        const providerSubscription = await getPaymentSubscription(
          providerSubscriptionId
        );

        const providerStatus = mapProviderSubscriptionStatus(
          providerSubscription.status
        );

        if (
          providerStatus &&
          providerStatus !== "cancelled"
        ) {
          return json(
            {
              error:
                "The payment provider did not confirm cancellation yet. Please check again shortly.",
            },
            409
          );
        }
      } catch (providerCheckError) {
        console.warn(
          "Provider cancellation confirmation unavailable:",
          providerCheckError
        );
      }
    }

    const cancelledAt = new Date().toISOString();

    const updated = await upsertUserSubscription({
      plan: subscription.plan,
      status: "cancelled",
      monthly_limit: subscription.monthly_limit,
      analyses_used: subscription.analyses_used,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancelled_at: cancelledAt,
      payment_provider: subscription.payment_provider,
      payment_subscription_id: subscription.payment_subscription_id,
    });

    return json({
      success: true,
      message:
        "Subscription cancellation requested successfully.",
      subscription: updated,
    });
  } catch (error) {
    console.error("Subscription cancellation error:", error);

    const message =
      error instanceof Error ? error.message : "";

    if (message === "Authentication required.") {
      return json(
        { error: "Authentication required." },
        401
      );
    }

    return json(
      {
        error:
          "Unable to cancel subscription. Please try again.",
      },
      500
    );
  }
}
