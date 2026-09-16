"use client";

import { FormEvent, useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setStatus("");
    setLoading(true);

    try {
      const response = await fetch(
        "/api/contact",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            subject,
            message,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to send your message.",
        );
      }

      setStatus(
        "Your message has been sent successfully.",
      );
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Unable to send your message.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">SUPPORT</span>
          <h1>Contact Support</h1>
          <p>
            Send us your question, feedback, or
            account-related request.
          </p>
        </div>
      </div>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Send a message</h2>
          <p>
            Please do not include passwords, API keys,
            payment credentials, or other sensitive
            information.
          </p>

          <form
            onSubmit={handleSubmit}
            className="contact-form"
          >
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                maxLength={100}
                required
                autoComplete="name"
                placeholder="Your name"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                maxLength={320}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <label>
              Subject
              <input
                type="text"
                value={subject}
                onChange={(event) =>
                  setSubject(event.target.value)
                }
                maxLength={160}
                required
                placeholder="How can we help?"
              />
            </label>

            <label>
              Message
              <textarea
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                maxLength={4000}
                required
                rows={7}
                placeholder="Describe your request..."
              />
            </label>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send message"}
            </button>

            {status ? (
              <div
                className="form-status"
                role="status"
              >
                {status}
              </div>
            ) : null}
          </form>
        </article>

        <aside className="dashboard-card">
          <h2>Before contacting us</h2>

          <ul className="security-list">
            <li>
              Never share your password or API secret.
            </li>
            <li>
              For payment issues, keep your transaction
              reference available.
            </li>
            <li>
              For analysis problems, mention the symbol
              and timeframe used.
            </li>
            <li>
              Do not send private keys or wallet seed
              phrases.
            </li>
          </ul>

          <div className="info-panel">
            <strong>Trading risk</strong>
            <p>
              AITrade Analyzer provides informational
              analysis and does not guarantee profits or
              trading outcomes.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
