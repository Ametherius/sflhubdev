/** PostgREST / Postgres errors when schedule_loads.week_id is not in schedule_weeks. */
import { weekIsComplete } from "@/lib/weekDates";

export function isScheduleWeekFkError(message) {
  return /schedule_loads_week_id_fkey|week_id.*foreign key/i.test(
    message ?? "",
  );
}

export function scheduleLoadErrorMessage(message) {
  if (isScheduleWeekFkError(message)) {
    return "That schedule week no longer exists. Pick another week from the dropdown or create a new week, then try again.";
  }
  return message ?? "Could not save load.";
}

/** Normalize create_schedule_week / RPC uuid return shapes. */
export function normalizeRpcUuid(data) {
  if (data == null) return null;
  if (Array.isArray(data)) return normalizeRpcUuid(data[0]);
  if (typeof data === "string") {
    const t = data.trim();
    return t.length ? t : null;
  }
  if (typeof data === "object" && data.id != null) {
    return String(data.id);
  }
  return null;
}

function isoDateKey(raw) {
  if (raw == null) return "";
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Columns returned after save so the UI can update without waiting on a full refetch. */
export const SCHEDULE_LOAD_RETURN_SELECT =
  "id, week_id, load_date, load_slot_id, in_use_unit_id, schedule_assignment_id, load_note, origin, end_user, mt, rate, fsc, load_total, loadsheet_id, load_number, kms, invoiced, load_category, usd_cad_rate, field_text_colors";

/**
 * Update an existing schedule_loads row, or ensure scaffold rows then update/insert.
 * Avoids client inserts with a missing week_id (schedule_loads_week_id_fkey).
 * Completed weeks skip ensure_schedule_loads_for_week so live-board units are not added retroactively.
 */
export async function persistScheduleLoad(supabase, {
  scheduleLoadId,
  weekId,
  weekStartISO = null,
  loadDate,
  loadSlotId,
  inUseUnitId,
  scheduleAssignmentId = null,
  payload,
}) {
  if (scheduleLoadId) {
    const { data, error } = await supabase
      .from("schedule_loads")
      .update(payload)
      .eq("id", scheduleLoadId)
      .select(SCHEDULE_LOAD_RETURN_SELECT)
      .single();
    return { data, error };
  }

  const wk = weekId != null ? String(weekId).trim() : "";
  const slotId = loadSlotId != null ? String(loadSlotId).trim() : "";
  const unitId = inUseUnitId != null ? String(inUseUnitId).trim() : "";
  const assignmentId =
    scheduleAssignmentId != null ? String(scheduleAssignmentId).trim() : "";
  const dayIso = isoDateKey(loadDate);

  if (!wk || !slotId || !dayIso) {
    return {
      error: { message: "Missing week, day, or slot — cannot save this load." },
    };
  }
  if (!unitId && !assignmentId) {
    return {
      error: {
        message: "Missing unit or assignment — cannot save this load.",
      },
    };
  }

  const { data: weekRow, error: weekErr } = await supabase
    .from("schedule_weeks")
    .select("id, week_start_date")
    .eq("id", wk)
    .maybeSingle();

  if (weekErr) return { error: weekErr };
  if (!weekRow?.id) {
    return {
      error: {
        message: scheduleLoadErrorMessage("schedule_loads_week_id_fkey"),
      },
    };
  }

  const weekComplete = weekIsComplete(
    weekStartISO ?? weekRow.week_start_date ?? null,
  );

  if (!weekComplete) {
    const { error: ensureErr } = await supabase.rpc(
      "ensure_schedule_loads_for_week",
      { p_week_id: wk },
    );
    if (
      ensureErr &&
      !/load_slot_id|in_use_unit_id|column .* does not exist|function .* does not exist/i.test(
        ensureErr.message ?? "",
      )
    ) {
      return { error: ensureErr };
    }
  }

  let findQuery = supabase
    .from("schedule_loads")
    .select("id")
    .eq("week_id", wk)
    .eq("load_date", dayIso)
    .eq("load_slot_id", slotId);

  if (unitId) {
    findQuery = findQuery.eq("in_use_unit_id", unitId);
  } else {
    findQuery = findQuery.eq("schedule_assignment_id", assignmentId);
  }

  const { data: existing, error: findErr } = await findQuery.maybeSingle();

  if (findErr) return { error: findErr };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("schedule_loads")
      .update(payload)
      .eq("id", existing.id)
      .select(SCHEDULE_LOAD_RETURN_SELECT)
      .single();
    return { data, error };
  }

  const insertRow = {
    week_id: wk,
    load_date: dayIso,
    load_slot_id: slotId,
    ...payload,
  };
  if (unitId) insertRow.in_use_unit_id = unitId;
  if (assignmentId) insertRow.schedule_assignment_id = assignmentId;

  const { data, error } = await supabase
    .from("schedule_loads")
    .insert(insertRow)
    .select(SCHEDULE_LOAD_RETURN_SELECT)
    .single();
  return { data, error };
}
