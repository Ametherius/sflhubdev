"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

export function useDrivers() {
  const [drivers, setDrivers] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  const refreshDrivers = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("No User");
      return;
    }
    const { data, error } = await supabase.from("drivers").select("*");
    if (error) {
      console.error("Error Fetching Drivers");
      return;
    }
    setDrivers(data ?? []);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates state in refreshDrivers
    void refreshDrivers();
  }, [refreshDrivers]);

  usePostgresRealtime(supabase, "drivers", undefined, refreshDrivers);

  return [drivers];
}
