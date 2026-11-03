"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/authUser";
import { normalizeRpcUuid } from "@/lib/scheduleLoadsPersist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

export function useScheduleWeeks(initialWeeks) {
  const [weeks, setWeeks] = useState(initialWeeks ?? []);
  const seededRef = useRef(Array.isArray(initialWeeks));
  const supabase = useMemo(() => createClient(), []);

  const refreshWeeks = useCallback(async () => {
    const { user, error: userError, aborted } = await getAuthUser(supabase);
    // An unauthenticated retry comes back empty under RLS and would wipe the
    // weeks the server already rendered.
    if (userError || aborted || !user) return;

    const { data, error } = await supabase
      .from("schedule_weeks")
      .select("id, week_start_date, created_at")
      .order("week_start_date", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }
    if (!data?.length) return;
    setWeeks(data);
  }, [supabase]);

  const createWeek = useCallback(
    async (weekStartISO) => {
      const { data, error } = await supabase.rpc("create_schedule_week", {
        p_week_start: weekStartISO,
      });
      if (error) return { error: error.message, weekId: null };
      const weekId = normalizeRpcUuid(data);
      if (!weekId) {
        return {
          error: "Could not create or find schedule week. Try again.",
          weekId: null,
        };
      }
      await refreshWeeks();
      return { error: null, weekId };
    },
    [supabase, refreshWeeks],
  );

  useEffect(() => {
    if (seededRef.current) {
      seededRef.current = false;
      return;
    }
    void refreshWeeks();
  }, [refreshWeeks]);

  usePostgresRealtime(supabase, "schedule_weeks", undefined, refreshWeeks);

  return [weeks, refreshWeeks, createWeek];
}
