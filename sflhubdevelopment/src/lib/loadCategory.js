import { parseMetricNum } from "@/lib/loadTotal";

/** Chicken total uses 556 × FSC + rate. */
export const CHICKEN_FSC_MULTIPLIER = 556;

/** UI + DB storage label; `id` is used only in app logic. */
export const LOAD_CATEGORIES = [
  {
    id: "canadian_grain",
    label: "US/Canadian Grain",
    storage: "Canadian Grain",
  },
  { id: "us_grain", label: "US Grain", storage: "US Grain" },
  { id: "cargill", label: "Cargill", storage: "Cargill" },
  { id: "irm", label: "IRM", storage: "IRM" },
  { id: "chicken", label: "Chicken", storage: "Chicken" },
  { id: "cattle", label: "Cattle", storage: "Cattle" },
  { id: "tanker", label: "Tanker", storage: "Tanker" },
];

export const DEFAULT_LOAD_CATEGORY = "canadian_grain";

const BY_ID = new Map(LOAD_CATEGORIES.map((c) => [c.id, c]));
const VALID_IDS = new Set(BY_ID.keys());

/** Map normalized keys (slug, label, storage) → canonical id. */
const ALIAS_TO_ID = new Map();
for (const c of LOAD_CATEGORIES) {
  ALIAS_TO_ID.set(normalizeKey(c.id), c.id);
  ALIAS_TO_ID.set(normalizeKey(c.label), c.id);
  ALIAS_TO_ID.set(normalizeKey(c.storage), c.id);
}
ALIAS_TO_ID.set(normalizeKey("us grain"), "us_grain");

function normalizeKey(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Canonical category id for formulas (accepts DB label, slug, or legacy slug).
 * @returns {string}
 */
export function normalizeLoadCategory(loadCategory, flatRate = false) {
  const key = normalizeKey(loadCategory);
  if (key && ALIAS_TO_ID.has(key)) {
    return ALIAS_TO_ID.get(key);
  }
  if (Boolean(flatRate)) return "legacy_flat";
  return DEFAULT_LOAD_CATEGORY;
}

/** Value written to loadsheets.load_category (human-readable). */
export function loadCategoryStorageValue(categoryId) {
  if (categoryId === "legacy_flat") return null;
  return (
    BY_ID.get(categoryId)?.storage ?? BY_ID.get(DEFAULT_LOAD_CATEGORY).storage
  );
}

/** Read DB text into canonical id. */
export function loadCategoryFromStorage(stored) {
  if (stored == null || String(stored).trim() === "") {
    return DEFAULT_LOAD_CATEGORY;
  }
  return normalizeLoadCategory(stored, false);
}

export function loadCategoryLabel(categoryId) {
  return BY_ID.get(categoryId)?.label ?? "Canadian Grain";
}

function roundMoney(n) {
  return String(Math.round(n * 100) / 100);
}

/**
 * CAD total string for schedule / loadsheets (empty when inputs incomplete).
 */
export function computeLoadTotalDisplay({
  mt = "",
  rate = "",
  fsc = "",
  kms = "",
  loadCategory = null,
  usdCadRate = null,
  flatRate = false,
}) {
  const cat = normalizeLoadCategory(loadCategory, flatRate);
  const r = parseMetricNum(rate);

  switch (cat) {
    case "cattle":
    case "tanker": {
      if (r == null) return "";
      return roundMoney(r);
    }
    case "chicken": {
      const f = parseMetricNum(fsc);
      if (f == null || r == null) return "";
      return roundMoney(CHICKEN_FSC_MULTIPLIER * f + r);
    }
    case "cargill": {
      const m = parseMetricNum(mt);
      const f = parseMetricNum(fsc);
      const k = parseMetricNum(kms);
      if (m == null || r == null || f == null || k == null) return "";
      return roundMoney(k * f + r * m);
    }
    case "irm": {
      const m = parseMetricNum(mt);
      const f = parseMetricNum(fsc);
      if (m == null || r == null || f == null) return "";
      const base = r * m;
      const fscAmount = base * (f / 100);
      return roundMoney(base + fscAmount);
    }
    case "us_grain": {
      const m = parseMetricNum(mt);
      const fx = parseMetricNum(usdCadRate);
      if (m == null || r == null || fx == null) return "";
      const usd = m * r;
      return roundMoney(usd * fx);
    }
    case "legacy_flat": {
      const fRaw = String(fsc ?? "").trim();
      const f = parseMetricNum(fsc);
      if (r == null || fRaw === "" || f == null) return "";
      return roundMoney(r * f);
    }
    case "canadian_grain":
    default: {
      const m = parseMetricNum(mt);
      if (m == null || r == null) return "";
      return roundMoney(m * r);
    }
  }
}

/** USD subtotal before FX (US grain only). */
export function computeUsGrainUsdTotal(mt, rate) {
  const m = parseMetricNum(mt);
  const r = parseMetricNum(rate);
  if (m == null || r == null) return "";
  return roundMoney(m * r);
}

export function totalFormulaHint(loadCategory, flatRate = false) {
  const cat = normalizeLoadCategory(loadCategory, flatRate);
  switch (cat) {
    case "chicken":
      return "556 × FSC + rate";
    case "cattle":
      return "rate (CAD)";
    case "tanker":
      return "rate (CAD) — flat";
    case "us_grain":
      return "MT × rate (USD) × USD/CAD → CAD on schedule";
    case "cargill":
      return "KMs × FSC + rate × MT";
    case "irm":
      return "rate × MT + (rate × MT × FSC%)";
    case "legacy_flat":
      return "rate × FSC (legacy)";
    default:
      return "MT × rate";
  }
}

export function fieldRulesForCategory(loadCategory, flatRate = false) {
  const cat = normalizeLoadCategory(loadCategory, flatRate);
  return {
    showMt:
      cat === "canadian_grain" ||
      cat === "us_grain" ||
      cat === "cargill" ||
      cat === "irm",
    showFsc:
      cat === "chicken" ||
      cat === "legacy_flat" ||
      cat === "cargill" ||
      cat === "irm",
    rateIsFlatTotal: cat === "cattle" || cat === "tanker",
    showUsdCad: cat === "us_grain",
    mtRequired:
      cat === "canadian_grain" ||
      cat === "us_grain" ||
      cat === "cargill" ||
      cat === "irm",
    fscRequired: cat === "chicken" || cat === "cargill" || cat === "irm",
    rateRequired: true,
  };
}

/** Cattle and chicken loads can be assigned to multiple drivers/slots at once. */
export function supportsMultiDriverAssign(loadCategory) {
  const cat = loadCategoryFromStorage(loadCategory);
  return cat === "cattle" || cat === "chicken";
}

function normalizeDriverDivision(division) {
  return String(division ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Multi-assign lists only drivers whose division matches the sheet category. */
export function driverDivisionMatchesLoadCategory(
  loadCategory,
  driverDivision,
) {
  const cat = loadCategoryFromStorage(loadCategory);
  const n = normalizeDriverDivision(driverDivision);
  if (!n) return false;
  if (cat === "cattle") return n.includes("cattle");
  if (cat === "chicken") return n.includes("chicken");
  return true;
}

export function calcOptionsFromSheet(sheet) {
  if (!sheet) {
    return {
      loadCategory: DEFAULT_LOAD_CATEGORY,
      flatRate: false,
      usdCadRate: null,
    };
  }
  return {
    loadCategory: loadCategoryFromStorage(sheet.load_category),
    flatRate: Boolean(sheet.flat_rate),
    usdCadRate: sheet.usd_cad_rate,
    kms: sheet.kms,
  };
}

/** Category / FX stored on schedule_loads (per slot). */
export function calcOptionsFromScheduleLoad(load) {
  if (!load) {
    return {
      loadCategory: DEFAULT_LOAD_CATEGORY,
      flatRate: false,
      usdCadRate: null,
    };
  }
  return {
    loadCategory: loadCategoryFromStorage(load.load_category),
    flatRate: false,
    usdCadRate: load.usd_cad_rate,
  };
}

function formatUsdCadRate(rate) {
  if (rate == null || !Number.isFinite(Number(rate))) {
    throw new Error("USD/CAD rate missing from response.");
  }
  return String(Math.round(Number(rate) * 10000) / 10000);
}

function parseFrankfurterJson(data) {
  const rate = data?.rates?.CAD;
  return formatUsdCadRate(rate);
}

/** Live USD→CAD (same-origin API route, then Frankfurter dev API). */
export async function fetchLiveUsdCadRate() {
  try {
    const local = await fetch("/api/usd-cad-rate", { cache: "no-store" });
    if (local.ok) {
      const body = await local.json();
      if (body?.rate != null) {
        return formatUsdCadRate(body.rate);
      }
      if (body?.error) {
        throw new Error(String(body.error));
      }
    }
  } catch (e) {
    if (
      e instanceof Error &&
      e.message &&
      !/failed to fetch/i.test(e.message)
    ) {
      throw e;
    }
  }

  const res = await fetch(
    "https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD",
    { cache: "no-store", redirect: "follow" },
  );
  if (!res.ok) {
    throw new Error(
      "Could not fetch USD/CAD rate. Check your connection and try again.",
    );
  }
  const data = await res.json();
  return parseFrankfurterJson(data);
}
