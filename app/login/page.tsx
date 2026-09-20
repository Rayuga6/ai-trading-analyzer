"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.message || "Login failed.");
        return;
      }
      setMessage("Login successful. Redirecting...");
      router.replace(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <h1 className="text-center text-3xl font-bold">Welcome Back</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Login to AITrade Analyzer</p>
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoComplete="email" />
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="current-password" />
          {error && <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded-lg bg-green-400/10 p-3 text-sm text-green-300">{message}</p>}
          <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50" type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">Don’t have an account? <button type="button" className="font-semibold text-cyan-300" onClick={() => router.push("/signup")}>Sign up</button></p>
      </div>
    </main>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center px-6 py-10">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}
