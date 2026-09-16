import { createBrowserClient } from "@supabase/ssr";

let browserClient:
  ReturnType<typeof createBrowserClient> | undefined;

/**
 * Create/reuse the browser-side Supabase client.
 *
 * The publishable/anon key is safe to expose in browser code when
 * Supabase Row Level Security (RLS) is correctly configured.
 * Never put a service-role/secret key in this file or any NEXT_PUBLIC_* variable.
 */
export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  browserClient = createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );

  return browserClient;
}

/**
 * Clear the cached browser client.
 *
 * Normally this is not needed by application code, but it is useful
 * for tests or controlled client re-initialization.
 */
export function resetClient() {
  browserClient = undefined;
}
