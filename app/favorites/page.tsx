"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Favorite = {
  id: string;
  market: string;
  symbol: string;
  created_at?: string;
};

const marketOptions = [
  "Crypto",
  "Indian Market",
  "Forex",
  "Global Stocks",
];

const symbolOptions: Record<string, string[]> = {
  Crypto: [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "SOLUSDT",
    "XRPUSDT",
  ],

  "Indian Market": [
    "NIFTY",
    "BANKNIFTY",
    "SENSEX",
  ],

  Forex: [
    "EURUSD",
    "GBPUSD",
    "USDJPY",
    "AUDUSD",
    "USDCAD",
  ],

  "Global Stocks": [
    "AAPL",
    "MSFT",
    "NVDA",
    "AMZN",
    "GOOGL",
    "TSLA",
  ],
};

export default function FavoritesPage() {
  const router = useRouter();

  const [favorites, setFavorites] = useState<
    Favorite[]
  >([]);

  const [market, setMarket] =
    useState("Crypto");

  const [symbol, setSymbol] =
    useState("BTCUSDT");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function loadFavorites() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/favorites",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result =
        await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        setError(
          result.message ||
            "Unable to load favorites."
        );
        return;
      }

      setFavorites(
        result.favorites || []
      );
    } catch {
      setError(
        "Unable to load favorites."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFavorites();
  }, []);

  function handleMarketChange(
    value: string
  ) {
    setMarket(value);

    const firstSymbol =
      symbolOptions[value]?.[0] || "";

    setSymbol(firstSymbol);
  }

  async function addFavorite() {
    setMessage("");
    setError("");

    if (!market || !symbol) {
      setError(
        "Please select a market and symbol."
      );
      return;
    }

    const alreadyExists =
      favorites.some(
        (item) =>
          item.market === market &&
          item.symbol ===
            symbol.toUpperCase()
      );

    if (alreadyExists) {
      setError(
        "This market is already in favorites."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/favorites",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            market,
            symbol,
          }),
        }
      );

      const result =
        await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        setError(
          result.message ||
            "Unable to add favorite."
        );
        return;
      }

      setMessage(
        "Market added to favorites."
      );

      await loadFavorites();
    } catch {
      setError(
        "Unable to add favorite."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeFavorite(
    favorite: Favorite
  ) {
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await fetch(
        `/api/favorites?market=${encodeURIComponent(
          favorite.market
        )}&symbol=${encodeURIComponent(
          favorite.symbol
        )}`,
        {
          method: "DELETE",
        }
      );

      const result =
        await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (
        !response.ok ||
        !result.success
      ) {
        setError(
          result.message ||
            "Unable to remove favorite."
        );
        return;
      }

      setMessage(
        "Market removed from favorites."
      );

      setFavorites((current) =>
        current.filter(
          (item) =>
            item.id !== favorite.id
        )
      );
    } catch {
      setError(
        "Unable to remove favorite."
      );
    } finally {
      setSaving(false);
    }
  }

  function analyzeFavorite(
    favorite: Favorite
  ) {
    const params =
      new URLSearchParams();

    params.set(
      "market",
      favorite.market
    );

    params.set(
      "symbol",
      favorite.symbol
    );

    router.push(
      `/?${params.toString()}`
    );
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
        <div
          style={{
            textAlign: "center",
          }}
        >
          <h2>
            Loading Favorites...
          </h2>

          <p
            style={{
              opacity: 0.7,
            }}
          >
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
        padding:
          "30px 20px 50px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* Header */}

        <button
          type="button"
          onClick={() =>
            router.push(
              "/dashboard"
            )
          }
          style={{
            border: "none",
            background:
              "transparent",
            color: "#2563eb",
            cursor: "pointer",
            fontWeight: 600,
            padding: 0,
            marginBottom:
              "18px",
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
          ⭐ Favorite Markets
        </h1>

        <p
          style={{
            opacity: 0.7,
            marginTop: "8px",
            marginBottom:
              "28px",
          }}
        >
          Save the markets you
          watch frequently.
        </p>

        {/* Messages */}

        {error && (
          <div
            style={{
              padding: "14px",
              marginBottom:
                "15px",
              borderRadius:
                "12px",
              background:
                "rgba(255,0,0,0.1)",
              color:
                "#ff4d4d",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              padding: "14px",
              marginBottom:
                "15px",
              borderRadius:
                "12px",
              background:
                "rgba(0,180,100,0.1)",
              color:
                "#00a866",
            }}
          >
            {message}
          </div>
        )}

        {/* Add Favorite */}

        <section
          style={{
            padding: "22px",
            borderRadius:
              "18px",
            border:
              "1px solid rgba(128,128,128,0.22)",
            marginBottom:
              "24px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "20px",
            }}
          >
            Add Favorite
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label
                style={{
                  display:
                    "block",
                  fontSize:
                    "13px",
                  opacity: 0.7,
                  marginBottom:
                    "6px",
                }}
              >
                Market
              </label>

              <select
                value={market}
                onChange={(event) =>
                  handleMarketChange(
                    event.target
                      .value
                  )
                }
                style={{
                  width: "100%",
                  padding:
                    "12px",
                  borderRadius:
                    "10px",
                  border:
                    "1px solid rgba(128,128,128,0.3)",
                  background:
                    "transparent",
                  color:
                    "inherit",
                }}
              >
                {marketOptions.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                style={{
                  display:
                    "block",
                  fontSize:
                    "13px",
                  opacity: 0.7,
                  marginBottom:
                    "6px",
                }}
              >
                Symbol
              </label>

              <select
                value={symbol}
                onChange={(event) =>
                  setSymbol(
                    event.target
                      .value
                  )
                }
                style={{
                  width: "100%",
                  padding:
                    "12px",
                  borderRadius:
                    "10px",
                  border:
                    "1px solid rgba(128,128,128,0.3)",
                  background:
                    "transparent",
                  color:
                    "inherit",
                }}
              >
                {(
                  symbolOptions[
                    market
                  ] || []
                ).map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={
              addFavorite
            }
            disabled={saving}
            style={{
              marginTop:
                "15px",
              padding:
                "12px 20px",
              border: "none",
              borderRadius:
                "10px",
              background:
                "#2563eb",
              color: "white",
              cursor: saving
                ? "not-allowed"
                : "pointer",
              fontWeight: 700,
              opacity: saving
                ? 0.6
                : 1,
            }}
          >
            {saving
              ? "Saving..."
              : "⭐ Add Favorite"}
          </button>
        </section>

        {/* Favorites List */}

        <section
          style={{
            padding: "22px",
            borderRadius:
              "18px",
            border:
              "1px solid rgba(128,128,128,0.22)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "18px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
              }}
            >
              Your Favorites
            </h2>

            <span
              style={{
                fontSize:
                  "13px",
                opacity: 0.6,
              }}
            >
              {favorites.length} saved
            </span>
          </div>

          {favorites.length ===
          0 ? (
            <div
              style={{
                textAlign:
                  "center",
                padding:
                  "40px 20px",
                opacity: 0.7,
              }}
            >
              <h3>
                No favorites yet
              </h3>

              <p>
                Add a market
                above to start
                your watchlist.
              </p>
            </div>
          ) : (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: "10px",
              }}
            >
              {favorites.map(
                (favorite) => (
                  <div
                    key={
                      favorite.id
                    }
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: "15px",
                      flexWrap:
                        "wrap",
                      padding:
                        "16px",
                      borderRadius:
                        "12px",
                      border:
                        "1px solid rgba(128,128,128,0.18)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize:
                            "17px",
                          fontWeight:
                            700,
                        }}
                      >
                        ⭐{" "}
                        {
                          favorite.symbol
                        }
                      </div>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          fontSize:
                            "13px",
                          opacity:
                            0.65,
                        }}
                      >
                        {
                          favorite.market
                        }
                      </div>
                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        gap:
                          "8px",
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          analyzeFavorite(
                            favorite
                          )
                        }
                        style={{
                          padding:
                            "9px 14px",
                          border:
                            "none",
                          borderRadius:
                            "9px",
                          background:
                            "#2563eb",
                          color:
                            "white",
                          cursor:
                            "pointer",
                          fontWeight:
                            700,
                        }}
                      >
                        Analyze
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          removeFavorite(
                            favorite
                          )
                        }
                        disabled={
                          saving
                        }
                        style={{
                          padding:
                            "9px 14px",
                          border:
                            "1px solid rgba(255,70,70,0.4)",
                          borderRadius:
                            "9px",
                          background:
                            "transparent",
                          color:
                            "#e53935",
                          cursor:
                            saving
                              ? "not-allowed"
                              : "pointer",
                          fontWeight:
                            700,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}