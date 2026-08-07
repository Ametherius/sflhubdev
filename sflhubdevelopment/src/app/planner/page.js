import { detectPlannerSlotColumns } from "@/lib/plannerSlots";
import { createClient } from "@/lib/supabase/server";
import PlannerClient from "../components/plannerClient";

export default async function Planner() {
  const supabase = await createClient();

  const [weeksRes, brokersRes, slotsRes] = await Promise.all([
    supabase
      .from("schedule_weeks")
      .select("id, week_start_date")
      .order("week_start_date"),
    supabase.from("brokers").select("id, name, division").order("name"),
    supabase.from("planner_slots").select("*"),
  ]);

  const weeks = weeksRes.data ?? [];
  const brokers = brokersRes.data ?? [];
  const slots = slotsRes.data ?? [];

  const {
    columns: slotColumns,
    schemaReady,
    missing,
  } = await detectPlannerSlotColumns(supabase, { sampleSlot: slots[0] ?? null });

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
          plannerSchemaReady={schemaReady}
          plannerSchemaMissing={missing}
        />
      </div>
    </div>
  );
}
