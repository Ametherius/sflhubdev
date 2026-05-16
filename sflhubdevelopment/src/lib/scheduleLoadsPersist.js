/** PostgREST / Postgres errors when schedule_loads.week_id is not in schedule_weeks. */
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

/**
 * Update an existing schedule_loads row, or ensure scaffold rows then update/insert.
 * Avoids client inserts with a missing week_id (schedule_loads_week_id_fkey).
 */
export async function persistScheduleLoad(supabase, {
  scheduleLoadId,
  weekId,
  loadDate,
  loadSlotId,
  inUseUnitId,
  payload,
}) {
  if (scheduleLoadId) {
    const { error } = await supabase
      .from("schedule_loads")
      .update(payload)
      .eq("id", scheduleLoadId);
    return { error };
  }

  const wk = weekId != null ? String(weekId).trim() : "";
  const slotId = loadSlotId != null ? String(loadSlotId).trim() : "";
  const unitId = inUseUnitId != null ? String(inUseUnitId).trim() : "";
  const dayIso = isoDateKey(loadDate);

  if (!wk || !slotId || !dayIso || !unitId) {
    return {
      error: { message: "Missing week, day, slot, or unit — cannot save this load." },
    };
  }

  const { data: weekRow, error: weekErr } = await supabase
    .from("schedule_weeks")
    .select("id")
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

  const { data: existing, error: findErr } = await supabase
    .from("schedule_loads")
    .select("id")
    .eq("week_id", wk)
    .eq("load_date", dayIso)
    .eq("load_slot_id", slotId)
    .eq("in_use_unit_id", unitId)
    .maybeSingle();

  if (findErr) return { error: findErr };

  if (existing?.id) {
    const { error } = await supabase
      .from("schedule_loads")
      .update(payload)
      .eq("id", existing.id);
    return { error };
  }

  const { error } = await supabase.from("schedule_loads").insert({
    week_id: wk,
    load_date: dayIso,
    load_slot_id: slotId,
    in_use_unit_id: unitId,
    ...payload,
  });
  return { error };
}
