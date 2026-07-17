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

export function changeUnitConfirmOptions(driverName, unitLabel) {
  return {
    title: "Change unit?",
    message: `Assign ${driverName} to unit ${unitLabel} on the live board? Load history for past weeks is kept.`,
    confirmLabel: "Change unit",
    cancelLabel: "Cancel",
  };
}

export function removeWeekAssignmentConfirmOptions({ pastWeek = false } = {}) {
  return {
    title: "Delete unit from this week?",
    message: pastWeek
      ? "Delete this driver and unit from this past week only? All load data for this week will be removed. Other weeks and the live board are not affected."
      : "Delete this driver and unit from this week’s schedule only? All load data for this week will be deleted. The live assigned board is not affected.",
    confirmLabel: "Delete unit",
    cancelLabel: "Cancel",
    variant: "danger",
  };
}
