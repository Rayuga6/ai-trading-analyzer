import Link from "next/link";

export const metadata = {
  title: "Refund & Subscription Policy",
  description:
    "Refund, cancellation, renewal, and subscription policy for AITrade Analyzer.",
};

export default function RefundPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-slate-400 transition hover:text-white"
        >
          ← Back to AITrade Analyzer
        </Link>

        <article className="app-card p-6 sm:p-10">
          <header className="mb-8 border-b border-white/10 pb-6">
            <p className="mb-2 text-sm font-medium text-blue-400">
              Legal
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Refund & Subscription Policy
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Last updated: September 15, 2026
            </p>
          </header>

          <div className="space-y-7 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                1. Subscription Plans
              </h2>
              <p>
                AITrade Analyzer may offer Free, Basic, Starter, Pro, Elite,
                and Elite Yearly plans. The applicable price, billing period,
                analysis allowance, and promotional price are shown on the
                pricing page at the time of purchase.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                2. Free Plan
              </h2>
              <p>
                The Free plan includes one lifetime free analysis. Once the
                lifetime allowance has been used, continued analysis access
                requires an applicable paid plan unless the service explicitly
                provides another free allowance.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                3. Promotional Pricing
              </h2>
              <p>
                Promotional discounts, including launch offers, apply only
                where displayed and for the period stated on the pricing or
                checkout page. A promotional price does not create a permanent
                entitlement to the discounted rate.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                4. Renewal
              </h2>
              <p>
                Where a plan is configured for recurring billing, the
                subscription may renew according to the billing interval shown
                at checkout, subject to successful payment and the terms of the
                payment provider. Renewal terms should be clearly displayed
                before the customer completes checkout.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                5. Cancellation
              </h2>
              <p>
                You may request cancellation of an active paid subscription
                using the available cancellation functionality or the official
                support channel. Cancellation stops future renewal according to
                the applicable provider and plan rules. It does not
                automatically reverse a payment that has already been
                successfully processed.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                6. Access After Cancellation
              </h2>
              <p>
                Unless otherwise stated for the applicable plan or required by
                law, cancellation may take effect at the end of the already
                paid billing period. The account may retain access to the paid
                features until that period ends, while future renewal is
                disabled.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                7. Refund Requests
              </h2>
              <p>
                Refund eligibility depends on the applicable plan, payment
                circumstances, promotional terms, applicable law, and the
                service operator's final refund rules. A completed payment is
                not automatically refundable merely because a customer stops
                using the service.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                8. Duplicate or Incorrect Charges
              </h2>
              <p>
                If you believe you were charged twice, charged for the wrong
                plan, or charged after a valid cancellation, contact support
                with the transaction details. Verified duplicate or incorrect
                charges may be reviewed for correction or refund.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                9. Failed Payments
              </h2>
              <p>
                If a recurring payment fails, access may be restricted,
                suspended, or moved to an applicable past-due state according
                to the subscription system and payment provider. You may need
                to complete a successful payment to restore paid access.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                10. Expiry
              </h2>
              <p>
                When a subscription reaches its applicable end date and is not
                successfully renewed, paid entitlements may expire and the
                account may return to the Free plan or another applicable
                access state.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                11. Service Issues
              </h2>
              <p>
                Temporary technical problems do not automatically establish a
                right to a refund. Where appropriate, support may investigate
                material service failures and determine an appropriate remedy
                consistent with applicable law and the final published policy.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                12. How to Contact Support
              </h2>
              <p>
                Refund or billing requests should be submitted through the
                official support/contact channel with the account email,
                transaction identifier, plan name, purchase date, and a clear
                description of the issue. Do not send card numbers, CVV,
                passwords, UPI PINs, or other payment authentication secrets.
              </p>
            </section>

            <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
              <h2 className="mb-2 text-xl font-semibold text-amber-200">
                Production Requirement
              </h2>
              <p className="text-amber-100/90">
                Before accepting real customer payments, this policy must be
                finalized against the actual business entity, payment
                provider, subscription configuration, applicable Indian
                consumer/payment requirements, cancellation flow, support
                process, and legally approved refund rules. This template does
                not promise a refund where the final legal policy does not
                provide one.
              </p>
            </section>
          </div>

          <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
            Related:{" "}
            <Link
              href="/legal/terms"
              className="text-blue-400 hover:text-blue-300"
            >
              Terms & Conditions
            </Link>{" "}
            ·{" "}
            <Link
              href="/legal/privacy"
              className="text-blue-400 hover:text-blue-300"
            >
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link
              href="/legal/disclaimer"
              className="text-blue-400 hover:text-blue-300"
            >
              Trading Risk Disclaimer
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
