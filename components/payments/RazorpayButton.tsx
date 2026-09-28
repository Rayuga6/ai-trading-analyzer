"use client";

import { useState } from "react";
import type { SubscriptionPlan } from "@/lib/database";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void | Promise<void>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayPaymentResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type CreateOrderResponse = {
  success: boolean;
  keyId?: string;
  amount?: number;
  currency?: string;
  orderId?: string;
  planName?: string;
  error?: string;
};

type VerifyPaymentResponse = {
  success: boolean;
  verified?: boolean;
  paymentSaved?: boolean;
  error?: string;
};

type ActivateSubscriptionResponse = {
  success: boolean;
  alreadyActivated?: boolean;
  subscription?: {
    plan?: string;
    status?: string;
    monthly_limit?: number;
    analyses_used?: number;
  };
  analysisLimit?: number;
  error?: string;
};

type Props = {
  plan: Exclude<SubscriptionPlan, "free">;
  className?: string;
};

const RAZORPAY_SCRIPT =
  "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT}"]`
    );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => resolve(true),
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () => resolve(false),
        { once: true }
      );

      return;
    }

    const script = document.createElement("script");

    script.src = RAZORPAY_SCRIPT;
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function RazorpayButton({
  plan,
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handlePayment() {
    if (loading) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // ----------------------------------------------------------
      // 1. Load Razorpay Checkout
      // ----------------------------------------------------------
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load Razorpay Checkout. Please refresh and try again."
        );
      }

      // ----------------------------------------------------------
      // 2. Create order on the server
      // ----------------------------------------------------------
      const orderResponse = await fetch(
        "/api/razorpay/create-order",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            plan,
          }),
        }
      );

      const orderData =
        (await orderResponse.json()) as CreateOrderResponse;

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(
          orderData.error ||
            "Unable to create Razorpay payment order."
        );
      }

      if (
        !orderData.keyId ||
        !orderData.amount ||
        !orderData.currency ||
        !orderData.orderId
      ) {
        throw new Error(
          "Invalid payment order received from the server."
        );
      }

      // ----------------------------------------------------------
      // 3. Open Razorpay Checkout
      // ----------------------------------------------------------
      const razorpay = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AITrade Analyzer",
        description:
          orderData.planName
            ? `${orderData.planName} subscription`
            : "AITrade Analyzer subscription",
        order_id: orderData.orderId,

        handler: async (response) => {
          try {
            // ----------------------------------------------------
            // 4. Verify payment on server
            // ----------------------------------------------------
            setMessage("Verifying payment...");

            const verifyResponse = await fetch(
              "/api/razorpay/verify-payment",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  plan,
                  razorpay_payment_id:
                    response.razorpay_payment_id,
                  razorpay_order_id:
                    response.razorpay_order_id,
                  razorpay_signature:
                    response.razorpay_signature,
                }),
              }
            );

            const verifyData =
              (await verifyResponse.json()) as VerifyPaymentResponse;

            if (
              !verifyResponse.ok ||
              !verifyData.success ||
              !verifyData.verified ||
              !verifyData.paymentSaved
            ) {
              throw new Error(
                verifyData.error ||
                  "Payment verification failed."
              );
            }

            // ----------------------------------------------------
            // 5. Activate subscription on server
            // ----------------------------------------------------
            setMessage("Activating your subscription...");

            const activateResponse = await fetch(
              "/api/razorpay/activate-subscription",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  plan,
                  razorpayPaymentId:
                    response.razorpay_payment_id,
                  razorpayOrderId:
                    response.razorpay_order_id,
                }),
              }
            );

            const activateData =
              (await activateResponse.json()) as ActivateSubscriptionResponse;

            if (
              !activateResponse.ok ||
              !activateData.success
            ) {
              throw new Error(
                activateData.error ||
                  "Payment was verified, but subscription activation failed."
              );
            }

            // ----------------------------------------------------
            // 6. Subscription activated
            // ----------------------------------------------------
            setMessage(
              "Payment successful. Your premium subscription is active."
            );

            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 800);
          } catch (error) {
            console.error(
              "Razorpay payment processing error:",
              error
            );

            setMessage(
              error instanceof Error
                ? error.message
                : "Payment processing failed."
            );

            setLoading(false);
          }
        },

        theme: {
          color: "#22d3ee",
        },

        modal: {
          ondismiss: () => {
            setLoading(false);
            setMessage("Payment cancelled.");
          },
        },
      });

      razorpay.open();
    } catch (error) {
      console.error(
        "Razorpay checkout error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to start payment."
      );

      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className={[
          "inline-flex min-h-12 w-full items-center justify-center",
          "rounded-xl px-5 font-semibold transition",
          "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {loading ? "Processing..." : "Pay & Upgrade"}
      </button>

      {message && (
        <p className="mt-3 text-center text-sm text-slate-300">
          {message}
        </p>
      )}
    </div>
  );
}