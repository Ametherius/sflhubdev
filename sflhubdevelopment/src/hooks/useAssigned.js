"use client";
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/authUser";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

const ASSIGN_SELECT =
  "id, driverid, unitid, driver: driverid (id, name, phone, user, pass, pin, division), unit: unitid (id, unit, petro, petroPIN, ufa, ufaPIN)";

export function useAssigned(initialAssigned) {
  const [assignedUnits, setAssignedUnits] = useState(initialAssigned ?? []);
  const seededRef = useRef(Array.isArray(initialAssigned));
  const supabase = useMemo(() => createClient(), []);

  const refreshAssigned = useCallback(async () => {
    const { user, error: userError } = await getAuthUser(supabase);
    if (userError || !user) {
      console.log("No User");
      return;
    }
    const { data, error } = await supabase
      .from("in_use_units")
      .select(ASSIGN_SELECT);
    if (error) {
      console.error("Error Fetching Units");
      return;
    }
    setAssignedUnits(data ?? []);
  }, [supabase]);

  useEffect(() => {
    if (seededRef.current) {
      seededRef.current = false;
      return;
    }
    void refreshAssigned();
  }, [refreshAssigned]);

  usePostgresRealtime(supabase, "in_use_units", undefined, refreshAssigned);
  // Joined driver/unit rows must refresh when those tables change (not only in_use_units).
  usePostgresRealtime(supabase, "drivers", undefined, refreshAssigned);
  usePostgresRealtime(supabase, "units", undefined, refreshAssigned);

  return [assignedUnits, refreshAssigned];
}
