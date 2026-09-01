import { kmToMiles } from "@/lib/revenuePerKm";
import { weekDayLabels } from "@/lib/weekDates";

/** Match Motive vehicle.number to schedule unit labels ("75", "Unit 75", "075"). */
export function normalizeUnitNumber(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  const digits = s.replace(/[^0-9]/g, "");
  if (digits) return String(Number(digits));
  return s;
}

function isoDateFromTimestamp(raw) {
  if (raw == null) return "";
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Weekly miles per unit: odometer delta per calendar day, then sum those days.
 * @returns {Record<string, number>}
 */
export function sumWeekMilesByUnit(rawPeriods, weekStartISO) {
  const weekDays = new Set(
    weekDayLabels(weekStartISO).map((d) => d.iso).filter(Boolean),
  );
  /** @type {Map<string, Map<string, { minStart: number, maxEnd: number }>>} */
  const byUnitDay = new Map();

  for (const item of rawPeriods ?? []) {
    const period = item?.driving_period ?? item;
    if (!period) continue;
    const vehicle = period.vehicle ?? {};
    const unitKey = normalizeUnitNumber(vehicle.number);
    if (!unitKey) continue;

    const dayIso = isoDateFromTimestamp(period.start_time);
    if (!weekDays.has(dayIso)) continue;

    const startKm = Number(period.start_kilometers);
    const endKm = Number(period.end_kilometers);
    if (!Number.isFinite(startKm) && !Number.isFinite(endKm)) continue;

    let unitDays = byUnitDay.get(unitKey);
    if (!unitDays) {
      unitDays = new Map();
      byUnitDay.set(unitKey, unitDays);
    }
    const prev = unitDays.get(dayIso) ?? {
      minStart: Number.POSITIVE_INFINITY,
      maxEnd: Number.NEGATIVE_INFINITY,
    };
    if (Number.isFinite(startKm)) {
      prev.minStart = Math.min(prev.minStart, startKm);
    }
    if (Number.isFinite(endKm)) {
      prev.maxEnd = Math.max(prev.maxEnd, endKm);
    } else if (Number.isFinite(startKm)) {
      prev.maxEnd = Math.max(prev.maxEnd, startKm);
    }
    unitDays.set(dayIso, prev);
  }

  /** @type {Record<string, number>} */
  const milesByUnit = {};
  for (const [unitKey, unitDays] of byUnitDay) {
    let km = 0;
    for (const day of unitDays.values()) {
      if (
        Number.isFinite(day.minStart) &&
        Number.isFinite(day.maxEnd) &&
        day.maxEnd > day.minStart
      ) {
        km += day.maxEnd - day.minStart;
      }
    }
    if (km <= 0) continue;
    milesByUnit[unitKey] = Math.round(kmToMiles(km));
  }
  return milesByUnit;
}

export function formatWeekMiles(miles) {
  if (miles == null || !Number.isFinite(miles)) return "";
  return `${new Intl.NumberFormat("en-CA", { maximumFractionDigits: 0 }).format(miles)} mi`;
}
