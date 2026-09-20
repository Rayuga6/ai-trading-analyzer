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

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim()) return setError("Name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!password) return setError("Password is required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup", name: name.trim(), email: email.trim(), password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.message || "Signup failed.");
        return;
      }
      setMessage(result.message || "Account created successfully.");
      if (!result.session) {
        setTimeout(() => router.replace("/login"), 1500);
      } else {
        setTimeout(() => { router.replace("/dashboard"); router.refresh(); }, 500);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
        <h1 className="text-center text-3xl font-bold">Create Account</h1>
        <p className="mt-2 text-center text-sm text-slate-400">Create your AITrade Analyzer account</p>
        <form onSubmit={handleSignup} className="mt-8 space-y-4">
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} autoComplete="name" />
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} autoComplete="email" />
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoComplete="new-password" />
          <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} autoComplete="new-password" />
          {error && <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
          {message && <p className="rounded-lg bg-green-400/10 p-3 text-sm text-green-300">{message}</p>}
          <button className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">Already have an account? <button type="button" className="font-semibold text-cyan-300" onClick={() => router.push("/login")}>Login</button></p>
      </div>
    </main>
  );
}
