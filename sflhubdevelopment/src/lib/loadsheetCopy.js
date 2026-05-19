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
}) {
  const num = strTrim(loadNumber);
  const loadTotalDisplay = computeLoadTotalDisplay(mt, rate, fsc);
  return {
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
