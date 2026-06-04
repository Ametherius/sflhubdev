import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** One browser client per tab — avoids auth storage lock contention between instances. */
export function createClient() {
  const options = {
    auth: {
      /** Avoid navigator.locks steal/abort when many hooks call getUser() at once. */
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  };

  if (typeof window !== "undefined") {
    if (!globalThis.__sflSupabaseBrowserClient) {
      globalThis.__sflSupabaseBrowserClient = createBrowserClient(
        supabaseUrl,
        supabaseKey,
        options,
      );
    }
    return globalThis.__sflSupabaseBrowserClient;
  }

  return createBrowserClient(supabaseUrl, supabaseKey, options);
}
