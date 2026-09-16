import {
  ALL_PLAN_CONFIGS,
  getLaunchOfferEndDate,
  getLaunchOfferPrice,
  LAUNCH_OFFER,
} from "@/lib/subscription";

export const dynamic = "force-dynamic";

const FEATURES: Record<string, string[]> = {
  free: [
    "1 lifetime AI analysis",
    "Chart upload analysis",
    "Basic trading insights",
  ],
  basic: [
    "25 AI analyses/month",
    "Trend + entry analysis",
    "Stop loss + TP1/TP2/TP3",
    "Support & resistance",
  ],
  starter: [
    "50 AI analyses/month",
    "Everything in Basic",
    "Advanced technical indicators",
    "Market structure insights",
  ],
  pro: [
    "150 AI analyses/month",
    "Everything in Starter",
    "Advanced AI chart intelligence",
    "Performance & accuracy tracking",
  ],
  elite: [
    "500 AI analyses/month",
    "Everything in Pro",
    "Priority analysis capacity",
    "Advanced trader dashboard",
  ],
  elite_yearly: [
    "6,000 AI analyses/year",
    "Everything in Elite",
    "Best annual value",
    "Priority analysis capacity",
  ],
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export default function PricingPage() {
  /*
   * The offer end timestamp is generated on the server and rendered into
   * the page. For a production launch, set NEXT_PUBLIC_LAUNCH_OFFER_END_DATE
   * to the fixed campaign end timestamp so the 30-day window does not reset
   * on each request.
   */
  const configuredEnd = process.env.NEXT_PUBLIC_LAUNCH_OFFER_END_DATE;
  const offerEndDate = configuredEnd
    ? new Date(configuredEnd)
    : getLaunchOfferEndDate(new Date());

  const offerEndIso = offerEndDate.toISOString();

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <header className="border-b border-white/10 bg-[#090e19]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight md:text-2xl">
              AI<span className="text-cyan-400">Trade</span> Analyzer
            </h1>
            <p className="text-xs text-slate-400">Simple, transparent pricing</p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Back to Analyzer
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-10 md:px-8 md:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300">
            ✦ Launch Offer — {LAUNCH_OFFER.discountPercent}% OFF
          </div>

          <h2 className="text-4xl font-bold tracking-tight md:text-6xl">
            Choose the plan that fits your trading
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400 md:text-lg">
            Start free, then upgrade when you need more AI chart analyses.
            Prices and analysis limits are shown clearly before payment.
          </p>

          <div
            id="launch-countdown"
            data-offer-end={offerEndIso}
            className="mx-auto mt-7 max-w-xl rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">
              Launch offer ends
            </p>
            <p
              id="launch-countdown-value"
              className="mt-1 text-2xl font-bold tabular-nums md:text-3xl"
            >
              Calculating…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Server-defined campaign end time
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Object.values(ALL_PLAN_CONFIGS).map((plan) => {
            const discounted =
              plan.priceInr > 0
                ? getLaunchOfferPrice(plan.priceInr)
                : 0;

            return (
              <article
                key={plan.id}
                className={[
                  "relative flex flex-col rounded-3xl border p-6 shadow-xl backdrop-blur",
                  plan.popular
                    ? "border-cyan-400/50 bg-cyan-400/[0.07] ring-1 ring-cyan-400/20"
                    : "border-white/10 bg-slate-900/70",
                ].join(" ")}
              >
                {plan.popular && (
                  <span className="absolute right-5 top-5 rounded-full bg-cyan-400 px-3 py-1 text-xs font-bold text-slate-950">
                    MOST POPULAR
                  </span>
                )}

                <div>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                  <p className="mt-2 min-h-10 text-sm text-slate-400">
                    {plan.description}
                  </p>
                </div>

                <div className="mt-6">
                  {plan.priceInr === 0 ? (
                    <div className="text-4xl font-bold">₹0</div>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold">
                          ₹{formatPrice(discounted)}
                        </span>
                        <span className="pb-1 text-sm text-slate-500 line-through">
                          ₹{formatPrice(plan.priceInr)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-cyan-300">
                        Launch price · {LAUNCH_OFFER.discountPercent}% off
                      </p>
                    </>
                  )}

                  <p className="mt-2 text-sm text-slate-400">
                    {plan.billingInterval === "year"
                      ? "per year"
                      : plan.billingInterval === "month"
                        ? "per month"
                        : "lifetime"}
                  </p>
                </div>

                <ul className="mt-6 space-y-3 border-t border-white/10 pt-6">
                  {FEATURES[plan.id].map((feature) => (
                    <li
                      key={feature}
                      className="flex gap-3 text-sm text-slate-200"
                    >
                      <span className="text-emerald-400">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={
                    plan.id === "free"
                      ? "/"
                      : `/checkout?plan=${encodeURIComponent(plan.id)}`
                  }
                  className={[
                    "mt-8 inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold transition active:scale-[0.98]",
                    plan.popular
                      ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                      : "bg-white/10 text-white hover:bg-white/15",
                  ].join(" ")}
                >
                  {plan.id === "free" ? "Start Free" : "Choose Plan"}
                </a>
              </article>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-4xl rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5 text-center text-sm text-slate-300">
          <strong className="text-amber-300">Important:</strong>{" "}
          AITrade Analyzer provides analysis and educational information, not
          guaranteed trading profits or financial advice. Trading involves risk.
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (() => {
              const root = document.getElementById("launch-countdown");
              const value = document.getElementById("launch-countdown-value");
              if (!root || !value) return;

              const end = new Date(root.dataset.offerEnd || "").getTime();

              const update = () => {
                const remaining = end - Date.now();

                if (!Number.isFinite(end) || remaining <= 0) {
                  value.textContent = "Offer ended";
                  return;
                }

                const totalSeconds = Math.floor(remaining / 1000);
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                value.textContent =
                  days + "d " +
                  String(hours).padStart(2, "0") + "h " +
                  String(minutes).padStart(2, "0") + "m " +
                  String(seconds).padStart(2, "0") + "s";
              };

              update();
              window.setInterval(update, 1000);
            })();
          `,
        }}
      />
    </main>
  );
}
