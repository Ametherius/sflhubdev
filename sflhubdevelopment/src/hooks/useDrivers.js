import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function useDrivers() {
  const [drivers, setDrivers] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDrivers() {
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
      setDrivers(data);
    }
    fetchDrivers();
  }, []);
  return [drivers];
}
