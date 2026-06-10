/** Local calendar date as YYYY-MM-DD (avoids UTC shift for date-only values). */
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as local noon (stable across DST). */
export function parseISODateLocal(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
  x.setDate(x.getDate() + n);
  return x;
}

/** e.g. "Sunday (22)" for schedule column headers. */
export function dayColumnTitle(iso) {
  const day = parseISODateLocal(iso);
  const weekday = day.toLocaleDateString(undefined, { weekday: "long" });
  const num = day.getDate();
  return `${weekday} (${num})`;
}

export function weekDayLabels(weekStartISO) {
  const start = parseISODateLocal(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    const iso = toISODate(day);
    return {
      iso,
      label: day.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      columnTitle: dayColumnTitle(iso),
    };
  });
}

/** Last calendar day of the week (weekStart + 6 days), as YYYY-MM-DD. */
export function weekEndISO(weekStartISO) {
  if (!weekStartISO) return null;
  return toISODate(addDays(parseISODateLocal(weekStartISO), 6));
}

/** True when dateISO falls in the 7-day span starting weekStartISO (inclusive). */
export function weekContainsDate(weekStartISO, dateISO) {
  if (!weekStartISO || !dateISO) return false;
  const start = parseISODateLocal(weekStartISO);
  const date = parseISODateLocal(dateISO);
  const end = addDays(start, 6);
  return date >= start && date <= end;
}

/** True when the week has ended (today is after its last day). */
export function weekIsComplete(weekStartISO, todayISO = toISODate(new Date())) {
  const end = weekEndISO(weekStartISO);
  if (!end || !todayISO) return false;
  return todayISO > end;
}

/**
 * Current and future weeks accept new live-board assignments on the schedule.
 * Completed (past) weeks only show units already recorded for that week.
 */
export function weekAcceptsNewAssignments(
  weekStartISO,
  todayISO = toISODate(new Date()),
) {
  return !weekIsComplete(weekStartISO, todayISO);
}

/** Id of the schedule week whose range contains dateISO (latest start if overlap). */
export function findWeekIdContainingDate(weeks, dateISO = toISODate(new Date())) {
  let best = null;
  for (const w of weeks ?? []) {
    const start = w?.week_start_date;
    if (!start || !weekContainsDate(start, dateISO)) continue;
    if (!best || start > best.week_start_date) best = w;
  }
  return best?.id ?? null;
}

function fallbackWeekId(weeks, todayISO = toISODate(new Date())) {
  const sorted = [...(weeks ?? [])].sort((a, b) =>
    String(b.week_start_date).localeCompare(String(a.week_start_date)),
  );
  const started = sorted.find((w) => String(w.week_start_date) <= todayISO);
  if (started?.id) return started.id;
  return sorted[sorted.length - 1]?.id ?? sorted[0]?.id ?? null;
}

/** Default active week: containing today, else latest week that has started. */
export function resolveDefaultScheduleWeekId(weeks, selectedWeekId) {
  if (!weeks?.length) return null;
  if (selectedWeekId && weeks.some((w) => w.id === selectedWeekId)) {
    return selectedWeekId;
  }
  return findWeekIdContainingDate(weeks) ?? fallbackWeekId(weeks);
}
