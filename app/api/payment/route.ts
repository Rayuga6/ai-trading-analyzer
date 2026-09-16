import { NextResponse } from "next/server";
import {
  createPaymentOrder,
  getPayment,
  getPublicPaymentConfig,
  getPaymentPlanAmount,
  verifyPaymentSignature,
} from "@/lib/payment";
import { requireCurrentUser } from "@/lib/auth";
import {
  createPaidSubscription,
  getLaunchOfferEndDate,
  isLaunchOfferActive,
} from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/database";
import { upsertUserSubscription } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID_PLANS: SubscriptionPlan[] = [
  "basic",
  "starter",
  "pro",
  "elite",
  "elite_yearly",
];

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isPaidPlan(value: string): value is Exclude<SubscriptionPlan, "free"> {
  return PAID_PLANS.includes(value as SubscriptionPlan);
}

function safeReceipt(userId: string) {
  const compact = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18);
  return `ata_${compact}_${Date.now().toString(36)}`.slice(0, 40);
}

/**
 * GET /api/payment
 *
 * Returns only public checkout configuration.
 * Razorpay secret values are never returned.
 */
export async function GET() {
  try {
    await requireCurrentUser();

    return json({
      ...getPublicPaymentConfig(),
      launchOffer: {
        active: isLaunchOfferActive(getLaunchOfferEndDate()),
        discountPercent: isLaunchOfferActive(getLaunchOfferEndDate()) ? 25 : 0,
        endAt: getLaunchOfferEndDate().toISOString(),
      },
    });
  } catch {
    return json({ error: "Authentication required." }, 401);
  }
}

/**
 * POST /api/payment
 *
 * action=create-order
 * Creates a server-side Razorpay order for the selected paid plan.
 *
 * action=verify
 * Verifies Razorpay Checkout's signature and then activates the plan.
 */
export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const formData = await request.formData();

    const action = getString(formData.get("action"));

    if (action === "create-order") {
      const planValue = getString(formData.get("plan"));

      if (!isPaidPlan(planValue)) {
        return json({ error: "Invalid paid subscription plan." }, 400);
      }

      const launchActive = isLaunchOfferActive(getLaunchOfferEndDate());
      const discountPercent = launchActive ? 25 : 0;
      const receipt = safeReceipt(user.id);

      const order = await createPaymentOrder({
        userId: user.id,
        plan: planValue,
        receipt,
        discountPercent,
      });

      return json({
        success: true,
        action: "create-order",
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt ?? receipt,
        },
        plan: planValue,
        discountPercent,
        launchOfferActive: launchActive,
        razorpayKeyId: getPublicPaymentConfig().keyId,
      });
    }

    if (action === "verify") {
      const planValue = getString(formData.get("plan"));
      const orderId = getString(formData.get("orderId"));
      const paymentId = getString(formData.get("paymentId"));
      const signature = getString(formData.get("signature"));

      if (!isPaidPlan(planValue)) {
        return json({ error: "Invalid paid subscription plan." }, 400);
      }

      if (!orderId || !paymentId || !signature) {
        return json({ error: "Payment verification data is incomplete." }, 400);
      }

      const signatureValid = verifyPaymentSignature({
        orderId,
        paymentId,
        signature,
      });

      if (!signatureValid) {
        return json({ error: "Payment verification failed." }, 400);
      }

      /*
       * Verify the payment with Razorpay after signature verification.
       * This prevents activating a subscription from an untrusted browser
       * response alone.
       */
      const payment = await getPayment(paymentId);

      if (payment.orderId !== orderId) {
        return json({ error: "Payment/order mismatch." }, 400);
      }

      const expectedAmount = getPaymentPlanAmount(planValue);
      const launchActive = isLaunchOfferActive(getLaunchOfferEndDate());
      const expectedCheckoutAmount = launchActive
        ? Math.round(expectedAmount * 0.75)
        : expectedAmount;

      if (
        payment.amount !== null &&
        payment.amount !== expectedCheckoutAmount
      ) {
        return json({ error: "Payment amount mismatch." }, 400);
      }

      if (
        payment.status &&
        !["captured", "authorized"].includes(payment.status.toLowerCase())
      ) {
        return json({ error: "Payment has not been successfully captured." }, 400);
      }

      /*
       * Subscription activation is server-side only.
       * The database helper associates the record with the authenticated
       * server user, so the client cannot activate another user's plan.
       */
      const subscription = createPaidSubscription(
        user.id,
        planValue,
        "razorpay",
        paymentId
      );

      const savedSubscription = await upsertUserSubscription({
        plan: subscription.plan,
        status: subscription.status,
        monthly_limit: subscription.monthly_limit,
        analyses_used: subscription.analyses_used,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancelled_at: subscription.cancelled_at,
        payment_provider: subscription.payment_provider,
        payment_subscription_id: subscription.payment_subscription_id,
      });

      return json({
        success: true,
        action: "verify",
        message: "Payment verified and subscription activated.",
        subscription: {
          plan: savedSubscription.plan,
          status: savedSubscription.status,
          monthly_limit: savedSubscription.monthly_limit,
          current_period_start: savedSubscription.current_period_start,
          current_period_end: savedSubscription.current_period_end,
        },
        payment: {
          paymentId: payment.paymentId,
          orderId: payment.orderId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
        },
      });
    }

    return json(
      { error: "Invalid payment action. Use create-order or verify." },
      400
    );
  } catch (error) {
    console.error("Payment API error:", error);

    const message =
      error instanceof Error ? error.message : "Payment request failed.";

    if (message === "Authentication required.") {
      return json({ error: "Authentication required." }, 401);
    }

    return json(
      { error: "Payment request could not be completed. Please try again." },
      500
    );
  }
}
