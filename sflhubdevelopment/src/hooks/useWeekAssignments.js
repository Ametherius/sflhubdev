"use client";

import { createClient } from "@/lib/supabase/client";
import {
  assignmentFromLive,
  assignmentFromSnapshot,
} from "@/lib/scheduleAssignmentDisplay";
import { compareAssignedRows } from "@/lib/divisionSort";
import { weekAcceptsNewAssignments } from "@/lib/weekDates";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

const ASSIGNMENT_SELECT =
  "id, week_id, in_use_unit_id, driverid, unitid, driver_name, driver_phone, driver_user, driver_pass, driver_pin, driver_division, unit_label, unit_petro, unit_petro_pin, unit_ufa, unit_ufa_pin";

/**
 * Rows to render on the schedule for one week: live board units + archived snapshots.
 */
export function useWeekAssignments(
  weekId,
  liveAssigned = [],
  weekStartISO = null,
) {
  const [snapshots, setSnapshots] = useState([]);
  const supabase = useMemo(() => createClient(), []);

  const refreshSnapshots = useCallback(async () => {
    if (!weekId) {
      setSnapshots([]);
      return;
    }
    const { data, error } = await supabase
      .from("schedule_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("week_id", weekId);

    if (error) {
      if (/schedule_assignments|column .* does not exist/i.test(error.message ?? "")) {
        setSnapshots([]);
        return;
      }
      if (!/abort/i.test(error.message ?? "")) {
        console.error(error.message);
      }
      return;
    }
    setSnapshots(data ?? []);
  }, [supabase, weekId]);

  useEffect(() => {
    void refreshSnapshots();
  }, [refreshSnapshots]);

  usePostgresRealtime(
    supabase,
    weekId ? "schedule_assignments" : null,
    weekId ? `week_id=eq.${weekId}` : undefined,
    refreshSnapshots,
  );

  const assignmentIdByInUse = useMemo(() => {
    const m = new Map();
    for (const s of snapshots) {
      if (s.in_use_unit_id != null) {
        m.set(String(s.in_use_unit_id), String(s.id));
      }
    }
    return m;
  }, [snapshots]);

  const displayRows = useMemo(() => {
    const liveById = new Map();
    for (const row of liveAssigned ?? []) {
      if (row?.id != null) liveById.set(String(row.id), row);
    }

    const rows = [];
    const acceptsNew = weekAcceptsNewAssignments(weekStartISO);

    if (acceptsNew) {
      const liveIds = new Set();
      for (const row of liveAssigned ?? []) {
        if (!row?.driver || !row?.unit) continue;
        liveIds.add(String(row.id));
        const scheduleAssignmentId =
          assignmentIdByInUse.get(String(row.id)) ?? null;
        const display = assignmentFromLive(row, scheduleAssignmentId);
        if (display) rows.push(display);
      }

      for (const snap of snapshots) {
        if (
          snap.in_use_unit_id != null &&
          liveIds.has(String(snap.in_use_unit_id))
        ) {
          continue;
        }
        const hasLabels =
          String(snap.driver_name ?? "").trim() ||
          String(snap.unit_label ?? "").trim();
        if (!hasLabels) continue;
        const display = assignmentFromSnapshot(snap, { liveIds });
        if (display && !display.isArchived) rows.push(display);
      }
    } else {
      for (const snap of snapshots) {
        const hasLabels =
          String(snap.driver_name ?? "").trim() ||
          String(snap.unit_label ?? "").trim();
        if (!hasLabels) continue;

        const liveId =
          snap.in_use_unit_id != null ? String(snap.in_use_unit_id) : null;
        const live = liveId ? liveById.get(liveId) : null;
        if (live?.driver && live?.unit) {
          const display = assignmentFromLive(live, String(snap.id));
          if (display) rows.push(display);
          continue;
        }

        const display = assignmentFromSnapshot(snap);
        if (display) rows.push(display);
      }
    }

    return rows.sort(compareAssignedRows);
  }, [liveAssigned, snapshots, assignmentIdByInUse, weekStartISO]);

  return [displayRows, refreshSnapshots];
}
