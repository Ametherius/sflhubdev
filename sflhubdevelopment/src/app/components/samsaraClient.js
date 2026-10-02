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

export default function SamsaraClient({ units }) {
  const defaultCenter =
    units.length > 0 ? [units[0].lat, units[0].lon] : [49.2827, -123.1207];

  return (
    <div className="flex min-h-0 h-full w-full flex-1 overflow-hidden">
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
        <div className="absolute inset-0">
          <MapContainer
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
