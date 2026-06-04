"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/authUser";
import { normalizeRpcUuid } from "@/lib/scheduleLoadsPersist";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

export function useScheduleWeeks() {
  const [weeks, setWeeks] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  const refreshWeeks = useCallback(async () => {
    const { user, error: userError } = await getAuthUser(supabase);
    if (userError || !user) return;

    const { data, error } = await supabase
      .from("schedule_weeks")
      .select("id, week_start_date, created_at")
      .order("week_start_date", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }
    setWeeks(data ?? []);
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
    // Mount / client auth: load weeks from Supabase
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates state in refreshWeeks
    void refreshWeeks();
  }, [refreshWeeks]);

  usePostgresRealtime(supabase, "schedule_weeks", undefined, refreshWeeks);

  return [weeks, refreshWeeks, createWeek];
}
