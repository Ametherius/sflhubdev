"use client";

import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useEffect, useMemo, useState } from "react";

export function useProfile() {
  const [activeUser] = useUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    if (!activeUser?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, admin, first_name")
        .eq("id", activeUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Profile error:", error.message);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUser?.id, supabase]);

  return [profile, loading];
}
