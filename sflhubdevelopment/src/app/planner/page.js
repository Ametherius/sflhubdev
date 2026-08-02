import Header from "../components/header";
import { detectPlannerSlotColumns } from "@/lib/plannerSlots";
import { createClient } from "@/lib/supabase/server";
import PlannerClient from "../components/plannerClient";

export default async function Planner() {
  const supabase = await createClient();
  const { data: week } = await supabase
    .from("schedule_weeks")
    .select("id, week_start_date")
    .order("week_start_date");
  const weeks = week ?? [];

  const { data: broker } = await supabase
    .from("brokers")
    .select("id, name, division")
    .order("name");
  const brokers = broker ?? [];

  const { data: plannerSlots } = await supabase
    .from("planner_slots")
    .select("*");
  const slots = plannerSlots ?? [];

  const {
    columns: slotColumns,
    schemaReady,
    missing,
  } = await detectPlannerSlotColumns(supabase);

  return (
    <div className="w-full h-full">
      <Header />
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
