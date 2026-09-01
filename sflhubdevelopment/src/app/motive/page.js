import { getMotiveData } from "@/lib/motiveAPI";
import MotiveTruck from "../components/motiveTruck";

export default async function Motive() {
  async function makeMotiveData() {
    try {
      const [vehiclesResponse, trailersResponse, dataResponse] =
        await Promise.all([
          getMotiveData("v1/vehicles"),
          getMotiveData("v1/asset_locations"),
          getMotiveData("v2/vehicle_locations"),
        ]);

      // 1. SAFELY RESOLVE THE RAW ARRAYS (Bypasses getMotiveData pre-stripping)
      const rawVehicles = Array.isArray(vehiclesResponse)
        ? vehiclesResponse
        : (vehiclesResponse?.vehicles ?? []);
      const rawTelemetry = Array.isArray(dataResponse)
        ? dataResponse
        : (dataResponse?.vehicle_locations ?? []);
      const rawAssets = Array.isArray(trailersResponse)
        ? trailersResponse
        : (trailersResponse?.assets ?? []);

      // 2. CACHE VEHICLE BASELINES
      const vehicleMap = new Map();
      rawVehicles.forEach((item) => {
        const vObj = item?.vehicle ?? item;
        if (vObj?.id) {
          vehicleMap.set(String(vObj.id), vObj);
        }
      });

      // 3. CACHE ASSETS AND MAP BOTH BY ID AND BY NUMBER
      const assetMap = new Map();
      rawAssets.forEach((item) => {
        const aObj = item?.asset ?? item;
        if (aObj?.id) {
          const idStr = String(aObj.id).toLowerCase().trim();
          assetMap.set(idStr, aObj);

          // Secondary mapping: allow lookup via asset name/number if ID mapping fails
          if (aObj.asset_number) {
            const numStr = String(aObj.asset_number).toLowerCase().trim();
            assetMap.set(numStr, aObj);
          }
        }
      });

      console.log(
        `Successfully cached ${assetMap.size} asset mapping entry-keys.`,
      );

      function haversineMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (d) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
      }

      function toCoord(v) {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string" && v.trim() !== "" && !isNaN(v)) {
          return Number(v);
        }
        return null;
      }

      const locatedTrailers = rawAssets
        .map((item) => {
          const aObj = item?.asset ?? item;
          if (!aObj) return null;
          const loc =
            aObj.asset_gateway?.last_location ?? aObj.last_location ?? {};
          const lat = toCoord(loc.lat ?? loc.latitude);
          const lon = toCoord(loc.lon ?? loc.lng ?? loc.longitude);
          if (lat == null || lon == null) return null;
          const label =
            aObj.asset_number ??
            aObj.name ??
            (aObj.id != null ? `Asset #${aObj.id}` : null);
          if (!label) return null;
          return {
            id: String(aObj.id ?? label),
            label: String(label),
            lat,
            lon,
            used: false,
          };
        })
        .filter(Boolean);

      const MAX_TRAILER_DISTANCE_M = 200;

      // Recursive backup utility for numbers (odometer/coordinates)
      function findNestedValue(obj, targetKeys, foundValues = []) {
        if (!obj || typeof obj !== "object" || Array.isArray(obj))
          return foundValues;
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            const cleanKey = key.toLowerCase().replace(/_/g, "");
            const isTarget = targetKeys.some(
              (tk) => cleanKey === tk || cleanKey.includes(tk),
            );

            if (
              isTarget &&
              (typeof val === "number" ||
                (typeof val === "string" && !isNaN(val)))
            ) {
              foundValues.push(Number(val));
            } else if (val && typeof val === "object" && !Array.isArray(val)) {
              findNestedValue(val, targetKeys, foundValues);
            }
          }
        }
        return foundValues;
      }

      const trucks = rawTelemetry
        .map((item) => {
          if (!item) return null;

          const baseNode =
            item.vehicle_location ?? item.location_history ?? item;
          const vehicleNode = baseNode?.vehicle ?? item?.vehicle ?? {};
          const permanentVehicleId = vehicleNode.id
            ? String(vehicleNode.id)
            : null;
          const vehicleProfile = permanentVehicleId
            ? vehicleMap.get(permanentVehicleId)
            : null;
          const liveDriver = baseNode?.driver ?? item?.driver ?? {};

          // 4. SCAN EVERY KNOWN MOTIVE PATH FOR TRAILER LINKS
          const liveTrailerNode = baseNode?.trailer ?? item?.trailer ?? {};

          const possibleTrailerIds = [
            liveTrailerNode?.id,
            liveTrailerNode?.asset_id,
            item?.trailer_id,
            baseNode?.trailer_id,
            vehicleProfile?.current_trailer?.id,
            vehicleProfile?.trailer_id,
            vehicleProfile?.current_dispatch?.trailer?.id,
            liveDriver?.current_log?.trailer_id, // Common HOS App log path
          ];

          // Filter down to the first valid ID string found
          const resolvedId = possibleTrailerIds.find(
            (id) => id !== undefined && id !== null && id !== "",
          );

          // 5. DISCOVER TEXT FALLBACK LABELS FOR MANUAL ENTRY TRAILERS
          const possibleTrailerNames = [
            liveTrailerNode?.asset_number,
            liveTrailerNode?.name,
            item?.trailer_name,
            baseNode?.trailer_name,
            vehicleProfile?.current_trailer?.asset_number,
            vehicleProfile?.current_dispatch?.trailer?.asset_number,
            liveDriver?.current_log?.trailer_name, // Driver manual app entry
          ];

          const resolvedTextFallback = possibleTrailerNames.find(
            (name) => name && typeof name === "string" && name.trim() !== "",
          );

          let finalTrailerLabel = "None";

          if (resolvedId) {
            const lookupKey = String(resolvedId).toLowerCase().trim();
            const assetMatch = assetMap.get(lookupKey);

            if (assetMatch) {
              finalTrailerLabel =
                assetMatch.asset_number ??
                assetMatch.name ??
                `Asset #${resolvedId}`;
            } else {
              // ID exists but wasn't found in v2/assets query, fall back to text properties
              finalTrailerLabel = resolvedTextFallback ?? `ID: ${resolvedId}`;
            }
          } else if (resolvedTextFallback) {
            // No trackable system ID found, but driver typed a name into the dispatch system
            finalTrailerLabel = resolvedTextFallback;
          }

          // --- BACKUP SCANNERS FOR ODOMETER & COORD DATA ---
          const foundOdos = findNestedValue(item, [
            "odometer",
            "trueodometer",
            "value",
          ]);
          const foundLats = findNestedValue(item, ["latitude", "lat"]);
          const foundLons = findNestedValue(item, ["longitude", "lon", "lng"]);

          const validLats = foundLats.filter(
            (v) => v !== 0 && v >= -90 && v <= 90,
          );
          const validLons = foundLons.filter(
            (v) => v !== 0 && v >= -180 && v <= 180,
          );
          const validOdos = foundOdos.filter((v) => v > 0);

          const odometerValue =
            validOdos.length > 0
              ? new Intl.NumberFormat("en-CA").format(Math.trunc(validOdos[0]))
              : "0";

          const locLat = toCoord(vehicleNode?.current_location?.lat);
          const locLon = toCoord(vehicleNode?.current_location?.lon);

          return {
            id: permanentVehicleId ?? crypto.randomUUID(),
            unit:
              vehicleNode.number ?? vehicleProfile?.number ?? "Unknown Unit",
            vin: vehicleProfile?.vin ?? vehicleNode.vin ?? "N/A",
            plate: vehicleProfile?.license_plate_number ?? "N/A",
            driverFirst:
              vehicleProfile?.current_driver?.first_name ??
              liveDriver.first_name ??
              "Unassigned",
            driverLast:
              vehicleProfile?.current_driver?.last_name ??
              liveDriver.last_name ??
              "",
            odometer: odometerValue,
            lat: locLat ?? validLats[0] ?? null,
            lon: locLon ?? validLons[0] ?? null,
            trailer: finalTrailerLabel,
          };
        })
        .filter(Boolean);

      for (const truck of trucks) {
        if (truck.trailer && truck.trailer !== "None") continue;
        if (truck.lat == null || truck.lon == null) continue;

        let best = null;
        let bestDist = MAX_TRAILER_DISTANCE_M;
        for (const trailer of locatedTrailers) {
          if (trailer.used) continue;
          const dist = haversineMeters(
            truck.lat,
            truck.lon,
            trailer.lat,
            trailer.lon,
          );
          if (dist < bestDist) {
            bestDist = dist;
            best = trailer;
          }
        }
        if (best) {
          best.used = true;
          truck.trailer = best.label;
        }
      }

      return trucks;
    } catch (err) {
      console.error("Error compilation mapping fleets:", err);
      return [];
    }
  }

  const vehicleData = (await makeMotiveData()) || [];
  console.log(vehicleData);
  return (
    <div className="w-full">
      <div className="w-90 h-[calc(100vh-6.5rem)] bg-white fixed top-26 left-0 flex flex-col border-r border-gray-200">
        <h2 className="text-green-950 text-center font-bold text-2xl py-4 bg-white border-b border-gray-100 flex-shrink-0">
          Active Units
        </h2>

        <div className="flex-1 overflow-y-auto flex flex-col bg-gray-50">
          {vehicleData.map((truck) => {
            if (truck.driverFirst === "Unassigned") return null;

            return (
              <div className="w-full bg-gray-600 flex-shrink-0" key={truck.id}>
                <MotiveTruck
                  firstName={truck.driverFirst}
                  lastName={truck.driverLast}
                  plate={truck.plate}
                  vin={truck.vin}
                  odometer={truck.odometer}
                  unit={truck.unit}
                  trailer={truck.trailer} // ADDED: Send trailer details to component
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
