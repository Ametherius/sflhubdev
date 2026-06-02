/** Ask the user to confirm before persisting an edit. Returns true if they proceed. */
export function confirmSaveChanges(what = "your changes") {
  return window.confirm(`Save changes to ${what}?`);
}

/** Confirm before applying loadsheet data to the schedule. */
export function confirmApplyToSchedule({
  cellCount = 1,
  dayCount = 1,
  dayTitle = null,
} = {}) {
  if (cellCount > 1) {
    let scope = "";
    if (dayCount > 1) {
      scope = ` across ${dayCount} days`;
    } else if (dayTitle) {
      scope = ` on ${dayTitle}`;
    }
    return window.confirm(
      `Apply this load sheet to ${cellCount} schedule cells${scope}?`,
    );
  }
  const dayPart = dayTitle ? ` for ${dayTitle}` : "";
  return window.confirm(`Apply this load sheet to the schedule${dayPart}?`);
}

/** Confirm before toggling invoiced on a load sheet or schedule slot. */
export function confirmInvoicedChange(invoiced, { scheduleSlot = false } = {}) {
  const target = scheduleSlot ? "this schedule slot" : "this load sheet";
  const verb = invoiced ? "Mark" : "Unmark";
  const state = invoiced ? "invoiced" : "not invoiced";
  return window.confirm(`${verb} ${target} as ${state}?`);
}
