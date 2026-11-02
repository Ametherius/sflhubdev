import {
  fetchPlannerSlotsForWeek,
  plannerSlotColumns,
} from "@/lib/plannerSlots";
import { resolveDefaultScheduleWeekId } from "@/lib/weekDates";
import { createClient } from "@/lib/supabase/server";
import PlannerClient from "../components/plannerClient";

export default async function Planner() {
  const supabase = await createClient();

  const [weeksRes, brokersRes] = await Promise.all([
    supabase
      .from("schedule_weeks")
      .select("id, week_start_date")
      .order("week_start_date"),
    supabase.from("brokers").select("id, name, division").order("name"),
  ]);

  const weeks = weeksRes.data ?? [];
  const brokers = brokersRes.data ?? [];
  const defaultWeekId = resolveDefaultScheduleWeekId(weeks, null);
  const slotColumns = plannerSlotColumns();

  const slotsRes = defaultWeekId
    ? await fetchPlannerSlotsForWeek(supabase, defaultWeekId, slotColumns)
    : { data: [] };

  const slots = slotsRes.data ?? [];

  return (
    <div className="w-full h-full">
      <div className="flex justify-center text-white text-3xl font-bold m-5">
        <h1>Load Planner</h1>
      </div>
      <div className="w-full h-full">
        <PlannerClient
          brokers={brokers}
          weeks={weeks}
          slots={slots}
          slotColumns={slotColumns}
          plannerSchemaReady={true}
          plannerSchemaMissing={[]}
        />
      </div>
    </div>
  );
}
