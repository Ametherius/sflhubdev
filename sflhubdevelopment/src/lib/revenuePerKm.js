import { calcOptionsFromSheet } from "@/lib/loadCategory";
import { computeLoadTotalDisplay, parseMetricNum } from "@/lib/loadTotal";

function parseLoadTotalNumber(loadTotalRaw) {
  if (loadTotalRaw == null || String(loadTotalRaw).trim() === "") return null;
  const n = Number(String(loadTotalRaw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

const CAD_PER_KM_FORMAT = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Parse KMs (commas allowed). */
export function parseKms(kms) {
  return parseMetricNum(kms);
}

/** Revenue ÷ KMs when both are valid and KMs &gt; 0. */
export function computeRevenuePerKm(revenue, kms) {
  const r =
    typeof revenue === "number" && Number.isFinite(revenue)
      ? revenue
      : parseLoadTotalNumber(revenue);
  const k = parseKms(kms);
  if (r == null || k == null || k <= 0) return null;
  return Math.round((r / k) * 100) / 100;
}

export function formatRevenuePerKmCad(revenuePerKm) {
  if (revenuePerKm == null || !Number.isFinite(revenuePerKm)) return "";
  return `${CAD_PER_KM_FORMAT.format(revenuePerKm)}/mi`;
}

/** Revenue from a loadsheets library row (MT/rate/FSC/flat rate). */
export function loadsheetRevenue(sheet) {
  if (!sheet) return null;
  const total = computeLoadTotalDisplay(
    sheet.mt,
    sheet.rate,
    sheet.fsc,
    calcOptionsFromSheet(sheet),
  );
  return parseLoadTotalNumber(total);
}

export function formatLoadsheetRevenuePerKm(sheet) {
  const rev = loadsheetRevenue(sheet);
  const perKm = computeRevenuePerKm(rev, sheet?.kms);
  return formatRevenuePerKmCad(perKm);
}

/** Week revenue ÷ sum of KMs from linked loadsheets on schedule rows. */
export function formatWeekRevenuePerKm(totalRevenue, totalKms) {
  const perKm = computeRevenuePerKm(totalRevenue, totalKms);
  if (perKm == null) return "—";
  return formatRevenuePerKmCad(perKm);
}

export function kmToMiles(kms) {
  const kmsToMiles = kms * 0.621371;
  return kmsToMiles;
}
