import { NextResponse } from "next/server";
import { getMotiveData } from "@/lib/motiveAPI";
import { sumWeekMilesByUnit } from "@/lib/motiveWeekMiles";
import { weekEndISO } from "@/lib/weekDates";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/authUser";

export async function GET(request) {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthUser(supabase);
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  const weekEnd = weekEndISO(weekStart);
  if (!weekStart || !weekEnd) {
    return NextResponse.json(
      { error: "weekStart (YYYY-MM-DD) is required." },
      { status: 400 },
    );
  }

  const periods = await getMotiveData(
    "v1/driving_periods",
    { start_date: weekStart, end_date: weekEnd },
    { maxPages: 40 },
  );

  if (periods == null) {
    return NextResponse.json(
      { error: "Could not load Motive driving periods." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    milesByUnit: sumWeekMilesByUnit(periods, weekStart),
  });
}
