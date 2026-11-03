"use client";
import { createClient } from "@/lib/supabase/client";
import { getAuthUser } from "@/lib/supabase/authUser";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { user } = await getAuthUser(supabase);
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    };
    checkSession();
  }, [router, supabase]);
  return null;
}
