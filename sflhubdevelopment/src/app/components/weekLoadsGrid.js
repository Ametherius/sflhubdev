"use client";

import { Fragment, useMemo } from "react";
import { weekDayLabels } from "@/lib/weekDates";

function slotLabel(slot) {
  if (slot?.name != null && String(slot.name).trim() !== "") return slot.name;
  if (slot?.label != null && String(slot.label).trim() !== "")
    return slot.label;
  return `Load ${slot?.sort_order ?? "?"}`;
}

/** Derive slot rows from loads when load_slots list is empty (e.g. embed only). */
function slotsFromLoads(loads) {
  const byId = new Map();
  for (const row of loads ?? []) {
    const ls = row.load_slots;
    const id = row.load_slot_id ?? ls?.id;
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        sort_order: ls?.sort_order ?? 0,
        name: ls?.name,
        label: ls?.label,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const o = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (o !== 0) return o;
    return String(a.id).localeCompare(String(b.id));
  });
}

export default function WeekLoadsGrid({
  weekStartISO,
  loads,
  loadSlots = [],
  hasActiveInUse = false,
}) {
  const days = useMemo(
    () => (weekStartISO ? weekDayLabels(weekStartISO) : []),
    [weekStartISO],
  );

  const slots = useMemo(() => {
    if (loadSlots.length > 0) {
      return [...loadSlots].sort((a, b) => {
        const o = (a.sort_order ?? 0) - (b.sort_order ?? 0);
        if (o !== 0) return o;
        return String(a.id).localeCompare(String(b.id));
      });
    }
    return slotsFromLoads(loads);
  }, [loadSlots, loads]);

  const loadMap = useMemo(() => {
    const m = new Map();
    for (const row of loads ?? []) {
      const sid = row.load_slot_id ?? row.load_slots?.id;
      if (!sid) continue;
      m.set(`${row.load_date}-${sid}`, row);
    }
    return m;
  }, [loads]);

  if (!weekStartISO || days.length === 0) {
    return (
      <p className="mb-6 text-sm text-white/70">
        Create a week to see the load grid.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="mb-6 text-sm text-amber-200/90">
        No load slots found. Add rows to the{" "}
        <code className="rounded bg-black/30 px-1">load_slots</code> table (with{" "}
        <code className="rounded bg-black/30 px-1">sort_order</code>) and
        refresh, or run the migration that links{" "}
        <code className="rounded bg-black/30 px-1">schedule_loads</code> to{" "}
        <code className="rounded bg-black/30 px-1">load_slots</code>.
      </p>
    );
  }

  return (
    <div className="mb-8 overflow-x-scroll rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Loads this week</h3>
      <div
        className="grid min-w-[720px] gap-2"
        style={{
          gridTemplateColumns: `112px repeat(${days.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {days.map((d) => (
          <div
            key={d.iso}
            className="rounded-lg bg-green-950/40 px-2 py-2 text-center text-xs font-semibold text-white sm:text-sm"
          >
            {d.label}
          </div>
        ))}

        {slots.map((slot) => (
          <Fragment key={slot.id}>
            <div className="flex items-center text-sm font-medium text-white/90">
              {slotLabel(slot)}
            </div>
            {days.map((d) => {
              const row = loadMap.get(`${d.iso}-${slot.id}`);
              return (
                <div
                  key={`${d.iso}-${slot.id}`}
                  className="min-h-[72px] rounded-lg border border-green-950/30 bg-white/90 p-2 text-xs text-green-950 shadow-inner"
                >
                  {row ? (
                    <span className="text-green-900/60">Ready to assign</span>
                  ) : hasActiveInUse ? (
                    <span className="text-green-900/40">—</span>
                  ) : (
                    <span className="text-amber-800">Missing slot</span>
                  )}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
