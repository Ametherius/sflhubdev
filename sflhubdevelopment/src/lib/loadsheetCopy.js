import {
  calcOptionsFromSheet,
  loadCategoryFromStorage,
  loadCategoryStorageValue,
} from "@/lib/loadCategory";
import { computeLoadTotalDisplay } from "@/lib/loadTotal";

function nullIfEmpty(s) {
  const t = String(s ?? "").trim();
  return t.length ? t : null;
}

function strTrim(v) {
  return String(v ?? "").trim();
}

/** Load # on first line; broker on second line when present (green notes column). */
export function buildScheduleLoadNote(loadNumber, broker) {
  const num = strTrim(loadNumber);
  const br = strTrim(broker);
  if (!num && !br) return null;
  if (!br) return num.length ? num : null;
  if (!num) return `Broker: ${br}`;
  return `${num}\nBroker: ${br}`;
}

/** Copy loadsheet fields into a schedule_loads update/insert payload. */
export function buildScheduleLoadPayload({
  loadsheetId,
  loadNumber,
  origin,
  endUser,
  mt,
  rate,
  fsc,
  broker,
  flatRate = false,
  loadCategory = null,
  usdCadRate = null,
  kms = undefined,
  invoiced = undefined,
}) {
  const num = strTrim(loadNumber);
  const loadTotalDisplay = computeLoadTotalDisplay(mt, rate, fsc, {
    flatRate,
    loadCategory,
    usdCadRate,
  });
  const payload = {
    loadsheet_id: loadsheetId,
    load_number: num.length ? num : null,
    load_note: buildScheduleLoadNote(loadNumber, broker),
    origin: nullIfEmpty(origin),
    end_user: nullIfEmpty(endUser),
    mt: nullIfEmpty(mt),
    rate: nullIfEmpty(rate),
    fsc: nullIfEmpty(fsc),
    load_total: nullIfEmpty(loadTotalDisplay),
  };
  if (kms !== undefined) {
    payload.kms = nullIfEmpty(kms);
  }
  if (invoiced !== undefined) {
    payload.invoiced = Boolean(invoiced);
  }
  return payload;
}

/** Strip trailing -N copy suffix (e.g. 1042-3 → 1042). */
export function loadNumberRoot(loadNumber) {
  return String(loadNumber ?? "")
    .trim()
    .replace(/-\d+$/, "");
}

/** Next duplicate load number: 1042 → 1042-1; if 1042-1 exists → 1042-2. */
export function nextCopyLoadNumber(sourceLoadNumber, allSheets) {
  const root = loadNumberRoot(sourceLoadNumber);
  if (!root) return "";

  const suffixPattern = new RegExp(
    `^${root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`,
  );

  let maxSuffix = 0;
  for (const sheet of allSheets ?? []) {
    const n = String(sheet.load_number ?? "").trim();
    if (n === root) {
      maxSuffix = Math.max(maxSuffix, 0);
      continue;
    }
    const m = n.match(suffixPattern);
    if (m) {
      maxSuffix = Math.max(maxSuffix, parseInt(m[1], 10));
    }
  }

  return `${root}-${maxSuffix + 1}`;
}

/** Insert a duplicate loadsheet row with the next -N load number suffix. */
export async function insertLoadsheetCopy(supabase, sourceSheet, allSheets) {
  const num = strTrim(sourceSheet?.load_number);
  if (!num) {
    return { data: null, error: { message: "Load number is required to copy." } };
  }
  const newNum = nextCopyLoadNumber(num, allSheets);
  if (!newNum) {
    return {
      data: null,
      error: { message: "Could not determine a copy load number." },
    };
  }

  return supabase
    .from("loadsheets")
    .insert({
      load_number: newNum,
      origin: nullIfEmpty(sourceSheet.origin),
      end_user: nullIfEmpty(sourceSheet.end_user),
      mt: nullIfEmpty(sourceSheet.mt),
      rate: nullIfEmpty(sourceSheet.rate),
      fsc: nullIfEmpty(sourceSheet.fsc),
      broker: nullIfEmpty(sourceSheet.broker),
      flat_rate: Boolean(sourceSheet.flat_rate),
      load_category: nullIfEmpty(
        loadCategoryStorageValue(
          loadCategoryFromStorage(sourceSheet.load_category),
        ),
      ),
      usd_cad_rate: nullIfEmpty(sourceSheet.usd_cad_rate),
      kms: nullIfEmpty(sourceSheet.kms),
      invoiced: false,
    })
    .select("id")
    .single();
}
