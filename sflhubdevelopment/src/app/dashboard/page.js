"use client";
import { createClient } from "@/lib/supabase/client";
import Header from "../components/header";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const supabase = createClient();
  const [name, setName] = useState(null);
  const time = new Date();
  const hour = time.getHours();

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("No logged in user");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Profile Error:", error.message);
        return;
      }
      setName(data.first_name);
    }
    getProfile();
  }, []);
  return (
    <div className="w-full">
      <Header />
      <div className="w-full p-2 text-center my-4">
        <h2 className="text-3xl font-bold">
          {hour < 12 ? "Good Morning" : "Good Afternoon"}, {name}
        </h2>
      </div>
    </div>
  );
}
