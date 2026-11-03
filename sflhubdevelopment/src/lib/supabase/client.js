import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** One browser client per tab so every hook shares the same cookie session. */
export function createClient() {
  if (typeof window !== "undefined") {
    if (!globalThis.__sflSupabaseBrowserClient) {
      const client = createBrowserClient(supabaseUrl, supabaseKey);
      // The library turns auto-refresh back on after our options. Middleware
      // is the only place that should replace the login cookie.
      client.auth.autoRefreshToken = false;
      globalThis.__sflSupabaseBrowserClient = client;
    }
    return globalThis.__sflSupabaseBrowserClient;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
