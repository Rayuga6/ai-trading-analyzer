import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

function safeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 320);
}

function isValidEmail(email: string) {
  return email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (password.length > 128) throw new Error("Password is too long.");
}

export async function signUp(email: unknown, password: unknown, name?: unknown) {
  const normalizedEmail = safeEmail(email);
  const normalizedPassword = String(password ?? "");
  if (!isValidEmail(normalizedEmail)) throw new Error("Please enter a valid email address.");
  validatePassword(normalizedPassword);

  const supabase = await createClient();
  const trimmedName = String(name ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 100);

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: normalizedPassword,
    options: trimmedName ? { data: { name: trimmedName } } : undefined,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function login(email: unknown, password: unknown) {
  const normalizedEmail = safeEmail(email);
  const normalizedPassword = String(password ?? "");
  if (!isValidEmail(normalizedEmail) || !normalizedPassword || normalizedPassword.length > 128) {
    throw new Error("Invalid email or password.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error || !data.user || !data.session) throw new Error("Invalid email or password.");
  return data;
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Unable to sign out. Please try again.");
  return true;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : data.user;
}

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getSession();
  return error || !data.session ? null : data.session;
}

export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required.");
  return user;
}

export async function requireCurrentSession(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session) throw new Error("Authentication required.");
  return session;
}

export function getSafeUserInfo(user: User | null) {
  return user ? { id: user.id, email: user.email ?? null } : null;
}
