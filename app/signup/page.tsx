"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
          action: "signup",
          name,
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Signup failed.");
        return;
      }

      setMessage(
        result.message ||
          "Account created successfully."
      );

      // Agar Supabase ne immediately session create ki hai,
      // dashboard par jayenge. Email verification required
      // hone par user ko login page par bhejenge.
      if (result.message?.toLowerCase().includes("verify")) {
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 800);
      }
    } catch {
      setError(
        "Something went wrong. Please try again."
      );
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
          maxWidth: "440px",
          padding: "32px",
          borderRadius: "20px",
          border:
            "1px solid rgba(128,128,128,0.25)",
          background: "var(--background)",
          boxShadow:
            "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            Create Account
          </h1>

          <p style={{ opacity: 0.7 }}>
            Create your AI Trading Analyzer account
          </p>
        </div>

        <form onSubmit={handleSignup}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: "8px",
            }}
          >
            Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Enter your name"
            autoComplete="name"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border:
                "1px solid rgba(128,128,128,0.4)",
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
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Enter your email"
            autoComplete="email"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border:
                "1px solid rgba(128,128,128,0.4)",
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
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Create a password"
            autoComplete="new-password"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "18px",
              borderRadius: "10px",
              border:
                "1px solid rgba(128,128,128,0.4)",
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
            Confirm Password
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="Confirm your password"
            autoComplete="new-password"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginBottom: "12px",
              borderRadius: "10px",
              border:
                "1px solid rgba(128,128,128,0.4)",
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
                margin: "12px 0",
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
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "10px",
              border: "none",
              borderRadius: "10px",
              cursor: loading
                ? "not-allowed"
                : "pointer",
              fontSize: "16px",
              fontWeight: 700,
              background: loading
                ? "#777"
                : "#2563eb",
              color: "white",
            }}
          >
            {loading
              ? "Creating Account..."
              : "Create Account"}
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
            Already have an account?{" "}
          </span>

          <button
            type="button"
            onClick={() => router.push("/login")}
            style={{
              border: "none",
              background: "transparent",
              color: "#2563eb",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Login
          </button>
        </div>
      </div>
    </main>
  );
}