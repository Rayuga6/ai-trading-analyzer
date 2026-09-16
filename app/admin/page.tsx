"use client";

import { useCallback, useEffect, useState } from "react";

type AdminStats = {
  users: number;
  activeSubscriptions: number;
  analyses: number;
  revenue: number;
};

type AdminUser = {
  id: string;
  email: string | null;
  role: "admin" | "super_admin";
  isActive: boolean;
};

type AdminResponse = {
  success?: boolean;
  admin?: AdminUser;
  stats?: AdminStats;
  error?: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminPage() {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin?action=stats",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data =
        (await response.json()) as AdminResponse;

      if (response.status === 401) {
        window.location.href = "/login?redirect=/admin";
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to load admin dashboard.",
        );
      }

      setAdmin(data.admin ?? null);
      setStats(data.stats ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load admin dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdmin();
  }, [loadAdmin]);

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
          <h1>Admin Dashboard</h1>
          <p>{error}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void loadAdmin()}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">ADMIN</span>
          <h1>Admin Dashboard</h1>
          <p>
            Monitor platform activity and administrative
            metrics.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={() => void loadAdmin()}
        >
          Refresh
        </button>
      </div>

      <section className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h2>Administrator</h2>
            <p>
              {admin?.email || "Authenticated administrator"}
            </p>
          </div>

          <span className="status-badge status-active">
            {admin?.role === "super_admin"
              ? "Super Admin"
              : "Admin"}
          </span>
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Users</span>
          <strong className="stat-value">
            {formatNumber(stats?.users ?? 0)}
          </strong>
          <span className="stat-meta">
            Registered profiles
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            Active subscriptions
          </span>
          <strong className="stat-value">
            {formatNumber(
              stats?.activeSubscriptions ?? 0,
            )}
          </strong>
          <span className="stat-meta">
            Active or trialing
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-label">
            Total analyses
          </span>
          <strong className="stat-value">
            {formatNumber(stats?.analyses ?? 0)}
          </strong>
          <span className="stat-meta">
            Analysis history records
          </span>
        </article>

        <article className="stat-card">
          <span className="stat-label">Verified revenue</span>
          <strong className="stat-value">
            {formatCurrency(stats?.revenue ?? 0)}
          </strong>
          <span className="stat-meta">
            Payment ledger integration pending
          </span>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Admin tools</h2>
          <p>
            Additional customer, subscription, analytics,
            backup, and configuration controls will appear
            here as their modules are connected.
          </p>

          <div className="admin-tool-grid">
            <div className="admin-tool">
              <strong>User management</strong>
              <span>Coming with connected admin data.</span>
            </div>

            <div className="admin-tool">
              <strong>Subscription management</strong>
              <span>Connected through subscription APIs.</span>
            </div>

            <div className="admin-tool">
              <strong>Analytics</strong>
              <span>Platform analytics module pending.</span>
            </div>

            <div className="admin-tool">
              <strong>Backups</strong>
              <span>Backup controls will be added later.</span>
            </div>
          </div>
        </article>

        <article className="dashboard-card">
          <h2>Security</h2>
          <ul className="security-list">
            <li>Admin email allow-list is required.</li>
            <li>Admin API routes require authentication.</li>
            <li>Administrative actions are server-side.</li>
            <li>Secrets are not exposed to the browser.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
