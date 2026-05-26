import { calcOptionsFromSheet } from "@/lib/loadCategory";
import { computeLoadTotalDisplay, parseMetricNum } from "@/lib/loadTotal";

function parseLoadTotalNumber(loadTotalRaw) {
  if (loadTotalRaw == null || String(loadTotalRaw).trim() === "") return null;
  const n = Number(String(loadTotalRaw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function sheetsById(loadSheets) {
  const m = new Map();
  for (const sheet of loadSheets ?? []) {
    m.set(String(sheet.id), sheet);
  }
  return m;
}

/** Revenue for one schedule_loads row (stored total, else compute from slot + loadsheet). */
export function resolveLoadRevenue(load, sheetsMap) {
  const stored = parseLoadTotalNumber(load?.load_total);
  if (stored != null) return stored;

  const sheetId = load?.loadsheet_id;
  const sheet =
    sheetId != null && String(sheetId).length > 0
      ? sheetsMap.get(String(sheetId))
      : null;

  const mt = load?.mt ?? sheet?.mt;
  const rate = load?.rate ?? sheet?.rate;
  const fsc = load?.fsc ?? sheet?.fsc;
  const computed = computeLoadTotalDisplay(mt, rate, fsc, calcOptionsFromSheet(sheet));
  return parseLoadTotalNumber(computed);
}

/** Sum revenue for all loads assigned to one in-use unit for the week. */
export function sumWeekUnitRevenue(unitLoads, loadSheets) {
  const map = sheetsById(loadSheets);
  let sum = 0;
  for (const load of unitLoads ?? []) {
    const n = resolveLoadRevenue(load, map);
    if (n != null) sum += n;
  }
  return sum;
}

/** KMs for one schedule row (per-slot value, else linked loadsheet for legacy rows). */
export function resolveLoadKms(load, sheetsMap) {
  if (load != null && Object.prototype.hasOwnProperty.call(load, "kms")) {
    const rowKms = parseMetricNum(load.kms);
    if (rowKms != null) return rowKms;
  }
  const sheetId = load?.loadsheet_id;
  if (sheetId == null || String(sheetId).length === 0) return null;
  const sheet = sheetsMap.get(String(sheetId));
  return parseMetricNum(sheet?.kms);
}

/** Invoiced for one schedule row (per-slot; legacy rows fall back to loadsheet). */
export function resolveLoadInvoiced(load, sheetsMap) {
  if (load != null && Object.prototype.hasOwnProperty.call(load, "invoiced")) {
    return Boolean(load.invoiced);
  }
  const sheetId = load?.loadsheet_id;
  if (sheetId == null || String(sheetId).length === 0) return false;
  const sheet = sheetsMap.get(String(sheetId));
  return Boolean(sheet?.invoiced);
}

/** Sum KMs for all week loads that reference a loadsheet with KMs set. */
export function sumWeekUnitKms(unitLoads, loadSheets) {
  const map = sheetsById(loadSheets);
  let sum = 0;
  for (const load of unitLoads ?? []) {
    const k = resolveLoadKms(load, map);
    if (k != null) sum += k;
  }
  return sum;
}
