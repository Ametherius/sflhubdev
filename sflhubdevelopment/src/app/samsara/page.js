import { getData } from "@/lib/samsaraAPI";
import SamsaraMap from "../components/samsaraMap";

export default async function Samsara() {
  const [vehicles, stats] = await Promise.all([
    getData("fleet/vehicles"),
    getData("fleet/vehicles/stats?types=gps,obdOdometerMeters"),
  ]);

  const statsById = new Map(
    (stats?.data ?? []).map((row) => [String(row.id), row]),
  );

  const units = (vehicles?.data ?? []).map((vehicle) => {
    const stats = statsById.get(String(vehicle.id));
    return {
      // ...vehicle,
      // gps: stats?.gps ?? null,
      // odometer: stats?.obdOdometerMeters ?? null,

      id: vehicle.id,
      driver: vehicle.staticAssignedDriver?.name ?? null,
      odometer: Math.round(stats?.obdOdometerMeters.value / 1000),
      speed: Math.round(stats?.gps.speedMilesPerHour * 1.60934),
      lat: stats?.gps.latitude,
      lon: stats?.gps.longitude,
      plate: vehicle.licensePlate,
      vin: vehicle.vin,
      unit: vehicle.name,
      location: stats?.gps.reverseGeo.formattedLocation,
    };
  });
  console.log(units);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <SamsaraMap units={units} />
    </div>
  );
}
