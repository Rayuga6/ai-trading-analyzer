 export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-4xl font-bold text-cyan-400">
          Privacy Policy
        </h1>

        <p className="mb-6 text-slate-300">
          Last updated: September 2026
        </p>

        <section className="space-y-6 text-slate-300">
          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              1. Information We Collect
            </h2>
            <p>
              AITrade Analyzer may collect information such as your email
              address, account details, uploaded chart images, and usage data
              when you use our services.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              2. How We Use Information
            </h2>
            <p>
              We use collected information to provide, maintain, secure, and
              improve our services and to manage user accounts and subscriptions.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              3. Chart Images
            </h2>
            <p>
              Uploaded chart images may be processed to generate AI-based
              technical analysis. Do not upload confidential or sensitive
              information.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              4. Data Security
            </h2>
            <p>
              We take reasonable measures to protect your information.
              However, no online service can guarantee complete security.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              5. Third-Party Services
            </h2>
            <p>
              Our services may use third-party providers for authentication,
              payments, hosting, analytics, and other necessary functions.
            </p>
          </div>

          <div>
            <h2 className="mb-2 text-2xl font-semibold text-white">
              6. Contact Us
            </h2>
            <p>
              If you have questions about this Privacy Policy, please contact
              the AITrade Analyzer support team.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}