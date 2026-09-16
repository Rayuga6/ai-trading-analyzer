"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  default_market: string;
  default_symbol: string;
  default_timeframe: string;
  trading_style: string;
  risk_level: string;
  language: string;
  notifications_enabled: boolean;
};

const defaultSettings: Settings = {
  default_market: "Crypto",
  default_symbol: "BTCUSDT",
  default_timeframe: "15m",
  trading_style: "Intraday",
  risk_level: "Medium",
  language: "English",
  notifications_enabled: true,
};

export default function SettingsPage() {
  const router = useRouter();

  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/settings", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !result.success) {
        setError(
          result.message || "Unable to load settings."
        );
        return;
      }

      setSettings({
        ...defaultSettings,
        ...result.settings,
      });
    } catch {
      setError("Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  function updateSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setMessage("");
    setError("");
  }

  async function handleSave(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !result.success) {
        setError(
          result.message || "Unable to save settings."
        );
        return;
      }

      setSettings({
        ...defaultSettings,
        ...result.settings,
      });

      setMessage("Trader preferences saved successfully.");
    } catch {
      setError("Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Loading Settings...</h2>
          <p style={{ opacity: 0.7 }}>
            Please wait
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              border: "none",
              background: "transparent",
              color: "#2563eb",
              cursor: "pointer",
              fontWeight: 600,
              padding: 0,
              marginBottom: "18px",
            }}
          >
            ← Back to Dashboard
          </button>

          <h1
            style={{
              fontSize: "34px",
              fontWeight: 800,
              margin: 0,
            }}
          >
            Trader Settings
          </h1>

          <p
            style={{
              opacity: 0.7,
              marginTop: "8px",
            }}
          >
            Customize your trading preferences.
          </p>
        </div>

        <section
          style={{
            padding: "28px",
            borderRadius: "20px",
            border:
              "1px solid rgba(128,128,128,0.25)",
            boxShadow:
              "0 15px 45px rgba(0,0,0,0.12)",
          }}
        >
          <form onSubmit={handleSave}>
            {/* Default Market */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="default-market"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Default Market
              </label>

              <select
                id="default-market"
                value={settings.default_market}
                onChange={(e) =>
                  updateSetting(
                    "default_market",
                    e.target.value
                  )
                }
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(128,128,128,0.4)",
                  background: "var(--background)",
                  color: "inherit",
                }}
              >
                <option value="Crypto">Crypto</option>
                <option value="Indian Market">
                  Indian Market
                </option>
                <option value="Forex">Forex</option>
                <option value="Global Stocks">
                  Global Stocks
                </option>
              </select>
            </div>

            {/* Default Symbol */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="default-symbol"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Default Symbol
              </label>

              <input
                id="default-symbol"
                type="text"
                value={settings.default_symbol}
                onChange={(e) =>
                  updateSetting(
                    "default_symbol",
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="BTCUSDT"
                disabled={saving}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(128,128,128,0.4)",
                  background: "transparent",
                  color: "inherit",
                }}
              />
            </div>

            {/* Timeframe */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="timeframe"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Default Timeframe
              </label>

              <select
                id="timeframe"
                value={settings.default_timeframe}
                onChange={(e) =>
                  updateSetting(
                    "default_timeframe",
                    e.target.value
                  )
                }
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(128,128,128,0.4)",
                  background: "var(--background)",
                  color: "inherit",
                }}
              >
                <option value="1m">1m</option>
                <option value="5m">5m</option>
                <option value="15m">15m</option>
                <option value="30m">30m</option>
                <option value="1h">1h</option>
                <option value="4h">4h</option>
                <option value="1d">1d</option>
              </select>
            </div>

            {/* Trading Style */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="trading-style"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Trading Style
              </label>

              <select
                id="trading-style"
                value={settings.trading_style}
                onChange={(e) =>
                  updateSetting(
                    "trading_style",
                    e.target.value
                  )
                }
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(128,128,128,0.4)",
                  background: "var(--background)",
                  color: "inherit",
                }}
              >
                <option value="Scalping">Scalping</option>
                <option value="Intraday">Intraday</option>
                <option value="Swing">Swing</option>
              </select>
            </div>

            {/* Risk */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="risk-level"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Risk Level
              </label>

              <select
                id="risk-level"
                value={settings.risk_level}
                onChange={(e) =>
                  updateSetting(
                    "risk_level",
                    e.target.value
                  )
                }
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(128,128,128,0.4)",
                  background: "var(--background)",
                  color: "inherit",
                }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Language */}
            <div style={{ marginBottom: "22px" }}>
              <label
                htmlFor="language"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                Language
              </label>

              <select
                id="language"
                value={settings.language}
                onChange={(e) =>
                  updateSetting(
                    "language",
                    e.target.value
                  )
                }
                disabled={saving}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "10px",
                  border:
                    "1px solid rgba(128,128,128,0.4)",
                  background: "var(--background)",
                  color: "inherit",
                }}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Gujarati">Gujarati</option>
              </select>
            </div>

            {/* Notifications */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "20px",
                padding: "16px",
                marginBottom: "22px",
                borderRadius: "12px",
                background:
                  "rgba(128,128,128,0.08)",
              }}
            >
              <div>
                <strong>
                  Notifications
                </strong>

                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "13px",
                    opacity: 0.65,
                  }}
                >
                  Enable trading-related notifications.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  settings.notifications_enabled
                }
                onChange={(e) =>
                  updateSetting(
                    "notifications_enabled",
                    e.target.checked
                  )
                }
                disabled={saving}
                style={{
                  width: "20px",
                  height: "20px",
                  cursor: saving
                    ? "not-allowed"
                    : "pointer",
                }}
              />
            </div>

            {/* Messages */}
            {error && (
              <div
                style={{
                  padding: "12px",
                  marginBottom: "16px",
                  borderRadius: "10px",
                  background:
                    "rgba(255,0,0,0.1)",
                  color: "#ff4d4d",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  padding: "12px",
                  marginBottom: "16px",
                  borderRadius: "10px",
                  background:
                    "rgba(0,180,100,0.1)",
                  color: "#00b86b",
                  fontSize: "14px",
                }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "10px",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                fontSize: "16px",
                fontWeight: 700,
                background: saving
                  ? "#777"
                  : "#2563eb",
                color: "white",
              }}
            >
              {saving
                ? "Saving..."
                : "Save Preferences"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}