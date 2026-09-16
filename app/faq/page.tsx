"use client";

import { useState } from "react";

type FAQItem = {
  question: string;
  answer: string;
};

const FAQS: FAQItem[] = [
  {
    question: "What is AITrade Analyzer?",
    answer:
      "AITrade Analyzer is an informational market-analysis tool that helps users review chart data and generate AI-assisted trading analysis. It does not guarantee profits or trading results.",
  },
  {
    question: "Does the AI guarantee profit?",
    answer:
      "No. AI-generated analysis can be wrong, incomplete, delayed, or affected by market conditions. Always verify information independently before making a trading decision.",
  },
  {
    question: "How does the Free plan work?",
    answer:
      "The Free plan provides 1 lifetime analysis. Paid plans provide a defined number of analyses according to the selected subscription.",
  },
  {
    question: "What paid plans are available?",
    answer:
      "The available plans are Basic, Starter, Pro, Elite, and Elite Yearly. Pricing and included analysis limits are shown on the Pricing page.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes. Subscription cancellation is available through the account subscription controls. Provider-side billing status and access are handled according to the subscription policy.",
  },
  {
    question: "What happens when my subscription expires?",
    answer:
      "Paid access ends when the subscription period expires unless it is renewed. Your account and eligible historical data are handled according to the applicable policies.",
  },
  {
    question: "Is Paper Trading real money?",
    answer:
      "No. Paper Trading is designed for simulated trading only. It does not place real-money trades.",
  },
  {
    question: "What is Backtesting?",
    answer:
      "Backtesting uses historical candle data to simulate a strategy and review metrics such as return, net profit, win rate, and drawdown. Historical simulation does not guarantee future performance.",
  },
  {
    question: "Can I share an analysis?",
    answer:
      "The application includes analysis-sharing functionality where enabled. Shared links should be treated as potentially accessible to anyone who has the link, so do not share sensitive information.",
  },
  {
    question: "How are notifications used?",
    answer:
      "Notifications can be used for system messages, analysis events, price alerts, subscription events, payment updates, and security-related messages.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Use the Contact Support page to submit your request. Never include passwords, private keys, seed phrases, API secrets, or other sensitive credentials.",
  },
  {
    question: "Is my trading data completely risk-free?",
    answer:
      "No. Market data, AI analysis, third-party services, and internet connectivity can have limitations or interruptions. Review the Risk Disclaimer, Terms, Privacy Policy, and Responsible Trading Notice before using the service.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] =
    useState<number | null>(0);

  return (
    <main className="page-shell">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">SUPPORT</span>
          <h1>Frequently Asked Questions</h1>
          <p>
            Find quick answers about AITrade Analyzer,
            subscriptions, analysis, and support.
          </p>
        </div>
      </div>

      <section className="dashboard-card">
        <div className="faq-list">
          {FAQS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className="faq-item"
              >
                <button
                  type="button"
                  className="faq-question"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenIndex(
                      isOpen ? null : index,
                    )
                  }
                >
                  <span>{item.question}</span>
                  <span
                    aria-hidden="true"
                    className="faq-icon"
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-card faq-footer">
        <h2>Still need help?</h2>
        <p>
          If your question is not answered here, contact
          support and provide the details needed to
          understand your request.
        </p>

        <a
          href="/contact"
          className="btn-primary"
        >
          Contact Support
        </a>
      </section>
    </main>
  );
}
