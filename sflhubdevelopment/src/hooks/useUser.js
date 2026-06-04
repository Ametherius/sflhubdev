"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/authUser";
import { useEffect, useMemo, useState } from "react";

export function useUser() {
  const [activeUser, setActiveUser] = useState(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { user, error: userError } = await getAuthUser(supabase);
      if (cancelled) return;
      if (userError || !user) {
        console.log("No User");
        setActiveUser(null);
        return;
      }
      setActiveUser(user);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setActiveUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return [activeUser];
}
