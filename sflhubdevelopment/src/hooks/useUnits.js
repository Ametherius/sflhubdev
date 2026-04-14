import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnits() {
  const [units, setUnits] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUnits() {
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
      setUnits(data);
    }
    fetchUnits();
  }, []);
  return [units];
}
