import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** One browser client per tab so every hook shares the same cookie session. */
export function createClient() {
  if (typeof window !== "undefined") {
    if (!globalThis.__sflSupabaseBrowserClient) {
      globalThis.__sflSupabaseBrowserClient = createBrowserClient(
        supabaseUrl,
        supabaseKey,
      );
    }
    return globalThis.__sflSupabaseBrowserClient;
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
