import { NextResponse } from "next/server";
import {
  getLaunchOfferPrice,
  getPlanConfig,
  isLaunchOfferActive,
  validateSubscriptionPlan,
} from "@/lib/subscription";
import { getServerUser } from "@/lib/supabase/server";
import razorpay from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const plan = body?.plan;

    if (!validateSubscriptionPlan(plan) || plan === "free") {
      return NextResponse.json(
        { error: "Invalid paid subscription plan." },
        { status: 400 }
      );
    }

    const planConfig = getPlanConfig(plan);

    if (planConfig.priceInr <= 0) {
      return NextResponse.json(
        { error: "This plan does not require payment." },
        { status: 400 }
      );
    }

    /*
     * Keep the server-side price authoritative.
     * Never trust a price sent by the frontend.
     */
    const configuredOfferEnd =
      process.env.NEXT_PUBLIC_LAUNCH_OFFER_END_DATE;

    const offerEndDate = configuredOfferEnd
      ? new Date(configuredOfferEnd)
      : undefined;

    const launchOfferActive = offerEndDate
      ? isLaunchOfferActive(offerEndDate)
      : true;

    const finalPriceInr = launchOfferActive
      ? getLaunchOfferPrice(planConfig.priceInr)
      : planConfig.priceInr;

    const amountInPaise = Math.round(finalPriceInr * 100);

    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      return NextResponse.json(
        { error: "Invalid payment amount." },
        { status: 400 }
      );
    }

    const receipt = `order_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        user_id: user.id,
        plan_id: planConfig.id,
        billing_interval: planConfig.billingInterval,
        launch_offer: launchOfferActive ? "25_percent" : "none",
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: planConfig.id,
      planName: planConfig.name,
      billingInterval: planConfig.billingInterval,
      launchOfferActive,
      priceInr: finalPriceInr,
    });
  } catch (error) {
    console.error("Razorpay create-order error:", error);

    return NextResponse.json(
      { error: "Unable to create Razorpay order." },
      { status: 500 }
    );
  }
}