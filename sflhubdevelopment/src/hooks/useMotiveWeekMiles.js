"use client";

import { useEffect, useState } from "react";

export function useMotiveWeekMiles(weekStartISO) {
  const [milesByUnit, setMilesByUnit] = useState({});

  useEffect(() => {
    if (!weekStartISO) {
      setMilesByUnit({});
      return;
    }
    let cancelled = false;
    const weekStart = String(weekStartISO).slice(0, 10);

    async function load() {
      try {
        const res = await fetch(
          `/api/motive/week-miles?weekStart=${encodeURIComponent(weekStart)}`,
        );
        if (!res.ok) {
          if (!cancelled) setMilesByUnit({});
          return;
        }
        const data = await res.json();
        if (!cancelled) setMilesByUnit(data?.milesByUnit ?? {});
      } catch {
        if (!cancelled) setMilesByUnit({});
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [weekStartISO]);

  return milesByUnit;
}
