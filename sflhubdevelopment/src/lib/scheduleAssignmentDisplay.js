function strHasValue(v) {
  return v != null && String(v).trim() !== "";
}

/** True when a schedule_loads row has user-entered or assigned content (not empty scaffold). */
export function scheduleLoadHasData(load) {
  if (!load) return false;
  if (load.invoiced) return true;
  return (
    strHasValue(load.origin) ||
    strHasValue(load.end_user) ||
    strHasValue(load.mt) ||
    strHasValue(load.rate) ||
    strHasValue(load.fsc) ||
    strHasValue(load.load_note) ||
    strHasValue(load.loadsheet_id) ||
    strHasValue(load.load_number) ||
    strHasValue(load.load_total) ||
    strHasValue(load.kms)
  );
}

/** True when any load on this assignment row has schedule content. */
export function assignmentHasScheduleData(assignment, loads) {
  return (loads ?? []).some(
    (load) =>
      loadBelongsToAssignment(load, assignment) && scheduleLoadHasData(load),
  );
}

/**
 * Vacate target for a schedule row.
 * - live + scheduleOnly: empty schedule on the live board — clear this week and remove assignment.
 * - live + !scheduleOnly: full vacate (unit has load data).
 * - schedule: archived empty row — remove schedule snapshot only.
 */
export function resolveVacateTarget(
  assignment,
  loads,
  liveAssigned,
  weekId,
) {
  if (!assignment || !weekId) return null;
  const empty = !assignmentHasScheduleData(assignment, loads);
  const liveId = resolveVacatableInUseUnitId(assignment, liveAssigned);

  if (liveId) {
    return {
      type: "live",
      inUseUnitId: liveId,
      weekId,
      scheduleOnly: empty,
    };
  }

  if (empty && assignment.scheduleAssignmentId) {
    return {
      type: "schedule",
      scheduleAssignmentId: assignment.scheduleAssignmentId,
      weekId,
    };
  }

  return null;
}

/** Map schedule_assignments row → shape expected by ScheduleRow / AssignedCard. */
export function assignmentFromSnapshot(row, { liveIds = null } = {}) {
  if (!row) return null;
  const inUseUnitId = row.in_use_unit_id ?? null;
  const isArchived =
    inUseUnitId == null ||
    (liveIds != null && !liveIds.has(String(inUseUnitId)));
  return {
    id: row.id,
    scheduleAssignmentId: row.id,
    inUseUnitId,
    isArchived,
    driver: {
      id: row.driverid,
      name: row.driver_name ?? "",
      phone: row.driver_phone ?? "",
      user: row.driver_user ?? "",
      pass: row.driver_pass ?? "",
      pin: row.driver_pin ?? "",
      division: row.driver_division ?? "",
    },
    unit: {
      id: row.unitid,
      unit: row.unit_label ?? "",
      petro: row.unit_petro ?? "",
      petroPIN: row.unit_petro_pin ?? "",
      ufa: row.unit_ufa ?? "",
      ufaPIN: row.unit_ufa_pin ?? "",
    },
  };
}

/** Live in_use_units row plus week assignment id when present. */
export function assignmentFromLive(inUseRow, scheduleAssignmentId = null) {
  if (!inUseRow?.driver || !inUseRow?.unit) return null;
  return {
    id: inUseRow.id,
    scheduleAssignmentId,
    inUseUnitId: inUseRow.id,
    isArchived: false,
    driver: inUseRow.driver,
    unit: inUseRow.unit,
  };
}

function liveAssignedRowById(liveAssigned, id) {
  if (id == null || String(id).trim() === "") return null;
  const key = String(id);
  const row = (liveAssigned ?? []).find(
    (entry) => entry?.id != null && String(entry.id) === key,
  );
  if (!row?.driver || !row?.unit) return null;
  return row;
}

/** Live-board id when this row can be vacated (unit still on in_use_units). */
export function resolveVacatableInUseUnitId(assignment, liveAssigned = []) {
  const direct = assignment?.inUseUnitId;
  const byId = liveAssignedRowById(liveAssigned, direct);
  if (byId) return byId.id;

  const driverId = assignment?.driver?.id;
  const unitId = assignment?.unit?.id;
  if (driverId == null || unitId == null) return null;

  const byDriverUnit = (liveAssigned ?? []).find(
    (row) =>
      row?.driver &&
      row?.unit &&
      String(row.driverid ?? row.driver?.id) === String(driverId) &&
      String(row.unitid ?? row.unit?.id) === String(unitId),
  );
  return byDriverUnit?.id ?? null;
}

export function loadBelongsToAssignment(load, assignment) {
  if (!load || !assignment) return false;
  if (assignment.scheduleAssignmentId) {
    return (
      String(load.schedule_assignment_id ?? "") ===
      String(assignment.scheduleAssignmentId)
    );
  }
  return String(load.in_use_unit_id ?? "") === String(assignment.id);
}
