"use client";

import { useCallback, useEffect, useState } from "react";

type Referral = {
  id: string;
  code: string;
  status: "pending" | "completed" | "cancelled";
  rewardAmount: number;
  rewardCurrency: string;
  createdAt: string;
  completedAt: string | null;
};

type ReferralResponse = {
  success?: boolean;
  enabled?: boolean;
  code?: string;
  link?: string;
  referrals?: Referral[];
  summary?: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
    rewards: number;
    currency: string;
  };
  error?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatReward(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ReferralPage() {
  const [data, setData] =
    useState<ReferralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadReferral = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/referral",
        {
          cache: "no-store",
        },
      );

      const result =
        (await response.json()) as ReferralResponse;

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/referral";
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to load referral information.",
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load referral information.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  async function copyLink() {
    if (!data?.link) return;

    try {
      await navigator.clipboard.writeText(
        data.link,
      );
      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        2000,
      );
    } catch {
      setError(
        "Unable to copy the referral link.",
      );
    }
  }

  if (loading) {
    return (
      <main className="page-shell">
        <div className="loading-state">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <section className="error-state">
          <h1>Referral Program</h1>
          <p>{error}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void loadReferral()}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (data?.enabled === false) {
    return (
      <main className="page-shell">
        <section className="empty-state">
          <h1>Referral Program</h1>
          <p>
            The referral program is currently
            unavailable.
          </p>
        </section>
      </main>
    );
  }

  const summary = data?.summary;

  return (
    <main className="page-shell">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">REFERRAL</span>
          <h1>Invite & Earn</h1>
          <p>
            Share your referral link and track eligible
            referral activity from your account.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => void loadReferral()}
        >
          Refresh
        </button>
      </div>

      <section className="dashboard-card referral-hero">
        <div>
          <span className="stat-label">
            Your referral code
          </span>
          <strong className="referral-code">
            {data?.code || "—"}
          </strong>
        </div>

        <div className="referral-link-box">
          <span>{data?.link || "—"}</span>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void copyLink()}
            disabled={!data?.link}
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">
            Total referrals
          </span>
          <strong className="stat-value">
            {summary?.total ?? 0}
          </strong>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            Completed
          </span>
          <strong className="stat-value">
            {summary?.completed ?? 0}
          </strong>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            Pending
          </span>
          <strong className="stat-value">
            {summary?.pending ?? 0}
          </strong>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            Rewards
          </span>
          <strong className="stat-value">
            {formatReward(
              summary?.rewards ?? 0,
              summary?.currency ?? "INR",
            )}
          </strong>
        </article>
      </section>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h2>Referral history</h2>
            <p>
              Your referral activity is shown below.
            </p>
          </div>
        </div>

        {!data?.referrals?.length ? (
          <div className="empty-state">
            <h3>No referrals yet</h3>
            <p>
              Share your referral link to get started.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Status</th>
                  <th>Reward</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {data.referrals.map((referral) => (
                  <tr key={referral.id}>
                    <td>{referral.code}</td>
                    <td>
                      <span
                        className={`status-badge status-${referral.status}`}
                      >
                        {referral.status}
                      </span>
                    </td>
                    <td>
                      {formatReward(
                        referral.rewardAmount,
                        referral.rewardCurrency,
                      )}
                    </td>
                    <td>
                      {formatDate(
                        referral.createdAt,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="dashboard-card">
        <h2>Referral information</h2>
        <ul className="security-list">
          <li>
            Rewards are subject to the referral program
            rules and eligibility requirements.
          </li>
          <li>
            Self-referrals are not permitted.
          </li>
          <li>
            Referral rewards are not guaranteed until the
            qualifying event is verified.
          </li>
          <li>
            Do not use spam, misleading claims, or
            unauthorized advertising.
          </li>
        </ul>
      </section>
    </main>
  );
}
