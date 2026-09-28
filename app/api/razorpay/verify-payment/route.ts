import { NextResponse } from "next/server";
import crypto from "crypto";

import { getServerUser } from "@/lib/supabase/server";
import { getPlanConfig, validateSubscriptionPlan } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabase/admin";
import razorpay from "@/lib/razorpay";

export const runtime = "nodejs";

type VerifyPaymentBody = {
  plan?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_order_id?: unknown;
  razorpay_signature?: unknown;
};

export async function POST(request: Request) {
  try {
    // ------------------------------------------------------------
    // 1. Verify authenticated user
    // ------------------------------------------------------------
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

    // ------------------------------------------------------------
    // 2. Read request body
    // ------------------------------------------------------------
    const body = (await request.json()) as VerifyPaymentBody;

    const plan = body.plan;
    const paymentId = body.razorpay_payment_id;
    const orderId = body.razorpay_order_id;
    const signature = body.razorpay_signature;

    // ------------------------------------------------------------
    // 3. Validate required values
    // ------------------------------------------------------------
    if (
      typeof paymentId !== "string" ||
      typeof orderId !== "string" ||
      typeof signature !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Razorpay payment information.",
        },
        { status: 400 }
      );
    }

    if (!validateSubscriptionPlan(plan) || plan === "free") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid paid subscription plan.",
        },
        { status: 400 }
      );
    }

    const planConfig = getPlanConfig(plan);

    // ------------------------------------------------------------
    // 4. Verify Razorpay signature
    // ------------------------------------------------------------
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is not configured.");

      return NextResponse.json(
        {
          success: false,
          error: "Payment configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    const signaturePayload = `${orderId}|${paymentId}`;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signaturePayload)
      .digest("hex");

    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment signature verification failed.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 5. Fetch Razorpay order
    // ------------------------------------------------------------
    const order = await razorpay.orders.fetch(orderId);

    if (!order || order.id !== orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay order could not be verified.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 6. Verify order ownership
    // ------------------------------------------------------------
    if (order.notes?.user_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment order does not belong to this user.",
        },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------
    // 7. Verify selected plan
    // ------------------------------------------------------------
    if (order.notes?.plan_id !== planConfig.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment plan does not match the selected plan.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 8. Fetch Razorpay payment
    // ------------------------------------------------------------
    const payment = await razorpay.payments.fetch(paymentId);

    if (!payment || payment.id !== paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay payment could not be verified.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 9. Verify payment belongs to order
    // ------------------------------------------------------------
    if (payment.order_id !== orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment does not belong to the verified order.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 10. Verify currency
    // ------------------------------------------------------------
    if (payment.currency !== "INR") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment currency.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 11. Verify payment amount
    // ------------------------------------------------------------
    if (payment.amount !== order.amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment amount does not match the Razorpay order.",
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 12. Verify captured status
    // ------------------------------------------------------------
    if (payment.status !== "captured") {
      return NextResponse.json(
        {
          success: false,
          error: `Payment is not captured. Current status: ${payment.status}.`,
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 13. Save verified payment in database
    // ------------------------------------------------------------
    const launchOfferApplied =
      order.notes?.launch_offer === "25_percent";

    const { error: paymentSaveError } = await supabaseAdmin
      .from("razorpay_payments")
      .upsert(
        {
          user_id: user.id,
          plan_id: planConfig.id,
          plan_name: planConfig.name,
          billing_interval: planConfig.billingInterval,
          razorpay_order_id: order.id,
          razorpay_payment_id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: "captured",
          payment_method:
            typeof payment.method === "string"
              ? payment.method
              : null,
          launch_offer_applied: launchOfferApplied,
          error_code: null,
          error_description: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "razorpay_order_id",
        }
      );

    if (paymentSaveError) {
      console.error(
        "Failed to save Razorpay payment:",
        paymentSaveError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Payment was verified but could not be saved.",
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------
    // 14. Payment verified and stored successfully
    //
    // Subscription activation is handled by the subscription
    // activation step.
    // ------------------------------------------------------------
    return NextResponse.json({
      success: true,
      verified: true,
      paymentSaved: true,
      paymentId: payment.id,
      orderId: order.id,
      plan: planConfig.id,
      planName: planConfig.name,
      billingInterval: planConfig.billingInterval,
      amount: payment.amount,
      currency: payment.currency,
      launchOfferApplied,
      message: "Payment verified and saved successfully.",
    });
  } catch (error) {
    console.error("Razorpay verify-payment error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify Razorpay payment.",
      },
      { status: 500 }
    );
  }
}