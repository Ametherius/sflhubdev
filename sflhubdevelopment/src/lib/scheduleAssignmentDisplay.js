/** Map schedule_assignments row → shape expected by ScheduleRow / AssignedCard. */
export function assignmentFromSnapshot(row, { liveIds = null } = {}) {
  if (!row) return null;
  const inUseUnitId = row.in_use_unit_id ?? null;
  const isWeekOnly = row.week_only === true;
  const isArchived =
    !isWeekOnly &&
    (inUseUnitId == null ||
      (liveIds != null &&
        inUseUnitId != null &&
        !liveIds.has(String(inUseUnitId))));
  return {
    id: row.id,
    scheduleAssignmentId: row.id,
    inUseUnitId,
    isWeekOnly,
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
    isWeekOnly: false,
    isArchived: false,
    driver: inUseRow.driver,
    unit: inUseRow.unit,
  };
}

export function loadBelongsToAssignment(load, assignment) {
  if (!load || !assignment) return false;
  if (assignment.scheduleAssignmentId) {
    if (
      String(load.schedule_assignment_id ?? "") ===
      String(assignment.scheduleAssignmentId)
    ) {
      return true;
    }
    if (
      load.schedule_assignment_id == null &&
      assignment.inUseUnitId != null &&
      String(load.in_use_unit_id ?? "") === String(assignment.inUseUnitId)
    ) {
      return true;
    }
    return false;
  }
  return String(load.in_use_unit_id ?? "") === String(assignment.id);
}
