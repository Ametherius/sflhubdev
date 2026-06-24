import BrokerColumn from "../components/brokerColumn";
import Header from "../components/header";
import PlannerDayGrid from "../components/plannerDayGrid";
import PlannerRow from "../components/plannerRow";
import PlannerWeekDisplay from "../components/plannerWeekDisplay";
import { createClient } from "@/lib/supabase/server";

export default async function Planner() {
  const supabase = await createClient();
  const { data: week } = await supabase
    .from("schedule_weeks")
    .select("id, week_start_date")
    .order("week_start_date");
  const weeks = week ?? [];

  const { data: broker } = await supabase
    .from("brokers")
    .select("id, name")
    .order("name");
  const brokers = broker ?? [];

  const { data: plannerSlots } = await supabase
    .from("planner_slots")
    .select("*");
  const slots = plannerSlots ?? [];
  return (
    <div className="w-full h-full">
      <Header />
      <div className="flex justify-center text-white text-3xl font-bold m-5">
        <h1>Grain Load Planner</h1>
      </div>
      <div className="w-full h-full flex justify-start p-4">
        <PlannerWeekDisplay weeks={weeks} />
      </div>
      <div className="w-full p-2 overflow-y-scroll overflow-contain flex">
        <PlannerRow>
          <BrokerColumn brokers={brokers} />
          <PlannerDayGrid slots={slots} />
        </PlannerRow>
      </div>
    </div>
  );
}
