import Link from "next/link";

export const metadata = {
  title: "Responsible Trading Notice",
  description:
    "Responsible trading and risk-management guidance for AITrade Analyzer users.",
};

export default function ResponsibleTradingPage() {
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
              Risk Management
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Responsible Trading Notice
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              Last updated: September 15, 2026
            </p>
          </header>

          <div className="space-y-7 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                1. Trade Within Your Means
              </h2>
              <p>
                Only use money that you can afford to lose. Do not use
                emergency savings, essential household funds, borrowed money,
                or money needed for important expenses to take trading risk.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                2. Understand the Instrument
              </h2>
              <p>
                Before trading, understand the instrument, exchange, fees,
                liquidity, volatility, market hours, settlement rules, and
                applicable regulations. Derivatives and leveraged products can
                produce losses much faster than unleveraged positions.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                3. Use Risk Controls
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>Define the maximum amount you are willing to lose before entering.</li>
                <li>Consider position sizing appropriate to your total capital.</li>
                <li>Use stop-loss or other risk controls where appropriate.</li>
                <li>Avoid concentrating excessive capital in one position.</li>
                <li>Do not increase risk simply to recover a previous loss.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                4. Do Not Blindly Follow AI Signals
              </h2>
              <p>
                AITrade Analyzer outputs are analytical assistance, not
                guaranteed trading instructions. Verify the chart, market data,
                news, price, liquidity, and your own risk plan before acting on
                an AI-generated observation or signal.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                5. Avoid Revenge Trading
              </h2>
              <p>
                A losing trade does not need to be immediately recovered.
                Consider pausing after significant losses and reviewing your
                trading plan instead of increasing position size because of
                emotion or frustration.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                6. Keep a Trading Record
              </h2>
              <p>
                Recording entries, exits, position size, risk, reasoning,
                results, and mistakes can help you evaluate your process over
                time. Do not judge a strategy only by a small number of trades.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                7. Be Careful With Leverage
              </h2>
              <p>
                Leverage magnifies both gains and losses and can result in rapid
                liquidation. If you do not fully understand margin,
                liquidation, funding, and maintenance requirements, do not use
                leveraged trading products.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                8. Verify Important Information
              </h2>
              <p>
                Market conditions can change rapidly. Third-party data can be
                delayed or unavailable, and AI can make mistakes. For
                significant financial decisions, independently verify
                time-sensitive information using reliable sources.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                9. Protect Your Account
              </h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>Use a strong, unique account password.</li>
                <li>Never share authentication codes or passwords.</li>
                <li>Never disclose exchange API secrets or private keys to AITrade Analyzer.</li>
                <li>Review suspicious account or payment activity promptly.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                10. Take a Break When Needed
              </h2>
              <p>
                Trading should not interfere with essential responsibilities
                or become a source of uncontrolled financial behavior. If
                trading is causing serious financial or personal problems,
                consider stopping and seeking appropriate professional support.
              </p>
            </section>

            <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
              <h2 className="mb-2 text-xl font-semibold text-amber-200">
                Important
              </h2>
              <p className="text-amber-100/90">
                There is no guaranteed trading strategy, signal, win rate, or
                profit. AITrade Analyzer cannot eliminate market risk. You are
                responsible for your own trading decisions and losses.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xl font-semibold text-white">
                11. Educational Purpose
              </h2>
              <p>
                This notice is intended to encourage disciplined and informed
                use of trading tools. It is not personalized financial advice
                and does not establish a professional advisory relationship.
              </p>
            </section>
          </div>

          <footer className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400">
            Related:{" "}
            <Link
              href="/legal/disclaimer"
              className="text-blue-400 hover:text-blue-300"
            >
              Trading Risk Disclaimer
            </Link>{" "}
            ·{" "}
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
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
