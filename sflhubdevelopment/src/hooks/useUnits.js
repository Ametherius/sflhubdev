"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

export function useUnits() {
  const [units, setUnits] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  const refreshUnits = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("No User");
      return;
    }
    const { data, error } = await supabase.from("units").select("*");
    if (error) {
      console.error("Error Fetching Units");
      return;
    }
    setUnits(data ?? []);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates state in refreshUnits
    void refreshUnits();
  }, [refreshUnits]);

  usePostgresRealtime(supabase, "units", undefined, refreshUnits);

  return [units];
}
