"use client";
import {
  parseISODateLocal,
  resolveDefaultScheduleWeekId,
  toISODate,
} from "@/lib/weekDates";
import { useState, useMemo } from "react";
import PlannerRow from "./plannerRow";

export default function PlannerClient({ slots, brokers, weeks }) {
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const resolveWeekId = useMemo(
    () => resolveDefaultScheduleWeekId(weeks, selectedWeekId),
    [weeks, selectedWeekId],
  );
  const locale = navigator.language;

  return (
    <div className="w-full h-full">
      <div className="flex m-2 p-3">
        <select
          value={resolveWeekId}
          onChange={(e) => setSelectedWeekId(e.target.value || null)}
          className="bg-[#171717] border-2 rounded-lg p-2"
        >
          {weeks.map((w) => {
            const weekStart = parseISODateLocal(w.week_start_date);
            return (
              <option
                key={w.id}
                value={w.id}
                className="bg-white text-green-950"
              >
                Week of Sun{" "}
                {new Intl.DateTimeFormat(locale, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(weekStart)}
              </option>
            );
          })}
        </select>
      </div>
      <PlannerRow>
        {brokers.map((b) => (
          <div className="bg-white w-60 text-green-950 uppercase p-3 border-b-2 border-green-950">
            <h3>{b.name}</h3>
          </div>
        ))}
      </PlannerRow>
    </div>
  );
}
