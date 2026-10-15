import ScheduleClient from "../components/scheduleClient";
import { fetchSchedulePageData } from "@/lib/fetchSchedulePageData";
import { createClient } from "@/lib/supabase/server";

export default async function Schedule() {
  const supabase = await createClient();
  const data = await fetchSchedulePageData(supabase);

  return (
    <ScheduleClient
      weeks={data.weeks}
      assigned={data.assigned}
      loadSlots={data.loadSlots}
      weekId={data.weekId}
      loads={data.loads}
      snapshots={data.snapshots}
      exclusions={data.exclusions}
    />
  );
}
