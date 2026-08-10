import {
  detectPlannerSlotColumns,
  fetchPlannerSlotsForWeek,
  plannerSlotColumns,
} from "@/lib/plannerSlots";
import { resolveDefaultScheduleWeekId } from "@/lib/weekDates";
import { createClient } from "@/lib/supabase/server";
import PlannerClient from "../components/plannerClient";

export default async function Planner() {
  const supabase = await createClient();

  const [weeksRes, brokersRes, sampleRes] = await Promise.all([
    supabase
      .from("schedule_weeks")
      .select("id, week_start_date")
      .order("week_start_date"),
    supabase.from("brokers").select("id, name, division").order("name"),
    // Schema probe only — never select the full planner_slots table.
    supabase.from("planner_slots").select("*").limit(1),
  ]);

  const weeks = weeksRes.data ?? [];
  const brokers = brokersRes.data ?? [];
  const defaultWeekId = resolveDefaultScheduleWeekId(weeks, null);
  const slotColumns = plannerSlotColumns(sampleRes.data?.[0] ?? null);

  const slotsRes = defaultWeekId
    ? await fetchPlannerSlotsForWeek(supabase, defaultWeekId, slotColumns)
    : { data: [] };

  const slots = slotsRes.data ?? [];
  const sampleSlot = slots[0] ?? sampleRes.data?.[0] ?? null;

  const {
    columns,
    schemaReady,
    missing,
  } = await detectPlannerSlotColumns(supabase, { sampleSlot });

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
          slotColumns={columns}
          plannerSchemaReady={schemaReady}
          plannerSchemaMissing={missing}
        />
      </div>
    </div>
  );
}
