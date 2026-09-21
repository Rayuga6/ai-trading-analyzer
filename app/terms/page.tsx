export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-4xl font-bold text-cyan-400">
          Terms & Conditions
        </h1>

        <p className="mb-6 text-slate-300">
          Last updated: September 2026
        </p>

        <section className="space-y-6 text-slate-300">
          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              1. Use of Service
            </h2>
            <p>
              AITrade Analyzer provides AI-based technical chart analysis for
              informational and educational purposes.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              2. User Responsibilities
            </h2>
            <p>
              You are responsible for the information you provide and for
              decisions made while using our service.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              3. Prohibited Activities
            </h2>
            <p>
              Users must not misuse the platform, attempt unauthorized access,
              or interfere with the security of the service.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              4. Service Changes
            </h2>
            <p>
              We may update, modify, suspend, or discontinue features of the
              service when necessary.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              5. Acceptance
            </h2>
            <p>
              By using AITrade Analyzer, you agree to these Terms &
              Conditions.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}