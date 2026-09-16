import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy policy for AITrade Analyzer.",
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Last updated: September 15, 2026
            </p>
          </header>

          <div className="space-y-7 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                1. Scope
              </h2>
              <p>
                This Privacy Policy explains how AITrade Analyzer may collect,
                use, store, disclose, and protect information when you use the
                service, website, account features, analysis tools, and related
                functionality.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                2. Information We May Collect
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Account information such as email address and authentication
                  information.
                </li>
                <li>
                  Profile and trader-preference information that you choose to
                  provide.
                </li>
                <li>
                  Trading-analysis inputs, including selected markets,
                  symbols, timeframes, and uploaded chart images.
                </li>
                <li>
                  Analysis history, favorites, usage information, and
                  subscription information needed to operate the service.
                </li>
                <li>
                  Payment-related identifiers supplied by the payment provider;
                  sensitive payment credentials should remain with the payment
                  provider.
                </li>
                <li>
                  Technical information such as request metadata, device or
                  browser information, security logs, and error information
                  where collected by the service infrastructure.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                3. How Information Is Used
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>Provide and operate AITrade Analyzer.</li>
                <li>Authenticate users and protect accounts.</li>
                <li>Process subscriptions and maintain usage limits.</li>
                <li>Generate requested AI-assisted analysis.</li>
                <li>Save features that you explicitly use, such as history and favorites.</li>
                <li>Detect abuse, fraud, security threats, and technical problems.</li>
                <li>Improve reliability, performance, and product functionality.</li>
                <li>Provide support and respond to service requests.</li>
                <li>Comply with applicable legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                4. Uploaded Images and Analysis Data
              </h2>
              <p>
                When you upload a chart image for analysis, the image and
                associated analysis inputs may be processed by the service and
                its AI infrastructure to provide the requested result. Do not
                upload confidential personal documents, passwords, payment
                credentials, private keys, or other information that is not
                necessary for chart analysis.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                5. Third-Party Service Providers
              </h2>
              <p>
                AITrade Analyzer may use third-party providers for
                authentication, database hosting, AI processing, payment
                processing, market data, hosting, analytics, email, push
                notifications, or other infrastructure. Information may be
                processed by those providers as necessary to provide the
                requested functionality and subject to their applicable terms
                and privacy policies.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                6. Payments
              </h2>
              <p>
                Payment transactions may be handled by a third-party payment
                provider. AITrade Analyzer should not collect or store full
                card numbers, CVV values, UPI PINs, banking passwords, or other
                payment authentication secrets. Payment-provider identifiers
                may be retained to associate verified transactions with
                subscriptions and support requests.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                7. Security
              </h2>
              <p>
                We use reasonable technical and organizational measures
                appropriate to the service to protect information from
                unauthorized access, alteration, disclosure, or destruction.
                No internet service can guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                8. Data Retention
              </h2>
              <p>
                Information may be retained for as long as reasonably necessary
                to provide the service, maintain account and subscription
                records, prevent abuse, resolve disputes, maintain security,
                satisfy legal requirements, or meet legitimate operational
                needs. Specific retention periods should be finalized before
                production launch based on the actual storage architecture and
                applicable legal requirements.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                9. Your Choices and Requests
              </h2>
              <p>
                Depending on applicable law and the service functionality, you
                may have rights or choices concerning access, correction,
                deletion, portability, restriction, or objection to certain
                processing. Contact the service operator through the official
                support channel to make a request.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                10. Cookies and Similar Technologies
              </h2>
              <p>
                Authentication and security functionality may use cookies or
                similar technologies. Additional analytics or preference
                technologies should be disclosed here before they are enabled
                in production.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                11. Children's Privacy
              </h2>
              <p>
                The service is not intended to knowingly collect personal
                information from children in violation of applicable law. If
                you believe a child has provided personal information
                improperly, contact the service operator.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                12. International Processing
              </h2>
              <p>
                Third-party infrastructure may process information in
                jurisdictions different from your own. The final production
                policy should identify relevant providers and applicable
                cross-border data-transfer arrangements.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                13. Policy Changes
              </h2>
              <p>
                This policy may be updated when the service, providers,
                practices, or legal requirements change. The updated version
                will be published on this page with a revised date.
              </p>
            </section>

            <section className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
              <h2 className="mb-2 text-xl font-semibold text-blue-200">
                Production Privacy Review
              </h2>
              <p className="text-blue-100/90">
                Before launch, complete this policy with the actual legal
                entity, registered/contact details, support contact, data
                retention periods, processor list, cookie/analytics choices,
                applicable Indian privacy requirements, and the actual data
                deletion process used by the application.
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
              href="/legal/refund"
              className="text-blue-400 hover:text-blue-300"
            >
              Refund & Subscription Policy
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
