import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  secret: string
) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const received = Buffer.from(receivedSignature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured.");

      return NextResponse.json(
        { success: false, error: "Webhook configuration is incomplete." },
        { status: 500 }
      );
    }

    const rawBody = await request.text();

    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json(
        { success: false, error: "Missing Razorpay webhook signature." },
        { status: 400 }
      );
    }

    const validSignature = verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret
    );

    if (!validSignature) {
      return NextResponse.json(
        { success: false, error: "Invalid webhook signature." },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);

    const event = payload?.event;

    if (typeof event !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid webhook event." },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const paymentEntity = payload?.payload?.payment?.entity;

    if (paymentEntity?.id) {
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id ?? null;

      let status = "created";

      switch (event) {
        case "payment.authorized":
          status = "authorized";
          break;

        case "payment.captured":
          status = "captured";
          break;

        case "payment.failed":
          status = "failed";
          break;

        case "payment.refunded":
          status = "refunded";
          break;

        default:
          status = paymentEntity.status ?? "created";
      }

      if (orderId) {
        await supabase
          .from("razorpay_payments")
          .update({
            razorpay_payment_id: paymentId,
            status,
            payment_method: paymentEntity.method ?? null,
            error_code: paymentEntity.error_code ?? null,
            error_description:
              paymentEntity.error_description ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", orderId);
      }
    }

    return NextResponse.json({
      success: true,
      received: true,
      event,
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to process Razorpay webhook.",
      },
      { status: 500 }
    );
  }
}