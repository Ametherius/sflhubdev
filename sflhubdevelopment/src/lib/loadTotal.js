/** Parse MT / rate / FSC style numeric strings (commas allowed). */
export function parseMetricNum(s) {
  const t = String(s ?? "")
    .replace(/,/g, "")
    .trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Total = MT × rate; if FSC is non-empty, total = MT × rate × FSC (FSC as multiplier). */
export function computeLoadTotalDisplay(mt, rate, fsc) {
  const m = parseMetricNum(mt);
  const r = parseMetricNum(rate);
  if (m == null || r == null) return "";
  const base = m * r;
  const fRaw = String(fsc ?? "").trim();
  const f = parseMetricNum(fsc);
  let total = base;
  if (fRaw !== "" && f != null) {
    total = base * f;
  }
  const rounded = Math.round(total * 100) / 100;
  return String(rounded);
}

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
