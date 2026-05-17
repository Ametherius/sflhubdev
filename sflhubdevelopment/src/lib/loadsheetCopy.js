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
