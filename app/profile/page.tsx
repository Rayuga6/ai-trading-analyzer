"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadProfile() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !result.success) {
        setError(result.message || "Unable to load profile.");
        return;
      }

      const data = result.profile as Profile;

      setProfile(data);
      setName(data.name || "");
      setEmail(data.email || "");
    } catch {
      setError("Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Name is required.");
      return;
    }

    if (cleanName.length > 100) {
      setError("Name is too long.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
        }),
      });

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok || !result.success) {
        setError(result.message || "Unable to update profile.");
        return;
      }

      setProfile(result.profile);
      setName(result.profile?.name || cleanName);
      setMessage("Profile updated successfully.");
    } catch {
      setError("Unable to update profile.");
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
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Loading Profile...</h2>
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
          maxWidth: "700px",
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
            My Profile
          </h1>

          <p
            style={{
              opacity: 0.7,
              marginTop: "8px",
            }}
          >
            Manage your account information.
          </p>
        </div>

        {/* Profile Card */}
        <section
          style={{
            padding: "28px",
            borderRadius: "20px",
            border:
              "1px solid rgba(128,128,128,0.25)",
            background: "var(--background)",
            boxShadow:
              "0 15px 45px rgba(0,0,0,0.12)",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#2563eb",
                color: "white",
                fontSize: "28px",
                fontWeight: 800,
              }}
            >
              {(name || email || "U")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "22px",
                }}
              >
                {name || "User"}
              </h2>

              <p
                style={{
                  margin: "5px 0 0",
                  opacity: 0.7,
                }}
              >
                {email}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {/* Name */}
            <label
              htmlFor="profile-name"
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Name
            </label>

            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter your name"
              autoComplete="name"
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
                outline: "none",
                marginBottom: "20px",
              }}
            />

            {/* Email */}
            <label
              htmlFor="profile-email"
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              Email
            </label>

            <input
              id="profile-email"
              type="email"
              value={email}
              disabled
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "10px",
                border:
                  "1px solid rgba(128,128,128,0.25)",
                background:
                  "rgba(128,128,128,0.08)",
                color: "inherit",
                opacity: 0.7,
                outline: "none",
                marginBottom: "8px",
              }}
            />

            <p
              style={{
                fontSize: "13px",
                opacity: 0.6,
                marginTop: 0,
                marginBottom: "22px",
              }}
            >
              Email is managed by your authentication
              account.
            </p>

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
                : "Save Profile"}
            </button>
          </form>
        </section>

        {/* Account Information */}
        <section
          style={{
            marginTop: "20px",
            padding: "22px",
            borderRadius: "16px",
            border:
              "1px solid rgba(128,128,128,0.2)",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Account Information
          </h3>

          <p
            style={{
              margin: "8px 0",
              fontSize: "14px",
              opacity: 0.7,
            }}
          >
            User ID: {profile?.id || "Not available"}
          </p>
        </section>
      </div>
    </main>
  );
}