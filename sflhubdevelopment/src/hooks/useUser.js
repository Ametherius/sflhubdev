"use client";

import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/authUser";
import { useEffect, useMemo, useState } from "react";

export function useUser() {
  const [activeUser, setActiveUser] = useState(null);
  const [ready, setReady] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { user, error: userError } = await getAuthUser(supabase);
      if (cancelled) return;
      if (userError || !user) {
        console.log("No User");
        setActiveUser(null);
      } else {
        setActiveUser(user);
      }
      setReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id && !session.user.__isUserNotAvailableProxy) {
        setActiveUser(session.user);
        return;
      }
      if (event === "SIGNED_OUT") {
        setActiveUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return [activeUser, ready];
}
