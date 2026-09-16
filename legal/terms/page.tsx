import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using AITrade Analyzer.",
};

export default function TermsPage() {
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
              Terms & Conditions
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Last updated: September 15, 2026
            </p>
          </header>

          <div className="space-y-7 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using AITrade Analyzer, you agree to these
                Terms & Conditions. If you do not agree with these terms, do
                not use the service.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                2. Description of the Service
              </h2>
              <p>
                AITrade Analyzer provides AI-assisted chart and market analysis
                tools. Features, plans, limits, data sources, and availability
                may change as the service develops.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                3. Account Responsibilities
              </h2>
              <p>
                You are responsible for maintaining the security of your
                account credentials and for activity performed through your
                account. You must provide accurate information and must not
                attempt to access another user's account.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                4. Acceptable Use
              </h2>
              <p>
                You must not misuse, disrupt, reverse engineer, scrape,
                overload, circumvent usage limits, attack, or attempt to gain
                unauthorized access to the service or its infrastructure.
                Automated access is permitted only where expressly supported
                by the service.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                5. AI Analysis and Financial Risk
              </h2>
              <p>
                AITrade Analyzer is not a broker, exchange, investment adviser,
                or financial planner. AI outputs may contain errors and are
                not guaranteed to be accurate or profitable. Trading and
                investing can result in substantial losses. You are solely
                responsible for decisions made using information from the
                service.
              </p>
              <p className="mt-3">
                Please also read our{" "}
                <Link
                  href="/legal/disclaimer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  Trading Risk Disclaimer
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                6. Subscriptions and Usage
              </h2>
              <p>
                Paid plans provide the analysis entitlement and billing period
                shown on the pricing page at the time of purchase. Usage
                limits apply according to the selected plan. Unused analyses
                do not automatically become cash, transferable credits, or
                guaranteed future entitlements unless expressly stated.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                7. Payments
              </h2>
              <p>
                Payments may be processed through a third-party payment
                provider. You authorize the applicable payment provider to
                process charges for the subscription you select. Payment
                confirmation and subscription activation are subject to
                successful verification.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                8. Cancellation, Renewal and Refunds
              </h2>
              <p>
                Subscription cancellation, renewal, expiry, and refunds are
                governed by the applicable subscription and refund policies.
                Cancellation does not automatically create a refund unless the
                applicable policy provides one.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                9. Third-Party Services and Data
              </h2>
              <p>
                The service may depend on third-party providers for
                authentication, payments, market data, hosting, AI processing,
                notifications, or other functionality. Availability and
                accuracy of third-party services are outside our direct
                control.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                10. Intellectual Property
              </h2>
              <p>
                The service, software, interface, branding, and original
                content are protected by applicable intellectual-property
                rights. Except as permitted by law or expressly authorized,
                you may not copy, redistribute, sell, or create derivative
                versions of protected service components.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                11. Service Availability
              </h2>
              <p>
                We do not guarantee uninterrupted or error-free operation.
                Maintenance, outages, provider failures, security incidents,
                market-data interruptions, and other circumstances may affect
                availability.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                12. Disclaimer of Warranties
              </h2>
              <p>
                To the maximum extent permitted by applicable law, the service
                is provided on an as-available basis without guarantees that
                its information, analysis, or functionality will always be
                complete, current, accurate, reliable, or suitable for a
                particular purpose.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                13. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, AITrade
                Analyzer and its operators will not be responsible for indirect,
                incidental, special, consequential, or trading-related losses
                arising from use of or inability to use the service. Nothing in
                these terms excludes liability that cannot legally be excluded.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                14. Suspension or Termination
              </h2>
              <p>
                Access may be suspended or terminated where reasonably
                necessary for security, abuse prevention, legal compliance,
                payment issues, or material violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                15. Changes to These Terms
              </h2>
              <p>
                We may update these terms as the service changes. Updated terms
                will be posted on this page with a revised update date.
                Continued use after an update constitutes acceptance to the
                extent permitted by law.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                16. Governing Law
              </h2>
              <p>
                The governing law and dispute-resolution provisions applicable
                to the service should be completed with the service operator's
                actual legal entity, jurisdiction, and registered details
                before production launch.
              </p>
            </section>

            <section className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
              <h2 className="mb-2 text-xl font-semibold text-blue-200">
                Important
              </h2>
              <p className="text-blue-100/90">
                This is a product-ready terms template, not a substitute for
                review by a qualified lawyer. Before accepting real customer
                payments, replace any placeholder legal details with the
                actual business entity, jurisdiction, contact information, and
                applicable Indian consumer/payment requirements.
              </p>
            </section>
          </div>

          <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
            Related:{" "}
            <Link
              href="/legal/privacy"
              className="text-blue-400 hover:text-blue-300"
            >
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link
              href="/legal/refund"
              className="text-blue-400 hover:text-blue-300"
            >
              Refund & Subscription Policy
            </Link>{" "}
            ·{" "}
            <Link
              href="/legal/responsible-trading"
              className="text-blue-400 hover:text-blue-300"
            >
              Responsible Trading Notice
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
