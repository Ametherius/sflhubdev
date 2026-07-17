/** Display order for assigned rows (top → bottom). */
export const DIVISION_DISPLAY_ORDER = [
  "canadian grain",
  "tanker",
  "chicken",
  "us grain",
  "cattle",
];

function normalizeDivision(division) {
  return String(division ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Lower rank = appears earlier in the schedule list. Unknown divisions sort last. */
export function divisionSortRank(division) {
  const n = normalizeDivision(division);
  if (!n) return DIVISION_DISPLAY_ORDER.length + 1;

  const exact = DIVISION_DISPLAY_ORDER.indexOf(n);
  if (exact >= 0) return exact;

  if (/canadian/.test(n) && /grain/.test(n)) return 0;
  if (n.includes("tanker")) return 1;
  if (n.includes("chicken")) return 2;
  if ((/\bus\b|u\.s\.|united states/.test(n) || n.startsWith("us ")) && /grain/.test(n)) {
    return 3;
  }
  if (n.includes("cattle")) return 4;

  return DIVISION_DISPLAY_ORDER.length;
}

export function compareAssignedRows(a, b) {
  const divCmp = divisionSortRank(a.driver?.division) - divisionSortRank(b.driver?.division);
  if (divCmp !== 0) return divCmp;

  const unitA = a.unit?.unit;
  const unitB = b.unit?.unit;
  const numA = Number(unitA);
  const numB = Number(unitB);
  if (Number.isFinite(numA) && Number.isFinite(numB)) {
    return numA - numB;
  }
  return String(unitA ?? "").localeCompare(String(unitB ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
