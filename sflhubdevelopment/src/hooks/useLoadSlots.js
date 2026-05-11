"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

// Add more columns (e.g. name, label) if your load_slots table has them.
const SLOT_SELECT = "id, sort_order, name, label";

function isMissingSortOrderColumn(message) {
  return /\bsort_order\b/i.test(message ?? "") && /does not exist/i.test(message ?? "");
}

export function useLoadSlots() {
  const [slots, setSlots] = useState([]);
  const [slotsTableAvailable, setSlotsTableAvailable] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const refreshSlots = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return;

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
          "[load_slots] Table missing or not exposed. Create it in Supabase, then refresh.",
        );
      } else {
        console.error(error.message);
      }
      return;
    }

    setSlotsTableAvailable(true);
    setSlots(data ?? []);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates state in refreshSlots
    void refreshSlots();
  }, [refreshSlots]);

  usePostgresRealtime(
    supabase,
    slotsTableAvailable ? "load_slots" : null,
    undefined,
    refreshSlots,
  );

  return [slots, refreshSlots];
}
