import Link from "next/link";
import { notFound } from "next/navigation";

import RazorpayButton from "@/components/payments/RazorpayButton";
import { getServerUser } from "@/lib/supabase/server";
import {
  getLaunchOfferPrice,
  getPlanConfig,
  validateSubscriptionPlan,
} from "@/lib/subscription";

type CheckoutPageProps = {
  searchParams: Promise<{
    plan?: string;
  }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams;
  const planId = params.plan;

  if (!planId || !validateSubscriptionPlan(planId)) {
    notFound();
  }

  const plan = getPlanConfig(planId);

  if (!plan || plan.id === "free") {
    notFound();
  }

  const user = await getServerUser();

  const launchOfferEndDate =
    process.env.NEXT_PUBLIC_LAUNCH_OFFER_END_DATE;

  const launchOfferActive = launchOfferEndDate
    ? new Date() < new Date(launchOfferEndDate)
    : true;

  const payablePrice = launchOfferActive
    ? getLaunchOfferPrice(plan.priceInr)
    : plan.priceInr;

  const billingText =
    plan.billingInterval === "year"
      ? "per year"
      : "per month";

  const loginRedirect = `/checkout?plan=${encodeURIComponent(
    plan.id
  )}`;

  return (
    <main className="min-h-screen bg-black px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.25em] text-cyan-400">
              Secure Checkout
            </p>

            <h1 className="text-3xl font-bold sm:text-4xl">
              {plan.name} Plan
            </h1>

            <p className="mt-3 text-sm text-white/60">
              Complete your payment securely with Razorpay.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {plan.name}
                </h2>

                <p className="mt-1 text-sm text-white/60">
                  {plan.description}
                </p>
              </div>

              {plan.popular && (
                <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                  Popular
                </span>
              )}
            </div>

            <div className="my-6 border-t border-white/10" />

            <div className="flex items-end justify-between gap-4">
              <div>
                {launchOfferActive && (
                  <p className="text-sm text-white/40 line-through">
                    ₹{plan.priceInr.toLocaleString("en-IN")}
                  </p>
                )}

                <p className="text-3xl font-bold text-white">
                  ₹{payablePrice.toLocaleString("en-IN")}
                </p>

                <p className="mt-1 text-sm text-white/50">
                  {billingText}
                </p>
              </div>

              {launchOfferActive && (
                <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
                  25% Launch Offer
                </div>
              )}
            </div>

            <div className="mt-6 rounded-xl bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  AI Analysis Limit
                </span>

                <span className="font-semibold text-white">
                  {plan.analysisLimit.toLocaleString("en-IN")}
                  {plan.billingInterval === "year"
                    ? " / year"
                    : " / month"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {user ? (
              <RazorpayButton
                plan={plan.id}
                className="w-full"
              />
            ) : (
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5 text-center">
                <p className="text-sm text-yellow-200">
                  Please login before making the payment.
                </p>

                <Link
                  href={`/login?redirect=${encodeURIComponent(
                    loginRedirect
                  )}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-black transition hover:bg-cyan-300"
                >
                  Login to Continue
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/pricing"
              className="text-sm text-white/50 transition hover:text-white"
            >
              ← Back to Pricing
            </Link>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-white/35">
            Payment is processed securely through Razorpay. Your card,
            UPI, or other payment credentials are handled by the payment
            provider.
          </p>
        </div>
      </div>
    </main>
  );
}