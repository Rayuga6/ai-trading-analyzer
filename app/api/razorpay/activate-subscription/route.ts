import { NextResponse } from "next/server";
import {
  createPaidSubscription,
  getPlanConfig,
  validateSubscriptionPlan,
} from "@/lib/subscription";
import { getServerUser } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ActivateSubscriptionBody = {
  plan?: unknown;
  razorpayPaymentId?: unknown;
  razorpayOrderId?: unknown;
};

export async function POST(request: Request) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as ActivateSubscriptionBody;

    const plan = body.plan;
    const razorpayPaymentId = body.razorpayPaymentId;
    const razorpayOrderId = body.razorpayOrderId;

    if (!validateSubscriptionPlan(plan) || plan === "free") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid paid subscription plan.",
        },
        { status: 400 }
      );
    }

    if (
      typeof razorpayPaymentId !== "string" ||
      !razorpayPaymentId ||
      typeof razorpayOrderId !== "string" ||
      !razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment information is required.",
        },
        { status: 400 }
      );
    }

    const planConfig = getPlanConfig(plan);

    const supabase = await createClient();

    // ----------------------------------------------------------
    // Verify that this Razorpay order belongs to this user,
    // selected plan, and was already recorded as captured.
    // ----------------------------------------------------------

    const { data: payment, error: paymentError } = await supabase
      .from("razorpay_payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("razorpay_order_id", razorpayOrderId)
      .eq("razorpay_payment_id", razorpayPaymentId)
      .eq("plan_id", planConfig.id)
      .eq("status", "captured")
      .maybeSingle();

    if (paymentError) {
      console.error(
        "Razorpay payment lookup error:",
        paymentError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify payment record.",
        },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Verified captured payment was not found.",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // Prevent duplicate activation of the same payment.
    // ----------------------------------------------------------

    const { data: existingSubscription, error: subscriptionError } =
      await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    if (subscriptionError) {
      console.error(
        "Subscription lookup error:",
        subscriptionError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to read subscription.",
        },
        { status: 500 }
      );
    }

    if (
      existingSubscription?.payment_subscription_id ===
      razorpayPaymentId
    ) {
      return NextResponse.json({
        success: true,
        alreadyActivated: true,
        plan: existingSubscription.plan,
        status: existingSubscription.status,
        message: "Subscription is already activated.",
      });
    }

    // ----------------------------------------------------------
    // Create the paid subscription using the existing
    // subscription business rules.
    // ----------------------------------------------------------

    const paidSubscription = createPaidSubscription(
      user.id,
      plan,
      "razorpay",
      razorpayPaymentId
    );

    const { data: activatedSubscription, error: activationError } =
      await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id: user.id,
            plan: paidSubscription.plan,
            status: paidSubscription.status,
            monthly_limit: paidSubscription.monthly_limit,
            analyses_used: paidSubscription.analyses_used,
            current_period_start:
              paidSubscription.current_period_start,
            current_period_end:
              paidSubscription.current_period_end,
            cancelled_at: paidSubscription.cancelled_at,
            payment_provider:
              paidSubscription.payment_provider,
            payment_subscription_id:
              paidSubscription.payment_subscription_id,
          },
          {
            onConflict: "user_id",
          }
        )
        .select()
        .single();

    if (activationError) {
      console.error(
        "Subscription activation error:",
        activationError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to activate subscription.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyActivated: false,
      subscription: activatedSubscription,
      plan: planConfig.id,
      planName: planConfig.name,
      analysisLimit: planConfig.analysisLimit,
      billingInterval: planConfig.billingInterval,
      message: "Premium subscription activated successfully.",
    });
  } catch (error) {
    console.error(
      "Razorpay activate-subscription error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to activate subscription.",
      },
      { status: 500 }
    );
  }
}