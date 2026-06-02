import { calcOptionsFromScheduleLoad } from "@/lib/loadCategory";
import { computeLoadTotalDisplay, parseMetricNum } from "@/lib/loadTotal";

function parseLoadTotalNumber(loadTotalRaw) {
  if (loadTotalRaw == null || String(loadTotalRaw).trim() === "") return null;
  const n = Number(String(loadTotalRaw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/** Revenue for one schedule_loads row (stored total, else compute from slot fields only). */
export function resolveLoadRevenue(load) {
  const stored = parseLoadTotalNumber(load?.load_total);
  if (stored != null) return stored;

  const opts = calcOptionsFromScheduleLoad(load);
  const computed = computeLoadTotalDisplay(
    load?.mt,
    load?.rate,
    load?.fsc,
    {
      ...opts,
      kms: load?.kms,
    },
  );
  return parseLoadTotalNumber(computed);
}

/** Sum revenue for all loads assigned to one in-use unit for the week. */
export function sumWeekUnitRevenue(unitLoads) {
  let sum = 0;
  for (const load of unitLoads ?? []) {
    const n = resolveLoadRevenue(load);
    if (n != null) sum += n;
  }
  return sum;
}

/** KMs for one schedule row (slot-owned). */
export function resolveLoadKms(load) {
  return parseMetricNum(load?.kms);
}

/** Invoiced for one schedule row (slot-owned). */
export function resolveLoadInvoiced(load) {
  if (load != null && Object.prototype.hasOwnProperty.call(load, "invoiced")) {
    return Boolean(load.invoiced);
  }
  return false;
}

/** Sum KMs for all week loads on a unit row. */
export function sumWeekUnitKms(unitLoads) {
  let sum = 0;
  for (const load of unitLoads ?? []) {
    const k = resolveLoadKms(load);
    if (k != null) sum += k;
  }
  return sum;
}
