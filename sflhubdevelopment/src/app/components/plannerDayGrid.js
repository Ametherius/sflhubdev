"use client";

import {
  PLANNER_SLOTS_PER_DAY,
  readSlotPlanDate,
  readSlotSortOrder,
} from "@/lib/plannerSlots";
import { weekDayLabels } from "@/lib/weekDates";
import { useMemo } from "react";
import PlannerDayCell, {
  PlannerAddMultipleSlotCell,
  PlannerAddSlotCell,
  PlannerEmptyPresetCell,
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
  onRequestAddMultipleSlots,
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
        (a, b) =>
          readSlotSortOrder(a, slotCols) - readSlotSortOrder(b, slotCols),
      );
    }
    return map;
  }, [slots, slotCols]);

  if (!weekStartISO) {
    return <p className="text-white/80">Select a week</p>;
  }

  return (
    <div className="min-w-0 shrink-0 bg-white">
      <div className="flex min-w-max gap-2 p-1">
        {days.map((d) => {
          // Keep every existing slot; never drop extras above 4.
          const daySlots = slotsByDay.get(d.iso) ?? [];
          const emptyPresets = Math.max(
            0,
            PLANNER_SLOTS_PER_DAY - daySlots.length,
          );

          return (
            <div key={d.iso} className={plannerDayColumnClass}>
              <div className="bg-green-950 p-3 text-start text-sm font-semibold text-white">
                {d.columnTitle ?? d.label}
              </div>
              <div className="flex flex-col gap-1 bg-white">
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
                        bulk: false,
                        insertAt: "start",
                      })
                    }
                  />
                ) : null}
                {daySlots.map((ds) => (
                  <PlannerDayCell
                    key={ds.id ?? `${d.iso}-${readSlotSortOrder(ds, slotCols)}`}
                    slot={ds}
                    slotCols={slotCols}
                    canEdit={canEdit}
                    onSelect={onSelectSlot}
                    onDelete={onDeleteSlot}
                    deleting={
                      deletingSlotId != null && deletingSlotId === ds.id
                    }
                  />
                ))}
                {Array.from({ length: emptyPresets }, (_, index) => (
                  <PlannerEmptyPresetCell
                    key={`empty-${d.iso}-${index}`}
                    disabled={!canEdit || !weekId || !brokerId}
                    onClick={() =>
                      onRequestAddSlot?.({
                        brokerId,
                        weekId,
                        planDate: d.iso,
                        dayTitle: d.columnTitle ?? d.label,
                        existingDaySlots: daySlots,
                        bulk: false,
                        emptyPreset: true,
                      })
                    }
                  />
                ))}
                {canEdit ? (
                  <PlannerAddMultipleSlotCell
                    disabled={!weekId || !brokerId}
                    onClick={() =>
                      onRequestAddMultipleSlots?.({
                        brokerId,
                        weekId,
                        planDate: d.iso,
                        dayTitle: d.columnTitle ?? d.label,
                        existingDaySlots: daySlots,
                        bulk: true,
                      })
                    }
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
