"use client";

import {
  plannerSlotColumns,
  readSlotCompleted,
  readSlotDispatched,
  readSlotDriverName,
  readSlotRejected,
  readSlotUnitNumber,
  readSlotUnloaded,
} from "@/lib/plannerSlots";
import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import SearchableSelect from "./searchableSelect";

export default function EditPlannerSlotModal({
  open,
  onClose,
  slot = null,
  slotCols: slotColsProp = null,
  canEdit = true,
  saving = false,
  onSubmit,
  loadsheets,
  assigned,
  division,
}) {
  const slotCols = useMemo(
    () => slotColsProp ?? plannerSlotColumns(slot),
    [slotColsProp, slot],
  );

  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [driverName, setDriverName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [dispatched, setDispatched] = useState(false);
  const [unloaded, setUnloaded] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [sheet, setSheet] = useState("");
  const [unit, setUnit] = useState("");

  const divisionUnits = (assigned ?? []).filter((u) =>
    String(u.driver?.division ?? "")
      .trim()
      .toLowerCase()
      .includes(String(division).trim().toLowerCase()),
  );

  useEffect(() => {
    if (!open || !slot) return;
    setOrigin(String(slot[slotCols.origin] ?? "").trim());
    setEndUser(String(slot[slotCols.endUser] ?? "").trim());
    setDriverName(readSlotDriverName(slot, slotCols));
    setUnitNumber(readSlotUnitNumber(slot, slotCols));
    setDispatched(readSlotDispatched(slot, slotCols));
    setUnloaded(readSlotUnloaded(slot, slotCols));
    setCompleted(readSlotCompleted(slot, slotCols));
    setRejected(readSlotRejected(slot, slotCols));
  }, [open, slot, slotCols]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || !canEdit) return;
    await onSubmit?.({
      origin: origin.trim(),
      endUser: endUser.trim(),
      driverName: driverName.trim(),
      unitNumber: unitNumber.trim(),
      dispatched,
      unloaded,
      completed,
      rejected,
    });
  }

  if (!open || !slot) return null;

  const inputClass =
    "mt-1 w-full rounded-lg border border-green-950/25 bg-white px-3 py-2 text-sm text-green-950 outline-none focus:border-green-950/50 disabled:cursor-not-allowed disabled:bg-green-950/5";
  const checkboxClass = "h-4 w-4 rounded border-green-950/30 text-green-950";
  const labelClass = "flex flex-1 gap-1 text-sm";
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(ev) => {
        // mouseDown (not click): opening click's mouseup must not close the dialog.
        if (ev.target === ev.currentTarget) onClose?.();
      }}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-planner-slot-title"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 text-2xl text-green-950 hover:opacity-70"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>
        <h2 id="edit-planner-slot-title" className="mb-4 text-xl font-bold">
          Planner slot
        </h2>

        <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
          <fieldset className="flex gap-4" disabled={!canEdit || saving}>
            <legend className="text-sm w-auto font-medium float-left">
              Status
            </legend>
            <label className={labelClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={dispatched}
                onChange={(e) => setDispatched(e.target.checked)}
              />
              Unit dispatched
            </label>
            <label className={labelClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={unloaded}
                onChange={(e) => setUnloaded(e.target.checked)}
              />
              Unloaded
            </label>
            <label className={labelClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              100% complete
            </label>
            <label className={labelClass}>
              <input
                type="checkbox"
                className={checkboxClass}
                checked={rejected}
                onChange={(e) => setRejected(e.target.checked)}
              />
              Rejected
            </label>
          </fieldset>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex flex-col w-1/2">
            <SearchableSelect
              options={loadsheets ?? []}
              placeholder="Search Loadsheets..."
              emptyMessage="No matches found"
              value={sheet}
              open={open}
              label="Select Loadsheet"
              onChange={(id) => {
                setSheet(id);
                const selected = (loadsheets ?? []).find(
                  (s) => String(s.id) === String(id),
                );
                if (!selected) return;
                setOrigin(String(selected.origin ?? "").trim());
                setEndUser(String(selected.end_user ?? "").trim());
              }}
              getOptionValue={(s) => String(s.id)}
              getOptionLabel={(s) => {
                const broker = String(s.broker ?? "").trim();
                const origin = String(s.origin ?? "").trim();
                const endUser = String(s.end_user ?? "").trim();
                return [broker, origin, endUser].filter(Boolean).join(" - ");
              }}
            />
            <label className="block text-sm font-medium">
              Origin
              <input
                className={inputClass}
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Origin"
                disabled={!canEdit || saving}
              />
            </label>
            <label className="block text-sm font-medium">
              End user
              <input
                className={inputClass}
                value={endUser}
                onChange={(e) => setEndUser(e.target.value)}
                placeholder="End user"
                disabled={!canEdit || saving}
              />
            </label>
            <div className="mt-2 flex justify-end gap-2 border-t border-green-950/15 pt-4">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
                onClick={onClose}
              >
                {canEdit ? "Cancel" : "Close"}
              </button>
              {canEdit ? (
                <ButtonDark type="submit" text={saving ? "Saving…" : "Save"} />
              ) : null}
            </div>
          </div>
          <div className="w-1/2 flex flex-col">
            <SearchableSelect
              className="min-w-0 p-0 my-2"
              listClassName="max-h-40"
              options={divisionUnits ?? []}
              placeholder="Search Units..."
              label="Select Unit"
              open={open}
              emptyMessage="No Units Found..."
              value={unit}
              onChange={(id) => {
                setUnit(id);
                const selected = (divisionUnits ?? []).find(
                  (u) => String(u.id) === String(id),
                );
                if (!selected) return;
                const [first, last] = selected.driver?.name.split(" ");
                setUnitNumber(String(selected.unit?.unit ?? ""));
                setDriverName(`${first} ${last.slice(0, 1)}`);
              }}
              getOptionValue={(u) => u.id}
              getOptionLabel={(u) => {
                const [first, last] = u.driver?.name.split(" ");
                const name = `${first} ${last.slice(0, 1)}`;
                const unit = String(u.unit?.unit);
                const division = String(u.driver?.division);
                return `${name} - ${unit} (${division})`;
              }}
            />
            <label className="block gap-2 text-sm">
              Driver
              <input
                type="text"
                className={inputClass}
                placeholder="Driver"
                onChange={(e) => setDriverName(e.target.value)}
                value={driverName}
              />
            </label>
            <label className="block gap-2 text-sm">
              Unit Number
              <input
                type="text"
                className={inputClass}
                placeholder="Unit Number"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
              />
            </label>
          </div>
        </form>
      </div>
    </div>
  );
}
