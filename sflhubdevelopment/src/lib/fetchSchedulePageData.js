import { resolveDefaultScheduleWeekId } from "@/lib/weekDates";

const WEEK_SELECT = "id, week_start_date, created_at";

const ASSIGN_SELECT =
  "id, driverid, unitid, driver: driverid (id, name, phone, user, pass, pin, division), unit: unitid (id, unit, petro, petroPIN, ufa, ufaPIN)";

const ASSIGNMENT_SELECT =
  "id, week_id, in_use_unit_id, week_only, driverid, unitid, driver_name, driver_phone, driver_user, driver_pass, driver_pin, driver_division, unit_label, unit_petro, unit_petro_pin, unit_ufa, unit_ufa_pin";

const LOAD_SELECT =
  "id, week_id, load_date, load_slot_id, in_use_unit_id, schedule_assignment_id, load_note, origin, end_user, mt, rate, load_total, loadsheet_id, load_number, fsc, kms, invoiced, load_category, usd_cad_rate, field_text_colors";

const LOAD_SELECT_NO_COLORS =
  "id, week_id, load_date, load_slot_id, in_use_unit_id, schedule_assignment_id, load_note, origin, end_user, mt, rate, load_total, loadsheet_id, load_number, fsc, kms, invoiced, load_category, usd_cad_rate";

const SLOT_SELECT = "id, sort_order, name, label";
const SCHEDULE_SLOT_COUNT = 3;

function takeCanonicalScheduleSlots(rows) {
  const list = rows ?? [];
  const hasSort = list.some((r) => r.sort_order != null);
  const sorted = [...list].sort((a, b) => {
    if (hasSort) {
      const o = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
      if (o !== 0) return o;
    }
    return String(a.id).localeCompare(String(b.id));
  });
  return sorted.slice(0, SCHEDULE_SLOT_COUNT);
}

function mergeLoadSlotsById(loadRows, slotRows) {
  const slotMap = new Map();
  for (const s of slotRows ?? []) {
    slotMap.set(s.id, s);
  }
  return (loadRows ?? []).map((row) => ({
    ...row,
    load_slots: slotMap.get(row.load_slot_id) ?? null,
  }));
}

function exclusionIds(rows) {
  return (rows ?? [])
    .map((r) => (r.in_use_unit_id != null ? String(r.in_use_unit_id) : null))
    .filter(Boolean);
}

/**
 * First-paint schedule payload: weeks, live board, slots, and the default week's
 * loads/assignments. Does not call ensure RPCs or Motive.
 */
export async function fetchSchedulePageData(supabase) {
  const [weeksRes, assignedRes, slotsRes] = await Promise.all([
    supabase
      .from("schedule_weeks")
      .select(WEEK_SELECT)
      .order("week_start_date", { ascending: false }),
    supabase.from("in_use_units").select(ASSIGN_SELECT),
    supabase.from("load_slots").select(SLOT_SELECT).order("sort_order", {
      ascending: true,
    }),
  ]);

  const weeks = weeksRes.data ?? [];
  const assigned = assignedRes.data ?? [];
  const allSlots = slotsRes.data ?? [];
  const loadSlots = takeCanonicalScheduleSlots(allSlots);
  const weekId = resolveDefaultScheduleWeekId(weeks, null);

  if (!weekId) {
    return {
      weeks,
      assigned,
      loadSlots,
      weekId: null,
      loads: [],
      snapshots: [],
      exclusions: [],
    };
  }

  let loadsQuery = supabase
    .from("schedule_loads")
    .select(LOAD_SELECT)
    .eq("week_id", weekId)
    .order("load_date", { ascending: true })
    .order("load_slot_id", { ascending: true });

  const [loadsRes, snapsRes, exclRes] = await Promise.all([
    loadsQuery,
    supabase
      .from("schedule_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("week_id", weekId),
    supabase
      .from("schedule_week_unit_exclusions")
      .select("in_use_unit_id")
      .eq("week_id", weekId),
  ]);

  let loadRows = loadsRes.data ?? [];
  if (
    loadsRes.error &&
    /field_text_colors/i.test(loadsRes.error.message ?? "") &&
    /does not exist/i.test(loadsRes.error.message ?? "")
  ) {
    const retry = await supabase
      .from("schedule_loads")
      .select(LOAD_SELECT_NO_COLORS)
      .eq("week_id", weekId)
      .order("load_date", { ascending: true })
      .order("load_slot_id", { ascending: true });
    loadRows = retry.data ?? [];
  } else if (loadsRes.error) {
    loadRows = [];
  }

  return {
    weeks,
    assigned,
    loadSlots,
    weekId,
    loads: mergeLoadSlotsById(loadRows, allSlots),
    snapshots: snapsRes.data ?? [],
    exclusions: exclusionIds(exclRes.data),
  };
}
