"use client";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

const ASSIGN_SELECT =
  "id, driverid, unitid, driver: driverid (id, name, phone, user, pass, pin, division), unit: unitid (id, unit, petro, petroPIN, ufa, ufaPIN)";

export function useAssigned() {
  const [assignedUnits, setAssignedUnits] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  const refreshAssigned = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
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
    refreshAssigned();
  }, [refreshAssigned]);

  return [assignedUnits, refreshAssigned];
}
