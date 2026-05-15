"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

const SELECT = "id, load_number, origin, end_user, mt, rate, fsc, broker";

export function useLoadSheets() {
  const [sheets, setSheets] = useState([]);
  const [tableAvailable, setTableAvailable] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const refreshSheets = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setSheets([]);
      setTableAvailable(false);
      return;
    }

    const { data, error } = await supabase
      .from("loadsheets")
      .select(SELECT)
      .order("load_number", { ascending: true });

    if (error) {
      setTableAvailable(false);
      setSheets([]);
      const msg = error.message ?? "";
      if (/schema cache|does not exist|PGRST205/i.test(msg)) {
        console.warn(
          "[loadsheets] Table missing or not exposed. Apply migrations, then refresh.",
        );
      } else {
        console.error(error.message);
      }
      return;
    }

    setTableAvailable(true);
    setSheets(data ?? []);
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshSheets();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshSheets();
    });
    return () => subscription.unsubscribe();
  }, [refreshSheets, supabase]);

  usePostgresRealtime(
    supabase,
    tableAvailable ? "loadsheets" : null,
    undefined,
    refreshSheets,
  );

  return [sheets, refreshSheets];
}
