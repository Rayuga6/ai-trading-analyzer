"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type HistoryItem = {
  id: string;
  market?: string | null;
  symbol?: string | null;
  timeframe?: string | null;
  signal?: string | null;
  confidence?: number | null;
  entry?: string | number | null;
  stop_loss?: string | number | null;
  tp1?: string | number | null;
  tp2?: string | number | null;
  tp3?: string | number | null;
  analysis?: unknown;
  created_at?: string;
};

function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedId = searchParams.get("id");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<HistoryItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] =
    useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/history?limit=200",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Unable to load analysis history."
        );
        return;
      }

      setHistory(result.history || []);
    } catch {
      setError(
        "Unable to load analysis history."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAnalysis(id: string) {
    setDetailLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/history?id=${encodeURIComponent(id)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !result.success) {
        setError(
          result.message ||
            "Unable to load analysis."
        );
        return;
      }

      setSelectedAnalysis(result.analysis);
    } catch {
      setError("Unable to load analysis.");
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadAnalysis(selectedId);
    } else {
      setSelectedAnalysis(null);
    }
  }, [selectedId]);

  function formatDate(
    date?: string | null
  ) {
    if (!date) return "Unknown";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown";
    }

    return parsed.toLocaleString();
  }

  function signalStyle(
    signal?: string | null
  ) {
    const value = signal?.toUpperCase();

    if (value === "BUY") {
      return {
        background: "rgba(0,180,100,0.12)",
        color: "#00a866",
      };
    }

    if (value === "SELL") {
      return {
        background: "rgba(255,60,60,0.12)",
        color: "#e53935",
      };
    }

    return {
      background: "rgba(180,150,0,0.12)",
      color: "#b08b00",
    };
  }

  function openAnalysis(id: string) {
    router.push(
      `/history?id=${encodeURIComponent(id)}`
    );
  }

  function closeAnalysis() {
    router.push("/history");
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Loading History...</h2>
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
        padding: "30px 20px 50px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <button
            type="button"
            onClick={() =>
              router.push("/dashboard")
            }
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
            Analysis History
          </h1>

          <p
            style={{
              opacity: 0.7,
              marginTop: "8px",
            }}
          >
            All your previous AI trading analyses.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom: "20px",
              borderRadius: "12px",
              background:
                "rgba(255,0,0,0.1)",
              color: "#ff4d4d",
            }}
          >
            {error}
          </div>
        )}

        {/* Detail */}
        {selectedId && (
          <section
            style={{
              padding: "24px",
              marginBottom: "24px",
              borderRadius: "18px",
              border:
                "1px solid rgba(128,128,128,0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                }}
              >
                Analysis Details
              </h2>

              <button
                type="button"
                onClick={closeAnalysis}
                style={{
                  border: "none",
                  background:
                    "rgba(128,128,128,0.1)",
                  color: "inherit",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <p>Loading analysis...</p>
            ) : selectedAnalysis ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <InfoBox
                    label="Symbol"
                    value={
                      selectedAnalysis.symbol ||
                      "Unknown"
                    }
                  />

                  <InfoBox
                    label="Market"
                    value={
                      selectedAnalysis.market ||
                      "Unknown"
                    }
                  />

                  <InfoBox
                    label="Timeframe"
                    value={
                      selectedAnalysis.timeframe ||
                      "Unknown"
                    }
                  />

                  <InfoBox
                    label="Signal"
                    value={
                      selectedAnalysis.signal ||
                      "WAIT"
                    }
                  />

                  <InfoBox
                    label="Confidence"
                    value={
                      selectedAnalysis.confidence !==
                      null &&
                      selectedAnalysis.confidence !==
                        undefined
                        ? `${selectedAnalysis.confidence}%`
                        : "N/A"
                    }
                  />

                  <InfoBox
                    label="Date"
                    value={formatDate(
                      selectedAnalysis.created_at
                    )}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "12px",
                    marginBottom: "20px",
                  }}
                >
                  <InfoBox
                    label="Entry"
                    value={
                      selectedAnalysis.entry ??
                      "N/A"
                    }
                  />

                  <InfoBox
                    label="Stop Loss"
                    value={
                      selectedAnalysis.stop_loss ??
                      "N/A"
                    }
                  />

                  <InfoBox
                    label="TP1"
                    value={
                      selectedAnalysis.tp1 ??
                      "N/A"
                    }
                  />

                  <InfoBox
                    label="TP2"
                    value={
                      selectedAnalysis.tp2 ??
                      "N/A"
                    }
                  />

                  <InfoBox
                    label="TP3"
                    value={
                      selectedAnalysis.tp3 ??
                      "N/A"
                    }
                  />
                </div>

                {selectedAnalysis.analysis !==
                  null &&
                  selectedAnalysis.analysis !==
                    undefined && (
                    <div
                      style={{
                        padding: "18px",
                        borderRadius: "12px",
                        background:
                          "rgba(128,128,128,0.07)",
                      }}
                    >
                      <h3
                        style={{
                          marginTop: 0,
                        }}
                      >
                        Saved Analysis
                      </h3>

                      <pre
                        style={{
                          whiteSpace:
                            "pre-wrap",
                          wordBreak:
                            "break-word",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          margin: 0,
                        }}
                      >
                        {typeof selectedAnalysis.analysis ===
                        "string"
                          ? selectedAnalysis.analysis
                          : JSON.stringify(
                              selectedAnalysis.analysis,
                              null,
                              2
                            )}
                      </pre>
                    </div>
                  )}
              </>
            ) : (
              <p>
                This analysis could not be found.
              </p>
            )}
          </section>
        )}

        {/* History list */}
        <section
          style={{
            padding: "24px",
            borderRadius: "18px",
            border:
              "1px solid rgba(128,128,128,0.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "18px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
              }}
            >
              Previous Analyses
            </h2>

            <span
              style={{
                fontSize: "13px",
                opacity: 0.6,
              }}
            >
              {history.length} saved
            </span>
          </div>

          {history.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                opacity: 0.7,
              }}
            >
              <h3>No analysis history yet</h3>

              <p>
                Your completed analyses will appear
                here.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                style={{
                  marginTop: "10px",
                  padding: "12px 18px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Start Analysis
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {history.map((item) => {
                const style = signalStyle(
                  item.signal
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      openAnalysis(item.id)
                    }
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "17px",
                      borderRadius: "12px",
                      border:
                        "1px solid rgba(128,128,128,0.2)",
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        alignItems: "center",
                        gap: "15px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "17px",
                            fontWeight: 700,
                          }}
                        >
                          {item.symbol ||
                            "Unknown Symbol"}
                        </div>

                        <div
                          style={{
                            marginTop: "5px",
                            fontSize: "13px",
                            opacity: 0.65,
                          }}
                        >
                          {item.market ||
                            "Market"}{" "}
                          •{" "}
                          {item.timeframe ||
                            "Timeframe"}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <span
                          style={{
                            padding: "6px 10px",
                            borderRadius: "8px",
                            background:
                              style.background,
                            color: style.color,
                            fontWeight: 800,
                            fontSize: "12px",
                          }}
                        >
                          {item.signal ||
                            "WAIT"}
                        </span>

                        {item.confidence !==
                          null &&
                          item.confidence !==
                            undefined && (
                            <span
                              style={{
                                fontSize:
                                  "13px",
                                opacity: 0.65,
                              }}
                            >
                              {item.confidence}%
                            </span>
                          )}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "10px",
                        fontSize: "12px",
                        opacity: 0.5,
                      }}
                    >
                      {formatDate(
                        item.created_at
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "12px",
        background:
          "rgba(128,128,128,0.07)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          opacity: 0.6,
          marginBottom: "5px",
        }}
      >
        {label}
      </div>

      <strong>{String(value)}</strong>
    </div>
  );
}
export default function HistoryPage() {
  return (
    <Suspense fallback={<div>Loading History...</div>}>
      <HistoryPageContent />
    </Suspense>
  );
}