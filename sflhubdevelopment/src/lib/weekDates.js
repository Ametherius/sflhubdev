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

export function weekDayLabels(weekStartISO) {
  const start = parseISODateLocal(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    return {
      iso: toISODate(day),
      label: day.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    };
  });
}
