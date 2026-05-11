"use client";

import { useEffect } from "react";

/**
 * Subscribes to Supabase Realtime postgres_changes for one table (optional filter).
 * Calls refetch on INSERT/UPDATE/DELETE. Unsubscribes on unmount or when deps change.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string | null} table - null skips subscription
 * @param {string | undefined} filter - e.g. "week_id=eq.<uuid>" for filtered subscriptions
 * @param {() => void | Promise<void>} refetch
 */
export function usePostgresRealtime(supabase, table, filter, refetch) {
  useEffect(() => {
    if (!table) return;

    const payload = { event: "*", schema: "public", table };
    if (filter) payload.filter = filter;

    const channelName = `rt:${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2, 11)}`;

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", payload, () => {
        void refetch();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, table, filter, refetch]);
}
