export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-4xl font-bold text-cyan-400">
          Disclaimer
        </h1>

        <p className="mb-6 text-slate-300">
          Last updated: September 2026
        </p>

        <section className="space-y-6 text-slate-300">
          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              1. Educational Purpose
            </h2>
            <p>
              AITrade Analyzer provides technical analysis for informational
              and educational purposes only. It does not provide financial,
              investment, or trading advice.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              2. Trading Risks
            </h2>
            <p>
              Trading financial markets involves significant risk, including
              the possible loss of your invested capital.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              3. No Profit Guarantee
            </h2>
            <p>
              AI-generated analysis does not guarantee profits or future market
              performance.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              4. User Responsibility
            </h2>
            <p>
              You are solely responsible for your trading and investment
              decisions. Always conduct your own research before taking action.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}