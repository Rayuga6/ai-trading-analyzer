import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client.
 *
 * Roadmap:
 * 57 Secure API Architecture
 * 61 Authentication Security
 * 63 Error Handling
 *
 * This file must remain server-side.
 * Never use a service-role key in a browser/client component.
 */

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(name, value, {
                  ...options,
                  httpOnly: true,
                  sameSite: "lax",
                  secure: process.env.NODE_ENV === "production",
                  path: "/",
                });
              }
            );
          } catch {
            // Server Components may not be allowed to mutate cookies.
            // Middleware handles session refresh when required.
          }
        },
      },
    }
  );
}

/**
 * Get the currently authenticated user using Supabase's server-side
 * authentication check.
 */
export async function getServerUser() {
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
 * Require an authenticated server user.
 */
export async function requireServerUser() {
  const user = await getServerUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

/**
 * Get the server-side session.
 *
 * Authorization decisions should prefer getServerUser()/getUser().
 */
export async function getServerSession() {
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
