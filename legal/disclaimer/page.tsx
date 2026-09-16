import Link from "next/link";

export const metadata = {
  title: "Trading Risk Disclaimer",
  description:
    "Important risk disclaimer for AITrade Analyzer users.",
};

export default function DisclaimerPage() {
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
              Legal & Risk Information
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Trading Risk Disclaimer
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Last updated: September 15, 2026
            </p>
          </header>

          <div className="space-y-7 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                1. General Information Only
              </h2>
              <p>
                AITrade Analyzer provides AI-assisted market and chart analysis
                for informational and educational purposes only. The service
                does not provide personalized investment, financial, legal, or
                tax advice.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                2. No Guarantee of Results
              </h2>
              <p>
                AI-generated analysis, signals, price levels, confidence
                estimates, market observations, and other outputs may be
                inaccurate, incomplete, delayed, or wrong. Past performance
                does not guarantee future results. No profit or accuracy
                guarantee is made.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                3. Trading Risk
              </h2>
              <p>
                Trading and investing in crypto, stocks, forex, derivatives, or
                other financial instruments involves substantial risk,
                including the possible loss of some or all of your capital.
                Leverage and derivatives can increase losses significantly.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                4. User Responsibility
              </h2>
              <p>
                You are solely responsible for your trading and investment
                decisions. Before placing a trade, independently verify market
                prices, liquidity, news, regulations, fees, risk, position
                size, stop-loss levels, and other relevant information.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                5. Market Data & AI Limitations
              </h2>
              <p>
                Market data can be unavailable, delayed, interrupted, or
                supplied by third-party sources. AI systems can misunderstand
                charts, symbols, patterns, news, or market conditions. You
                should not rely on a single AI output as the basis for a
                financial decision.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                6. No Fiduciary Relationship
              </h2>
              <p>
                Use of AITrade Analyzer does not create an advisory,
                fiduciary, broker, portfolio-manager, or client relationship
                between you and the service.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                7. Regulatory Compliance
              </h2>
              <p>
                You are responsible for determining whether your use of the
                service and any resulting trading activity complies with the
                laws, regulations, exchange rules, and tax obligations that
                apply to you.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                8. Emergency & Technical Risk
              </h2>
              <p>
                Technical failures, outages, connectivity problems, exchange
                interruptions, incorrect data, software defects, or other
                events may affect analysis availability or accuracy. Do not
                assume that the service will always be available when a
                trading decision must be made.
              </p>
            </section>

            <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
              <h2 className="mb-2 text-xl font-semibold text-amber-200">
                Important Warning
              </h2>
              <p className="text-amber-100/90">
                Never trade money you cannot afford to lose. Consider speaking
                with a qualified, appropriately licensed financial professional
                before making investment decisions.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                9. Acceptance
              </h2>
              <p>
                By using AITrade Analyzer, you acknowledge that you understand
                the risks described above and that you remain responsible for
                your own financial decisions.
              </p>
            </section>
          </div>

          <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
            This disclaimer should be read together with our{" "}
            <Link
              href="/legal/terms"
              className="text-blue-400 hover:text-blue-300"
            >
              Terms & Conditions
            </Link>{" "}
            and{" "}
            <Link
              href="/legal/responsible-trading"
              className="text-blue-400 hover:text-blue-300"
            >
              Responsible Trading Notice
            </Link>
            .
          </footer>
        </article>
      </div>
    </main>
  );
}
