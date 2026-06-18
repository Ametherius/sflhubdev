import { weekIsComplete } from "@/lib/weekDates";
import { normalizeRpcUuid } from "@/lib/scheduleLoadsPersist";

export function assignableUnitRowKey(unit) {
  if (unit?.rowKey) return String(unit.rowKey);
  if (unit?.inUseUnitId != null) return String(unit.inUseUnitId);
  if (unit?.scheduleAssignmentId != null) {
    return `sa:${unit.scheduleAssignmentId}`;
  }
  return "";
}

async function findOrCreateInUseUnit(supabase, driverId, unitId) {
  const { data: existing, error: findErr } = await supabase
    .from("in_use_units")
    .select("id")
    .eq("driverid", driverId)
    .eq("unitid", unitId)
    .maybeSingle();

  if (findErr) return { id: null, error: findErr };
  if (existing?.id) return { id: existing.id, error: null };

  const { data, error } = await supabase
    .from("in_use_units")
    .insert({ driverid: driverId, unitid: unitId })
    .select("id")
    .single();

  return { id: data?.id ?? null, error };
}

/**
 * Assign driver+unit to one or more schedule weeks.
 * Past weeks always use week-only rows (no live board).
 */
export async function assignDriverUnitToWeeks(
  supabase,
  { driverId, unitId, weekIds, weeks, addToLiveBoard },
) {
  const ids = (weekIds ?? []).filter(Boolean);
  if (!ids.length) {
    return { error: { message: "Select at least one week." } };
  }

  const weekById = new Map((weeks ?? []).map((w) => [String(w.id), w]));
  const needsLiveBoard =
    addToLiveBoard &&
    ids.some((weekId) => {
      const w = weekById.get(String(weekId));
      return !weekIsComplete(w?.week_start_date ?? null);
    });

  let inUseUnitId = null;
  if (needsLiveBoard) {
    const { id, error } = await findOrCreateInUseUnit(supabase, driverId, unitId);
    if (error) return { error };
    if (!id) {
      return { error: { message: "Could not add unit to the live board." } };
    }
    inUseUnitId = id;
  }

  for (const weekId of ids) {
    const week = weekById.get(String(weekId));
    const past = weekIsComplete(week?.week_start_date ?? null);
    const weekOnly = past || !addToLiveBoard;

    if (weekOnly) {
      const { data, error } = await supabase.rpc("create_schedule_week_assignment", {
        p_week_id: weekId,
        p_driver_id: driverId,
        p_unit_id: unitId,
        p_in_use_unit_id: null,
        p_week_only: true,
      });
      if (error) return { error };

      const assignmentId = normalizeRpcUuid(data);
      if (!assignmentId) {
        return { error: { message: "Could not create assignment for that week." } };
      }

      const { error: loadsErr } = await supabase.rpc(
        "ensure_schedule_loads_for_assignment",
        { p_assignment_id: assignmentId },
      );
      if (loadsErr) return { error: loadsErr };
      continue;
    }

    const { error } = await supabase.rpc("ensure_schedule_loads_for_unit_week", {
      p_week_id: weekId,
      p_in_use_unit_id: inUseUnitId,
    });
    if (error) return { error };
  }

  return { error: null, inUseUnitId };
}
