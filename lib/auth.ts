import type { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Authentication helpers
 *
 * Roadmap:
 * 61 Authentication Security
 *
 * Server-side only.
 * Do not expose service-role credentials or Supabase secrets here.
 */

export type AuthResult<T> = {
  data: T | null;
  error: string | null;
};

function safeEmail(email: string) {
  return email.trim().toLowerCase().slice(0, 320);
}

function isValidEmail(email: string) {
  // Practical validation only. Supabase remains the source of truth.
  return (
    email.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  if (password.length > 128) {
    throw new Error("Password is too long.");
  }
}

/**
 * Sign up a new user.
 */
export async function signUp(
  email: string,
  password: string,
  name?: string
) {
  const normalizedEmail = safeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  validatePassword(password);

  const supabase = await createClient();

  const trimmedName = String(name ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 100);

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: trimmedName
        ? {
            name: trimmedName,
          }
        : undefined,
    },
  });

  if (error) {
    // Return Supabase's normal user-facing auth error, but never expose
    // provider credentials or server internals.
    throw new Error(error.message);
  }

  return data;
}

/**
 * Login with email/password.
 */
export async function login(
  email: string,
  password: string
) {
  const normalizedEmail = safeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!password || password.length > 128) {
    throw new Error("Invalid email or password.");
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

  if (error) {
    // Avoid revealing whether an account exists.
    throw new Error("Invalid email or password.");
  }

  return data;
}

/**
 * Logout the current authenticated session.
 */
export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Unable to sign out. Please try again.");
  }

  return true;
}

/**
 * Get the currently authenticated user.
 *
 * Supabase's server-side getUser() validates the user with the Auth server.
 * This is preferred for authorization decisions over trusting client state.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get the current session.
 *
 * Use getCurrentUser() for authorization/security decisions.
 * Session data is useful when the application specifically needs the
 * access-token/session metadata.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = await createClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Send a password-reset email.
 *
 * The redirect URL must be configured in Supabase Auth URL settings.
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo?: string
) {
  const normalizedEmail = safeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    throw new Error("Please enter a valid email address.");
  }

  const supabase = await createClient();

  const options: {
    redirectTo?: string;
  } = {};

  if (redirectTo) {
    try {
      const url = new URL(redirectTo);

      // Only allow HTTPS in production and prevent javascript/data URLs.
      if (
        url.protocol !== "https:" &&
        process.env.NODE_ENV === "production"
      ) {
        throw new Error("Invalid password reset URL.");
      }

      options.redirectTo = url.toString();
    } catch {
      throw new Error("Invalid password reset URL.");
    }
  }

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      options
    );

  if (error) {
    throw new Error(
      "Unable to send password reset email. Please try again."
    );
  }

  return true;
}

/**
 * Update the authenticated user's password.
 *
 * This should only be called after Supabase has established an authenticated
 * recovery/session context.
 */
export async function updatePassword(
  password: string
) {
  validatePassword(password);

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) {
    throw new Error(
      "Unable to update password. Please try again."
    );
  }

  return data;
}

/**
 * Require an authenticated user in server code.
 *
 * Use this helper for protected operations where returning null would make it
 * too easy to accidentally continue execution as an anonymous user.
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

/**
 * Require an authenticated session.
 */
export async function requireCurrentSession(): Promise<Session> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Authentication required.");
  }

  return session;
}

/**
 * Returns a minimal user object safe for application-level use.
 * Do not pass the complete auth object to logs or client responses.
 */
export function getSafeUserInfo(user: User | null) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
  };
}
