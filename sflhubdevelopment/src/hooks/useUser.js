"use client";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function useUser() {
  const [activeUser, setActiveUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("No User");
        return;
      }
      setActiveUser(user);
    }
    fetchUser();
  }, []);
  return [activeUser];
}
