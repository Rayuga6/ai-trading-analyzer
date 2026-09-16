"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "login",
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Login failed.");
        return;
      }

      setMessage("Login successful. Redirecting...");

      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          borderRadius: "20px",
          border: "1px solid rgba(128,128,128,0.25)",
          background: "var(--background)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            Welcome Back
          </h1>

          <p style={{ opacity: 0.7 }}>
            Login to your AI Trading Analyzer account
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border: "1px solid rgba(128,128,128,0.4)",
              background: "transparent",
              color: "inherit",
              outline: "none",
            }}
          />

          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "12px",
              borderRadius: "10px",
              border: "1px solid rgba(128,128,128,0.4)",
              background: "transparent",
              color: "inherit",
              outline: "none",
            }}
          />

          {error && (
            <div
              style={{
                padding: "12px",
                margin: "12px 0",
                borderRadius: "10px",
                background: "rgba(255,0,0,0.1)",
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
                margin: "12px 0",
                borderRadius: "10px",
                background: "rgba(0,180,100,0.1)",
                color: "#00b86b",
                fontSize: "14px",
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "10px",
              border: "none",
              borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: 700,
              background: loading ? "#777" : "#2563eb",
              color: "white",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            marginTop: "22px",
            fontSize: "14px",
          }}
        >
          <span style={{ opacity: 0.7 }}>
            Don't have an account?{" "}
          </span>

          <button
            type="button"
            onClick={() => router.push("/signup")}
            style={{
              border: "none",
              background: "transparent",
              color: "#2563eb",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Sign up
          </button>
        </div>
      </div>
    </main>
  );
}