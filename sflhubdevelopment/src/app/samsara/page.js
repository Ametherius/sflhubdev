import { getData } from "@/lib/samsaraAPI";
import SamsaraMap from "../components/samsaraMap";

export default async function Samsara() {
  const [vehicles, stats] = await Promise.all([
    getData("fleet/vehicles"),
    getData("fleet/vehicles/stats?types=gps,obdOdometerMeters"),
  ]);

  const drivers = (await getData("fleet/drivers"))?.data ?? [];

  const addresses = (await getData("addresses")).data ?? [];
  console.log(addresses);
  console.log(drivers);
  const statsById = new Map(
    (stats?.data ?? []).map((row) => [String(row.id), row]),
  );

  const units = (vehicles?.data ?? []).map((vehicle) => {
    const stats = statsById.get(String(vehicle.id));
    return {
      id: vehicle.id,
      driver: vehicle.staticAssignedDriver?.name ?? null,
      odometer: Math.round(stats?.obdOdometerMeters.value / 1000),
      speed: Math.round(stats?.gps.speedMilesPerHour * 1.60934),
      lat: stats?.gps.latitude,
      lon: stats?.gps.longitude,
      plate: vehicle.licensePlate,
      vin: vehicle.vin,
      unit: vehicle.name,
      location:
        stats?.gps?.address?.name || stats?.gps?.reverseGeo?.formattedLocation,
    };
  });
  // console.log(units);
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <SamsaraMap units={units} drivers={drivers} addresses={addresses} />
    </div>
  );
}
