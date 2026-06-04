"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/authUser";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

// Schedule uses exactly three loads per day (see ensure_schedule_loads_for_week limit 3).
// We only keep the first three load_slots rows by sort_order in client state (option 1: fixed slots).
const SCHEDULE_SLOT_COUNT = 3;

// Add more columns (e.g. name, label) if your load_slots table has them.
const SLOT_SELECT = "id, sort_order, name, label";

function takeCanonicalScheduleSlots(rows) {
  const list = rows ?? [];
  const hasSort = list.some((r) => r.sort_order != null);
  const sorted = [...list].sort((a, b) => {
    if (hasSort) {
      const o = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
      if (o !== 0) return o;
    }
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted.slice(0, SCHEDULE_SLOT_COUNT);
}

function isMissingSortOrderColumn(message) {
  return /\bsort_order\b/i.test(message ?? "") && /does not exist/i.test(message ?? "");
}

export function useLoadSlots() {
  const [slots, setSlots] = useState([]);
  const [slotsTableAvailable, setSlotsTableAvailable] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const refreshSlots = useCallback(async () => {
    const { user, error: userError } = await getAuthUser(supabase);
    if (userError || !user) {
      setSlotsTableAvailable(false);
      setSlots([]);
      return;
    }

    let res = await supabase
      .from("load_slots")
      .select(SLOT_SELECT)
      .order("sort_order", { ascending: true });

    if (res.error && isMissingSortOrderColumn(res.error.message)) {
      res = await supabase
        .from("load_slots")
        .select("id, name, label")
        .order("id", { ascending: true });
    } else if (res.error && /does not exist/i.test(res.error.message ?? "")) {
      res = await supabase
        .from("load_slots")
        .select("id, sort_order")
        .order("sort_order", { ascending: true });
    }

    if (res.error && isMissingSortOrderColumn(res.error.message)) {
      res = await supabase.from("load_slots").select("id").order("id", { ascending: true });
    } else if (res.error && /does not exist/i.test(res.error.message ?? "")) {
      res = await supabase.from("load_slots").select("id").order("id", { ascending: true });
    }

    const { data, error } = res;

    if (error) {
      setSlotsTableAvailable(false);
      setSlots([]);
      const msg = error.message ?? "";
      if (/schema cache|does not exist|PGRST205/i.test(msg)) {
        console.warn(
          "[load_slots] Table missing or not exposed. Apply migrations (e.g. ensure_three_canonical_load_slots), then refresh.",
        );
      } else {
        console.error(error.message);
      }
      return;
    }

    setSlotsTableAvailable(true);
    setSlots(takeCanonicalScheduleSlots(data));
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates state in refreshSlots
    void refreshSlots();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSlots();
    });
    return () => subscription.unsubscribe();
  }, [refreshSlots, supabase]);

  usePostgresRealtime(
    supabase,
    slotsTableAvailable ? "load_slots" : null,
    undefined,
    refreshSlots,
  );

  return [slots, refreshSlots];
}
