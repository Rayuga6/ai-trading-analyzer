"use client";

import { useState } from "react";

type CouponResult = {
  valid: boolean;
  code: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  finalAmount?: number;
  reason?: string;
};

type CouponResponse = {
  success?: boolean;
  result?: CouponResult;
  error?: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function CouponsPage() {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] =
    useState<CouponResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState("");

  async function validateCoupon() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/coupon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "validate",
            code,
            amount: Number(amount),
          }),
        },
      );

      const data =
        (await response.json()) as CouponResponse;

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/coupons";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to validate coupon.",
        );
      }

      setResult(data.result ?? null);

      if (
        data.result &&
        !data.result.valid &&
        data.result.reason
      ) {
        setError(data.result.reason);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to validate coupon.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function redeemCoupon() {
    setRedeeming(true);
    setError("");

    try {
      const response = await fetch(
        "/api/coupon",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "redeem",
            code,
            amount: Number(amount),
          }),
        },
      );

      const data =
        (await response.json()) as CouponResponse;

      if (response.status === 401) {
        window.location.href =
          "/login?redirect=/coupons";
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to redeem coupon.",
        );
      }

      setResult(data.result ?? null);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to redeem coupon.",
      );
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="dashboard-header">
        <div>
          <span className="eyebrow">PROMOTIONS</span>
          <h1>Coupons</h1>
          <p>
            Apply an eligible coupon to see your
            discount before checkout.
          </p>
        </div>
      </div>

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <h2>Apply coupon</h2>

          <div className="contact-form">
            <label>
              Coupon code
              <input
                type="text"
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value
                      .toUpperCase()
                      .slice(0, 32),
                  )
                }
                maxLength={32}
                autoComplete="off"
                placeholder="ENTER CODE"
              />
            </label>

            <label>
              Amount (₹)
              <input
                type="number"
                value={amount}
                onChange={(event) =>
                  setAmount(
                    event.target.value,
                  )
                }
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="2499"
              />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  void validateCoupon()
                }
                disabled={
                  loading ||
                  redeeming ||
                  !code ||
                  !amount
                }
              >
                {loading
                  ? "Checking..."
                  : "Validate"}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  void redeemCoupon()
                }
                disabled={
                  loading ||
                  redeeming ||
                  !code ||
                  !amount ||
                  result?.valid !== true
                }
              >
                {redeeming
                  ? "Redeeming..."
                  : "Redeem"}
              </button>
            </div>

            {error ? (
              <div
                className="form-status error"
                role="alert"
              >
                {error}
              </div>
            ) : null}
          </div>
        </article>

        <article className="dashboard-card">
          <h2>Coupon result</h2>

          {!result ? (
            <div className="empty-state">
              <h3>No coupon checked</h3>
              <p>
                Enter a coupon code and amount to
                validate it.
              </p>
            </div>
          ) : (
            <div className="coupon-result">
              <div className="result-row">
                <span>Code</span>
                <strong>{result.code}</strong>
              </div>

              <div className="result-row">
                <span>Status</span>
                <span
                  className={`status-badge ${
                    result.valid
                      ? "status-active"
                      : "status-disabled"
                  }`}
                >
                  {result.valid
                    ? "Valid"
                    : "Invalid"}
                </span>
              </div>

              {result.valid ? (
                <>
                  <div className="result-row">
                    <span>Discount</span>
                    <strong>
                      {result.discountType ===
                      "percentage"
                        ? `${result.discountValue ?? 0}%`
                        : formatCurrency(
                            result.discountValue ??
                              0,
                          )}
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>Discount amount</span>
                    <strong>
                      {formatCurrency(
                        result.discountAmount ??
                          0,
                      )}
                    </strong>
                  </div>

                  <div className="result-row">
                    <span>Final amount</span>
                    <strong>
                      {formatCurrency(
                       (result.finalAmount ?? Number(amount)) || 0
                      )}
                    </strong>
                  </div>
                </>
              ) : (
                <p className="muted-text">
                  {result.reason ||
                    "This coupon cannot be applied."}
                </p>
              )}
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-card">
        <h2>Coupon information</h2>
        <ul className="security-list">
          <li>
            Coupons are subject to their individual
            validity and redemption rules.
          </li>
          <li>
            A valid coupon does not guarantee that a
            payment will succeed.
          </li>
          <li>
            Do not share account passwords or payment
            credentials while requesting coupon support.
          </li>
        </ul>
      </section>
    </main>
  );
}
