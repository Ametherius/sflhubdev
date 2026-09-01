"use client";

import { useMemo } from "react";
import AssignedCard from "./assignedCard";
import UnitWeekLoadsGrid from "./unitWeekLoadsGrid";
import { addDays, parseISODateLocal } from "@/lib/weekDates";
import { formatLoadTotalCad } from "@/lib/loadTotal";
import { formatWeekRevenuePerKm } from "@/lib/revenuePerKm";
import { sumWeekUnitRevenue } from "@/lib/weekUnitRevenue";
import {
  formatWeekMiles,
  normalizeUnitNumber,
} from "@/lib/motiveWeekMiles";

function formatWeekBanner(weekStartISO) {
  if (!weekStartISO) return null;
  const start = parseISODateLocal(weekStartISO);
  const end = addDays(start, 6);
  const a = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const b = end.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Week: ${a} — ${b}`;
}

/**
 * One in-use unit on the schedule: driver/unit card + 7-day load strip (matches layout reference).
 */
export default function ScheduleRow({
  assignment,
  weekStartISO,
  weekId,
  loads,
  allWeekLoads = null,
  assignableUnits = [],
  loadSlots,
  loadSheets = [],
  onDelete,
  deleteLabel = "",
  onSecondaryAction,
  secondaryLabel = "",
  readOnly = false,
  onLoadsUpdated,
  onLoadPatched,
  onLoadSheetsUpdated,
  motiveMilesByUnit = {},
}) {
  const driver = assignment?.driver;
  const unit = assignment?.unit;

  const banner = formatWeekBanner(weekStartISO);

  const { weekTotalDisplay, weekRevenuePerKmDisplay, weekMilesDisplay } =
    useMemo(() => {
      const revenue = sumWeekUnitRevenue(loads);
      const unitKey = normalizeUnitNumber(unit?.unit);
      const motiveMiles = unitKey ? motiveMilesByUnit[unitKey] : null;
      return {
        weekTotalDisplay: formatLoadTotalCad(String(revenue)) || "$0.00",
        weekRevenuePerKmDisplay: formatWeekRevenuePerKm(revenue, motiveMiles),
        weekMilesDisplay: formatWeekMiles(motiveMiles),
      };
    }, [loads, unit?.unit, motiveMilesByUnit]);

  if (!driver || !unit) return null;

  return (
    <article className="mb-10 w-full min-w-0 max-w-full">
      {banner ? (
        <p className="mb-2 text-sm font-semibold tracking-wide text-white/90">
          {banner}
        </p>
      ) : null}
      <div className="pb-1">
        <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-green-950 bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] ring-1 ring-green-950/15 lg:flex-row lg:items-stretch">
          <AssignedCard
            embedded
            name={driver.name}
            phone={driver.phone}
            pin={driver.pin}
            user={driver.user}
            pass={driver.pass}
            division={driver.division}
            unit={unit.unit}
            petro={unit.petro}
            petroPIN={unit.petroPIN}
            ufa={unit.ufa}
            ufaPIN={unit.ufaPIN}
            weekTotalDisplay={weekTotalDisplay}
            weekRevenuePerKmDisplay={weekRevenuePerKmDisplay}
            weekMilesDisplay={weekMilesDisplay}
            onDelete={assignment.isArchived ? undefined : onDelete}
            deleteLabel={deleteLabel}
            onSecondaryAction={onSecondaryAction}
            secondaryLabel={secondaryLabel}
          />
          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overscroll-x-contain bg-white p-2 lg:rounded-tr-2xl">
            <UnitWeekLoadsGrid
              embeddedInRow
              readOnly={readOnly}
              weekStartISO={weekStartISO}
              weekId={weekId}
              inUseUnitId={assignment.inUseUnitId}
              scheduleAssignmentId={assignment.scheduleAssignmentId}
              loads={loads}
              allWeekLoads={allWeekLoads}
              assignableUnits={assignableUnits}
              loadSlots={loadSlots}
              loadSheets={loadSheets}
              onUpdated={onLoadsUpdated}
              onLoadPatched={onLoadPatched}
              onLoadSheetsUpdated={onLoadSheetsUpdated}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
