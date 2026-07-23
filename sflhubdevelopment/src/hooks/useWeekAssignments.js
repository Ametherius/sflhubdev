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
  "id, week_id, in_use_unit_id, week_only, driverid, unitid, driver_name, driver_phone, driver_user, driver_pass, driver_pin, driver_division, unit_label, unit_petro, unit_petro_pin, unit_ufa, unit_ufa_pin";

/**
 * Rows to render on the schedule for one week: live board units + archived snapshots.
 */
export function useWeekAssignments(
  weekId,
  liveAssigned = [],
  weekStartISO = null,
) {
  const [snapshots, setSnapshots] = useState([]);
  const [excludedInUseIds, setExcludedInUseIds] = useState(() => new Set());
  const supabase = useMemo(() => createClient(), []);

  const refreshSnapshots = useCallback(async () => {
    if (!weekId) {
      setSnapshots([]);
      setExcludedInUseIds(new Set());
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

  const refreshExclusions = useCallback(async () => {
    if (!weekId) {
      setExcludedInUseIds(new Set());
      return;
    }
    const { data, error } = await supabase
      .from("schedule_week_unit_exclusions")
      .select("in_use_unit_id")
      .eq("week_id", weekId);

    if (error) {
      if (/schedule_week_unit_exclusions|does not exist/i.test(error.message ?? "")) {
        setExcludedInUseIds(new Set());
        return;
      }
      if (!/abort/i.test(error.message ?? "")) {
        console.error(error.message);
      }
      return;
    }
    setExcludedInUseIds(
      new Set(
        (data ?? [])
          .map((r) => (r.in_use_unit_id != null ? String(r.in_use_unit_id) : null))
          .filter(Boolean),
      ),
    );
  }, [supabase, weekId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshSnapshots(), refreshExclusions()]);
  }, [refreshSnapshots, refreshExclusions]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  usePostgresRealtime(
    supabase,
    weekId ? "schedule_assignments" : null,
    weekId ? `week_id=eq.${weekId}` : undefined,
    refreshAll,
  );

  usePostgresRealtime(
    supabase,
    weekId ? "schedule_week_unit_exclusions" : null,
    weekId ? `week_id=eq.${weekId}` : undefined,
    refreshAll,
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
        const liveId = String(row.id);
        if (excludedInUseIds.has(liveId)) continue;
        liveIds.add(liveId);
        const scheduleAssignmentId = assignmentIdByInUse.get(liveId) ?? null;
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
        if (
          snap.in_use_unit_id != null &&
          excludedInUseIds.has(String(snap.in_use_unit_id))
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
      // Past weeks: always use the week snapshot so historical loads/units stay correct.
      for (const snap of snapshots) {
        const hasLabels =
          String(snap.driver_name ?? "").trim() ||
          String(snap.unit_label ?? "").trim();
        if (!hasLabels) continue;

        const display = assignmentFromSnapshot(snap);
        if (display) rows.push(display);
      }
    }

    return rows.sort(compareAssignedRows);
  }, [
    liveAssigned,
    snapshots,
    assignmentIdByInUse,
    weekStartISO,
    excludedInUseIds,
  ]);

  return [displayRows, refreshAll];
}
