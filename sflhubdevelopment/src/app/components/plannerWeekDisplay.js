"use client";

import { parseISODateLocal } from "@/lib/weekDates";
import { useState } from "react";

export default function PlannerWeekDisplay({ weeks }) {
  const locale = navigator.language;
  const [value, setValue] = useState("");
  return (
    <div className="p-2">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="bg-[#171717] text-white p-2 w-70 rounded-lg border-2 "
      >
        {weeks.map((w) => {
          const date = parseISODateLocal(w.week_start_date);
          const label = new Intl.DateTimeFormat(locale, {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(date);

          return (
            <option
              key={w.id}
              value={w.label}
              className="bg-white text-green-950"
            >
              Week Of Sunday {label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
