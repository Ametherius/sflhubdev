/** Options for useConfirm() — save / apply / invoiced / destructive actions. */

export function saveChangesConfirmOptions(what = "your changes") {
  return {
    title: "Save changes?",
    message: `Save changes to ${what}?`,
    confirmLabel: "Save",
    cancelLabel: "Cancel",
  };
}

export function applyToScheduleConfirmOptions({
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
    return {
      title: "Apply to schedule?",
      message: `Apply this load sheet to ${cellCount} schedule cells${scope}?`,
      confirmLabel: "Apply",
      cancelLabel: "Cancel",
    };
  }
  const dayPart = dayTitle ? ` for ${dayTitle}` : "";
  return {
    title: "Apply to schedule?",
    message: `Apply this load sheet to the schedule${dayPart}?`,
    confirmLabel: "Apply",
    cancelLabel: "Cancel",
  };
}

export function invoicedChangeConfirmOptions(
  invoiced,
  { scheduleSlot = false } = {},
) {
  const target = scheduleSlot ? "this schedule slot" : "this load sheet";
  const verb = invoiced ? "Mark" : "Unmark";
  const state = invoiced ? "invoiced" : "not invoiced";
  return {
    title: invoiced ? "Mark invoiced?" : "Unmark invoiced?",
    message: `${verb} ${target} as ${state}?`,
    confirmLabel: invoiced ? "Mark invoiced" : "Unmark",
    cancelLabel: "Cancel",
  };
}

export function removeFromSlotConfirmOptions() {
  return {
    title: "Remove load from slot?",
    message:
      "Remove the load from this slot? All copied load details (origin, metrics, notes, load sheet link) will be cleared.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    variant: "danger",
  };
}

export function deleteLoadsheetConfirmOptions(label) {
  return {
    title: "Delete load sheet?",
    message: `Delete loadsheet "${label}"? This cannot be undone.`,
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    variant: "danger",
  };
}

export function deleteDriverConfirmOptions() {
  return {
    title: "Delete driver?",
    message: "Delete this driver from the database?",
    confirmLabel: "Delete",
    cancelLabel: "Cancel",
    variant: "danger",
  };
}

export function vacateUnitConfirmOptions() {
  return {
    title: "Vacate unit?",
    message:
      "Remove this driver and unit from the live board? Schedule load data for the current and future weeks will be deleted. Past weeks are kept for history.",
    confirmLabel: "Vacate",
    cancelLabel: "Cancel",
    variant: "danger",
  };
}

export function removeWeekAssignmentConfirmOptions() {
  return {
    title: "Remove from this week?",
    message:
      "Remove this driver and unit from this week’s schedule only? All load data for this week will be deleted. The live assigned board is not affected.",
    confirmLabel: "Remove",
    cancelLabel: "Cancel",
    variant: "danger",
  };
}
