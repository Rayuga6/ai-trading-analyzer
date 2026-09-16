import crypto from "node:crypto";
import {
  getPlanConfig,
  validateSubscriptionPlan,
} from "@/lib/subscription";
import type { SubscriptionPlan } from "@/lib/database";

export const PAYMENT_PROVIDER = "razorpay" as const;

type RazorpayCredentials = {
  keyId: string;
  keySecret: string;
};

export type PaymentOrder = {
  id: string;
  amount: number;
  currency: string;
  status?: string;
  receipt?: string;
};

export type PaymentVerificationInput = {
  orderId: string;
  paymentId: string;
  signature: string;
};

export type SubscriptionCancellationResult = {
  id: string;
  status?: string;
};

export type PaymentStatus = {
  paymentId: string;
  orderId?: string | null;
  status?: string | null;
  amount?: number | null;
  currency?: string | null;
};

function getCredentials(): RazorpayCredentials {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Payment provider is not configured.");
  }

  return {
    keyId,
    keySecret,
  };
}

function getRazorpayBaseUrl() {
  return "https://api.razorpay.com/v1";
}

function basicAuth(credentials: RazorpayCredentials) {
  return Buffer.from(
    `${credentials.keyId}:${credentials.keySecret}`
  ).toString("base64");
}

async function razorpayRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const credentials = getCredentials();

  const response = await fetch(`${getRazorpayBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${basicAuth(credentials)}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();

  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    // Do not expose Razorpay's raw error payload to the browser.
    throw new Error("Payment provider request failed.");
  }

  return data as T;
}

function assertSafeReceipt(receipt: string) {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(receipt)) {
    throw new Error("Invalid payment receipt.");
  }
}

export function getPaymentPlanAmount(
  plan: SubscriptionPlan
) {
  if (!validateSubscriptionPlan(plan) || plan === "free") {
    throw new Error("A paid subscription plan is required.");
  }

  const config = getPlanConfig(plan);

  return config.priceInr * 100;
}

export function getPaymentPlanCurrency(
  plan: SubscriptionPlan
) {
  if (!validateSubscriptionPlan(plan)) {
    throw new Error("Invalid subscription plan.");
  }

  return "INR" as const;
}

/**
 * Creates a Razorpay order.
 *
 * This is intentionally server-side only. The secret key must never reach
 * client-side code.
 *
 * For recurring subscriptions, the later subscription API route should use
 * Razorpay Subscription/Plan IDs. This order helper is useful for payment
 * checkout and verification flows.
 */
export async function createPaymentOrder(params: {
  userId: string;
  plan: Exclude<SubscriptionPlan, "free">;
  receipt: string;
  discountPercent?: number;
}) {
  const { userId, plan, receipt, discountPercent = 0 } = params;

  if (!userId || userId.length > 200) {
    throw new Error("Invalid user.");
  }

  if (!validateSubscriptionPlan(plan)) {
    throw new Error("Invalid paid subscription plan.");
  }

  assertSafeReceipt(receipt);

  const baseAmount = getPaymentPlanAmount(plan);

  const discount = Math.min(
    100,
    Math.max(0, Number(discountPercent) || 0)
  );

  const amount = Math.round(
    baseAmount * (1 - discount / 100)
  );

  if (amount <= 0) {
    throw new Error("Invalid payment amount.");
  }

  return razorpayRequest<PaymentOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt,
      notes: {
        user_id: userId,
        plan,
      },
    }),
  });
}

/**
 * Verifies Razorpay Checkout signature.
 *
 * IMPORTANT:
 * The server must receive orderId/paymentId/signature from the client,
 * then verify them here before activating a subscription.
 */
export function verifyPaymentSignature({
  orderId,
  paymentId,
  signature,
}: PaymentVerificationInput) {
  if (
    !orderId ||
    !paymentId ||
    !signature ||
    orderId.length > 200 ||
    paymentId.length > 200 ||
    signature.length > 200
  ) {
    return false;
  }

  const { keySecret } = getCredentials();

  const payload = `${orderId}|${paymentId}`;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

/**
 * Fetch a payment from Razorpay after signature verification.
 * Keep this server-side.
 */
export async function getPayment(
  paymentId: string
): Promise<PaymentStatus> {
  if (
    !paymentId ||
    paymentId.length > 200 ||
    !/^[A-Za-z0-9_]+$/.test(paymentId)
  ) {
    throw new Error("Invalid payment ID.");
  }

  const payment = await razorpayRequest<{
    id: string;
    order_id?: string;
    status?: string;
    amount?: number;
    currency?: string;
  }>(`/payments/${encodeURIComponent(paymentId)}`);

  return {
    paymentId: payment.id,
    orderId: payment.order_id ?? null,
    status: payment.status ?? null,
    amount: payment.amount ?? null,
    currency: payment.currency ?? null,
  };
}

/**
 * Capture a payment when the provider/payment flow requires explicit capture.
 */
export async function capturePayment(
  paymentId: string,
  amount: number
) {
  if (
    !paymentId ||
    !/^[A-Za-z0-9_]+$/.test(paymentId)
  ) {
    throw new Error("Invalid payment ID.");
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invalid capture amount.");
  }

  return razorpayRequest<PaymentStatus>(
    `/payments/${encodeURIComponent(paymentId)}/capture`,
    {
      method: "POST",
      body: JSON.stringify({
        amount,
        currency: "INR",
      }),
    }
  );
}

/**
 * Cancel an existing Razorpay subscription.
 *
 * The actual subscription ID must come from the verified payment provider
 * response/database, never from an arbitrary client-provided value.
 */
export async function cancelPaymentSubscription(
  subscriptionId: string,
  cancelAtCycleEnd = true
): Promise<SubscriptionCancellationResult> {
  if (
    !subscriptionId ||
    subscriptionId.length > 200 ||
    !/^[A-Za-z0-9_]+$/.test(subscriptionId)
  ) {
    throw new Error("Invalid payment subscription ID.");
  }

  const suffix = cancelAtCycleEnd ? "?cancel_at_cycle_end=1" : "";

  return razorpayRequest<SubscriptionCancellationResult>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel${suffix}`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

/**
 * Fetch provider-side subscription status.
 */
export async function getPaymentSubscription(
  subscriptionId: string
) {
  if (
    !subscriptionId ||
    subscriptionId.length > 200 ||
    !/^[A-Za-z0-9_]+$/.test(subscriptionId)
  ) {
    throw new Error("Invalid payment subscription ID.");
  }

  return razorpayRequest<{
    id: string;
    status?: string;
    current_start?: number;
    current_end?: number;
    charge_at?: number;
    ended_at?: number;
    paid_count?: number;
    remaining_count?: number;
  }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`
  );
}

/**
 * Converts a Unix timestamp (seconds) from the payment provider into an ISO
 * timestamp used by the application's subscription model.
 */
export function unixSecondsToIso(
  value: number | null | undefined
) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return new Date(Number(value) * 1000).toISOString();
}

/**
 * Server-side webhook signature verification.
 *
 * Set RAZORPAY_WEBHOOK_SECRET in Vercel/server environment variables.
 * Never accept subscription activation based only on a browser redirect.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret || !rawBody || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

/**
 * Returns only public checkout configuration.
 * NEVER return the secret key.
 */
export function getPublicPaymentConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;

  if (!keyId) {
    throw new Error("Payment provider is not configured.");
  }

  return {
    provider: PAYMENT_PROVIDER,
    keyId,
    currency: "INR" as const,
  };
}

/**
 * Converts a paid provider status into the application's subscription status.
 */
export function mapProviderSubscriptionStatus(
  status: string | null | undefined
) {
  switch (status) {
    case "active":
      return "active" as const;

    case "authenticated":
      return "trialing" as const;

    case "cancelled":
    case "canceled":
      return "cancelled" as const;

    case "expired":
    case "completed":
      return "expired" as const;

    case "pending":
      return "past_due" as const;

    default:
      return "past_due" as const;
  }
}
