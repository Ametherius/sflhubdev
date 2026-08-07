/** Logical planner_slots fields → possible Supabase column names (first match wins). */
export const PLANNER_SLOT_FIELD_ALIASES = {
  broker: ["broker_id", "brokers", "broker"],
  week: ["week_id", "schedule_weeks", "weeks"],
  planDate: ["plan_date", "load_date", "slot_date", "day_date"],
  sortOrder: ["sort_order", "sort_oder", "slot_order"],
  origin: ["origin"],
  endUser: ["end_user", "enduser"],
  unitNumber: ["unit_number", "unit"],
  driverName: ["driver_name", "driver"],
  dispatched: ["dispatched"],
  unloaded: ["unloaded"],
  completed: ["completed"],
  rejected: ["rejected"],
};

const CANONICAL_DEFAULTS = {
  broker: "broker_id",
  week: "week_id",
  planDate: "plan_date",
  sortOrder: "sort_order",
  origin: "origin",
  endUser: "end_user",
  unitNumber: "unit_number",
  driverName: "driver_name",
  dispatched: "dispatched",
  unloaded: "unloaded",
  completed: "completed",
  rejected: "rejected",
};

export const PLANNER_SLOTS_PER_DAY = 4;

function pickColumn(sample, aliases, fallback) {
  if (sample && typeof sample === "object") {
    const hit = aliases.find((key) => key in sample);
    if (hit) return hit;
  }
  return fallback;
}

/** Resolve DB column names from an existing row (or canonical defaults). */
export function plannerSlotColumns(sampleSlot = null, overrides = null) {
  if (overrides) {
    return { ...CANONICAL_DEFAULTS, ...overrides };
  }
  return {
    broker: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.broker,
      CANONICAL_DEFAULTS.broker,
    ),
    week: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.week,
      CANONICAL_DEFAULTS.week,
    ),
    planDate: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.planDate,
      CANONICAL_DEFAULTS.planDate,
    ),
    sortOrder: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.sortOrder,
      CANONICAL_DEFAULTS.sortOrder,
    ),
    origin: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.origin,
      CANONICAL_DEFAULTS.origin,
    ),
    endUser: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.endUser,
      CANONICAL_DEFAULTS.endUser,
    ),
    unitNumber: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.unitNumber,
      CANONICAL_DEFAULTS.unitNumber,
    ),
    driverName: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.driverName,
      CANONICAL_DEFAULTS.driverName,
    ),
    dispatched: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.dispatched,
      CANONICAL_DEFAULTS.dispatched,
    ),
    unloaded: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.unloaded,
      CANONICAL_DEFAULTS.unloaded,
    ),
    completed: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.completed,
      CANONICAL_DEFAULTS.completed,
    ),
    rejected: pickColumn(
      sampleSlot,
      PLANNER_SLOT_FIELD_ALIASES.rejected,
      CANONICAL_DEFAULTS.rejected,
    ),
  };
}

/**
 * Resolve planner_slots column names with as few round-trips as possible.
 * Prefer an existing row sample; otherwise one select of canonical columns.
 */
export async function detectPlannerSlotColumns(
  supabase,
  { sampleSlot = null } = {},
) {
  if (sampleSlot && typeof sampleSlot === "object") {
    const columns = plannerSlotColumns(sampleSlot);
    const missing = ["broker", "week", "planDate"]
      .filter((logical) => !(columns[logical] in sampleSlot))
      .map((logical) => CANONICAL_DEFAULTS[logical]);
    return {
      columns,
      schemaReady: missing.length === 0,
      missing,
    };
  }

  const canonicalCols = [...new Set(Object.values(CANONICAL_DEFAULTS))];
  const { error: canonicalError } = await supabase
    .from("planner_slots")
    .select(canonicalCols.join(", "))
    .limit(1);

  if (!canonicalError) {
    return {
      columns: plannerSlotColumns(),
      schemaReady: true,
      missing: [],
    };
  }

  // Fallback: probe aliases only when the canonical set is incomplete.
  const resolved = {};
  const missing = [];

  for (const [logical, aliases] of Object.entries(PLANNER_SLOT_FIELD_ALIASES)) {
    let found = null;
    for (const col of aliases) {
      const { error } = await supabase
        .from("planner_slots")
        .select(col)
        .limit(1);
      if (!error) {
        found = col;
        break;
      }
    }
    resolved[logical] = found ?? CANONICAL_DEFAULTS[logical];
    if (!found && ["broker", "week", "planDate"].includes(logical)) {
      missing.push(CANONICAL_DEFAULTS[logical]);
    }
  }

  return {
    columns: plannerSlotColumns(null, resolved),
    schemaReady: missing.length === 0,
    missing,
  };
}

export function plannerSlotSchemaErrorMessage(missing = []) {
  const cols = missing.length ? missing.join(", ") : "broker_id, week_id, plan_date";
  return (
    `Planner table is missing column(s): ${cols}. ` +
    "Run supabase/migrations/20260630120000_planner_slots_schema.sql in the Supabase SQL editor, then reload."
  );
}

export function readSlotBrokerId(slot, cols = plannerSlotColumns(slot)) {
  return slot?.[cols.broker] ?? null;
}

export function readSlotWeekId(slot, cols = plannerSlotColumns(slot)) {
  return slot?.[cols.week] ?? null;
}

export function readSlotPlanDate(slot, cols = plannerSlotColumns(slot)) {
  const raw = slot?.[cols.planDate];
  if (raw == null) return "";
  return String(raw).slice(0, 10);
}

export function readSlotSortOrder(slot, cols = plannerSlotColumns(slot)) {
  return Number(slot?.[cols.sortOrder]) || 0;
}

export function readSlotUnitNumber(slot, cols = plannerSlotColumns(slot)) {
  const raw = slot?.[cols.unitNumber];
  return raw == null ? "" : String(raw).trim();
}

export function readSlotDriverName(slot, cols = plannerSlotColumns(slot)) {
  const raw = slot?.[cols.driverName];
  return raw == null ? "" : String(raw).trim();
}

export function readSlotDispatched(slot, cols = plannerSlotColumns(slot)) {
  return Boolean(slot?.[cols.dispatched]);
}

export function readSlotUnloaded(slot, cols = plannerSlotColumns(slot)) {
  return Boolean(slot?.[cols.unloaded]);
}

export function readSlotCompleted(slot, cols = plannerSlotColumns(slot)) {
  return Boolean(slot?.[cols.completed]);
}

export function readSlotRejected(slot, cols = plannerSlotColumns(slot)) {
  return Boolean(slot?.[cols.rejected]);
}

/** Highest matching status wins (rejected → completed → unloaded → dispatched → unit). */
export function plannerSlotStatusClass(slot, cols = plannerSlotColumns(slot)) {
  if (readSlotRejected(slot, cols)) {
    return "bg-orange-500 text-white";
  }
  if (readSlotCompleted(slot, cols)) {
    return "bg-gray-500 text-white";
  }
  if (readSlotUnloaded(slot, cols)) {
    return "bg-red-700 text-white";
  }
  if (readSlotDispatched(slot, cols)) {
    return "bg-blue-400 text-white";
  }
  if (readSlotUnitNumber(slot, cols)) {
    return "bg-yellow-500 text-green-950";
  }
  return "bg-white text-green-950";
}

export function buildPlannerSlotInsert(
  { brokerId, weekId, planDate, sortOrder, origin, endUser, unitNumber, driverName },
  cols = plannerSlotColumns(),
) {
  const row = {
    [cols.broker]: brokerId,
    [cols.week]: weekId,
    [cols.planDate]: planDate,
    [cols.sortOrder]: sortOrder,
    [cols.origin]: origin?.length ? origin : null,
    [cols.endUser]: endUser?.length ? endUser : null,
  };
  if (cols.unitNumber) {
    row[cols.unitNumber] = unitNumber?.length ? unitNumber : null;
  }
  if (cols.driverName) {
    row[cols.driverName] = driverName?.length ? driverName : null;
  }
  return row;
}

export function buildPlannerSlotStatusUpdate(
  { unitNumber, driverName, dispatched, unloaded, completed, rejected },
  cols = plannerSlotColumns(),
) {
  return {
    [cols.unitNumber]: unitNumber?.length ? unitNumber : null,
    [cols.driverName]: driverName?.length ? driverName : null,
    [cols.dispatched]: Boolean(dispatched),
    [cols.unloaded]: Boolean(unloaded),
    [cols.completed]: Boolean(completed),
    [cols.rejected]: Boolean(rejected),
  };
}

export function buildPlannerSlotUpdate(
  {
    origin,
    endUser,
    unitNumber,
    driverName,
    dispatched,
    unloaded,
    completed,
    rejected,
  },
  cols = plannerSlotColumns(),
) {
  return {
    [cols.origin]: origin?.length ? origin : null,
    [cols.endUser]: endUser?.length ? endUser : null,
    [cols.unitNumber]: unitNumber?.length ? unitNumber : null,
    [cols.driverName]: driverName?.length ? driverName : null,
    [cols.dispatched]: Boolean(dispatched),
    [cols.unloaded]: Boolean(unloaded),
    [cols.completed]: Boolean(completed),
    [cols.rejected]: Boolean(rejected),
  };
}

/**
 * Insert-only: build empty planner_slots so each broker/day has at least
 * slotsPerDay rows. Never deletes or updates existing slots (extras above
 * slotsPerDay are left alone).
 */
export function buildMissingPlannerSlotsForWeek({
  brokers = [],
  weekId,
  dayIsos = [],
  existingSlots = [],
  slotCols = plannerSlotColumns(),
  slotsPerDay = PLANNER_SLOTS_PER_DAY,
}) {
  if (!weekId || !brokers.length || !dayIsos.length) return [];

  const rows = [];
  for (const broker of brokers) {
    if (!broker?.id) continue;
    for (const planDate of dayIsos) {
      const dayKey = String(planDate).slice(0, 10);
      const daySlots = existingSlots.filter(
        (s) =>
          String(readSlotBrokerId(s, slotCols)) === String(broker.id) &&
          String(readSlotWeekId(s, slotCols)) === String(weekId) &&
          readSlotPlanDate(s, slotCols) === dayKey,
      );
      // Only fill the gap up to slotsPerDay — never remove extras.
      const need = Math.max(0, slotsPerDay - daySlots.length);
      if (need === 0) continue;

      const usedOrders = new Set(
        daySlots.map((s) => readSlotSortOrder(s, slotCols)),
      );
      let next = 1;
      for (let i = 0; i < need; i++) {
        while (usedOrders.has(next)) next += 1;
        rows.push(
          buildPlannerSlotInsert(
            {
              brokerId: broker.id,
              weekId,
              planDate: dayKey,
              sortOrder: next,
              origin: "",
              endUser: "",
            },
            slotCols,
          ),
        );
        usedOrders.add(next);
        next += 1;
      }
    }
  }
  return rows;
}
