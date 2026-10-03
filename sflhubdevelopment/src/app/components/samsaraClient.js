"use client";

import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import SamsaraUnit from "./samsaraUnit";
import BtnWhite from "./btnWhite";
import DispatchModal from "./dispatchModal";
import { useState, useEffect } from "react";
import { FaList } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { getData, postData } from "@/lib/samsaraAPI";

function mapUnits(vehicles, stats) {
  const statsById = new Map(
    (stats?.data ?? []).map((row) => [String(row.id), row]),
  );
  return (vehicles?.data ?? []).map((vehicle) => {
    const s = statsById.get(String(vehicle.id));
    return {
      id: vehicle.id,
      driver: vehicle.staticAssignedDriver?.name ?? null,
      odometer: Math.round((s?.obdOdometerMeters?.value ?? 0) / 1000),
      speed: Math.round((s?.gps?.speedMilesPerHour ?? 0) * 1.60934),
      lat: s?.gps?.latitude,
      lon: s?.gps?.longitude,
      plate: vehicle.licensePlate,
      vin: vehicle.vin,
      unit: vehicle.name,
      location: s?.gps?.address?.name || s?.gps?.reverseGeo?.formattedLocation,
    };
  });
}

export default function SamsaraClient({ units: initialUnits, drivers }) {
  const [units, setUnits] = useState(initialUnits ?? []);
  const [open, setOpen] = useState();

  useEffect(() => {
    const id = setInterval(async () => {
      const [vehicles, stats] = await Promise.all([
        getData("fleet/vehicles"),
        getData("fleet/vehicles/stats?types=gps,obdOdometerMeters"),
      ]);
      setUnits(mapUnits(vehicles, stats));
    }, 90 * 1000);
    return () => clearInterval(id);
  }, []);

  const [selectedUser, setSelectedUSer] = useState("");
  const [message, setMessage] = useState("");
  const defaultCenter =
    units.length > 0 ? [units[0].lat, units[0].lon] : [49.2827, -123.1207];

  async function sendDispatch(e) {
    e.preventDefault();
    await postData("v1/fleet/messages", {
      driverIds: [selectedUser],
      text: message,
    });
  }

  return (
    <div className="flex min-h-0 h-full w-full flex-1 overflow-hidden">
      <DispatchModal
        className={`absolute p-5 top-1/2 left-1/2 transform -translate-y-1/2 bg-white rounded-xl z-10 shadow-xl ${open ? "" : "hidden"}`}
      >
        <div className="text-center font-bold text-2xl text-green-950 mb-2 underline px-2">
          <h1>Create Dispatch</h1>
        </div>
        <div>
          <form>
            <div className="flex flex-col m-1">
              <label className="text-green-950">Select User</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUSer(e.target.value)}
                className="border-2 border-green-950 rounded-md text-green-950 p-2"
              >
                <option value="" className="">
                  Please Choose User
                </option>
                {drivers?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="flex flex-col m-1">
                <label className="text-green-950">Message</label>
                <textarea
                  className="border-2 border-green-950 rounded-md p-2 text-green-950"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                ></textarea>
              </div>
            </div>
            <div className="flex justify-center">
              <ButtonDark text="Send Dispatch" onClick={sendDispatch} />
            </div>
          </form>
        </div>
      </DispatchModal>
      <div className="flex min-h-0 w-90 shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-white p-2">
        {units.map((u) => {
          if (u.driver === null) return;
          return (
            <SamsaraUnit
              key={u.id}
              driver={u.driver}
              speed={u.speed}
              unit={u.unit}
              location={u.location}
              odometer={u.odometer}
              plate={u.plate}
              vin={u.vin}
            />
          );
        })}
      </div>
      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute top-2 left-16 z-10">
          <BtnWhite
            text="Create Dispatch"
            onClick={() => setOpen(!open)}
            Icon={FaList}
          />
        </div>
        <div className="absolute inset-0 z-0">
          <MapContainer
            key="samsara-map"
            center={defaultCenter}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {units.map(({ driver, unit, lat, lon }) => {
              if (driver === null || !lat || !lon) return;
              return (
                <CircleMarker
                  key={unit}
                  center={[lat, lon]}
                  radius={5}
                  className="text-black"
                >
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -8]}
                    className="unit-label"
                  >
                    <span className="mr-2">{driver}</span> {unit}
                  </Tooltip>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
