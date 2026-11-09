import ScheduleClient from "../components/scheduleClient";
import { fetchSchedulePageData } from "@/lib/fetchSchedulePageData";
import { getData } from "@/lib/samsaraAPI";
import { createClient } from "@/lib/supabase/server";

export default async function Schedule() {
  const supabase = await createClient();
  const data = await fetchSchedulePageData(supabase);
  const trailers = await getData("fleet/trailers");

  const allTrailers = [
    ...new Map(
      (trailers?.data ?? []).map((trailer) => {
        const name = String(trailer.name ?? "").replace(/ (Lead|Pup)$/i, "");
        return [name, { ...trailer, name }];
      }),
    ).values(),
  ];

  const fleetTrailers = allTrailers.filter((trailer) =>
    /^(CL|H|T)/i.test(trailer.name),
  );

  console.log(fleetTrailers);

  return (
    <ScheduleClient
      weeks={data.weeks}
      assigned={data.assigned}
      loadSlots={data.loadSlots}
      weekId={data.weekId}
      loads={data.loads}
      snapshots={data.snapshots}
      exclusions={data.exclusions}
      trailers={fleetTrailers}
    />
  );
}
