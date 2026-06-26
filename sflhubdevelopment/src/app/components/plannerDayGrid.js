"use client";

import { readSlotPlanDate, readSlotSortOrder } from "@/lib/plannerSlots";
import { weekDayLabels } from "@/lib/weekDates";
import { useMemo } from "react";
import PlannerDayCell, {
  PlannerAddSlotCell,
  plannerDayColumnClass,
} from "./plannerDayCell";

export default function PlannerDayGrid({
  brokerId,
  weekId,
  weekStartISO,
  slots = [],
  slotCols = null,
  canEdit = true,
  onRequestAddSlot,
  onSelectSlot,
  onDeleteSlot,
  deletingSlotId = null,
}) {
  const days = useMemo(
    () => (weekStartISO ? weekDayLabels(weekStartISO) : []),
    [weekStartISO],
  );

  const slotsByDay = useMemo(() => {
    const map = new Map();
    for (const slot of slots) {
      const dayKey = readSlotPlanDate(slot, slotCols);
      if (!dayKey) continue;
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey).push(slot);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => readSlotSortOrder(a, slotCols) - readSlotSortOrder(b, slotCols),
      );
    }
    return map;
  }, [slots, slotCols]);

  if (!weekStartISO) {
    return <p className="text-white/80">Select a week</p>;
  }

  return (
    <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
      {days.map((d) => {
        const daySlots = slotsByDay.get(d.iso) ?? [];

        return (
          <div key={d.iso} className={plannerDayColumnClass}>
            <div className="bg-green-950 p-3 text-start text-sm font-semibold text-white">
              {d.columnTitle ?? d.label}
            </div>
            <div className="flex flex-col gap-1 bg-white/95">
              {daySlots.map((ds) => (
                <PlannerDayCell
                  key={ds.id ?? `${d.iso}-${readSlotSortOrder(ds, slotCols)}`}
                  slot={ds}
                  slotCols={slotCols}
                  canEdit={canEdit}
                  onSelect={onSelectSlot}
                  onDelete={onDeleteSlot}
                  deleting={deletingSlotId != null && deletingSlotId === ds.id}
                />
              ))}
              {canEdit ? (
                <PlannerAddSlotCell
                  disabled={!weekId || !brokerId}
                  onClick={() =>
                    onRequestAddSlot?.({
                      brokerId,
                      weekId,
                      planDate: d.iso,
                      dayTitle: d.columnTitle ?? d.label,
                      existingDaySlots: daySlots,
                    })
                  }
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
