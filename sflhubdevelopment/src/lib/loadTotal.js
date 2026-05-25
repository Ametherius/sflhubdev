import {
  computeLoadTotalDisplay as computeByCategory,
  normalizeLoadCategory,
} from "@/lib/loadCategory";

/** Parse MT / rate / FSC style numeric strings (commas allowed). */
export function parseMetricNum(s) {
  const t = String(s ?? "")
    .replace(/,/g, "")
    .trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * CAD total for schedule / sheets.
 * Fourth argument: legacy `flatRate` boolean, or options
 * `{ loadCategory, usdCadRate, flatRate }`.
 */
export function computeLoadTotalDisplay(mt, rate, fsc, fourth = {}) {
  if (typeof fourth === "boolean") {
    return computeByCategory({ mt, rate, fsc, flatRate: fourth });
  }
  const opts = fourth && typeof fourth === "object" ? fourth : {};
  return computeByCategory({
    mt,
    rate,
    fsc,
    loadCategory: opts.loadCategory,
    usdCadRate: opts.usdCadRate,
    flatRate: opts.flatRate,
  });
}

export { normalizeLoadCategory };

const CAD_TOTAL_FORMAT = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Narrower CAD string for small grid cells (narrow symbol, trim unnecessary decimals). */
const CAD_GRID_FORMAT = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function parseLoadTotalNumber(loadTotalRaw) {
  if (loadTotalRaw == null || String(loadTotalRaw).trim() === "") return null;
  const n = Number(String(loadTotalRaw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/** Formats a numeric total string (from {@link computeLoadTotalDisplay}) for CAD display only. */
export function formatLoadTotalCad(loadTotalRaw) {
  const n = parseLoadTotalNumber(loadTotalRaw);
  if (n == null) return "";
  return CAD_TOTAL_FORMAT.format(n);
}

/** Shorter CAD for schedule load cells (same currency, less horizontal space). */
export function formatLoadTotalCadGrid(loadTotalRaw) {
  const n = parseLoadTotalNumber(loadTotalRaw);
  if (n == null) return "";
  return CAD_GRID_FORMAT.format(n);
}

const USD_TOTAL_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdTotal(usdTotalRaw) {
  const n = parseLoadTotalNumber(usdTotalRaw);
  if (n == null) return "";
  return USD_TOTAL_FORMAT.format(n);
}
