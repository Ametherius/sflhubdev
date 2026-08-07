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

export default function EditPlannerSlotModal({
  open,
  onClose,
  slot = null,
  slotCols: slotColsProp = null,
  canEdit = true,
  saving = false,
  onSubmit,
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-planner-slot-title"
        onClick={(ev) => ev.stopPropagation()}
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <label className="block text-sm font-medium">
            Driver name
            <input
              className={inputClass}
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver"
              disabled={!canEdit || saving}
            />
          </label>
          <label className="block text-sm font-medium">
            Unit number
            <input
              className={inputClass}
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="Unit #"
              disabled={!canEdit || saving}
            />
          </label>

          <fieldset
            className="flex flex-col gap-2"
            disabled={!canEdit || saving}
          >
            <legend className="mb-1 text-sm font-medium">Status</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={dispatched}
                onChange={(e) => setDispatched(e.target.checked)}
              />
              Unit dispatched
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={unloaded}
                onChange={(e) => setUnloaded(e.target.checked)}
              />
              Unloaded
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
              100% complete
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className={checkboxClass}
                checked={rejected}
                onChange={(e) => setRejected(e.target.checked)}
              />
              Rejected
            </label>
          </fieldset>

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
        </form>
      </div>
    </div>
  );
}
