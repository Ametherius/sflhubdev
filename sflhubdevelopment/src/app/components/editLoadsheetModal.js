"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { computeLoadTotalDisplay, formatLoadTotalCad } from "@/lib/loadTotal";
import { createClient } from "@/lib/supabase/client";

function nullIfEmpty(s) {
  const t = String(s ?? "").trim();
  return t.length ? t : null;
}

/**
 * Edit loadsheets library row. Optional schedule_loads row to unlink template from a slot.
 */
export default function EditLoadsheetModal({
  open,
  onClose,
  loadSheets = [],
  /** Pre-select this sheet when opening from a slot that already has loadsheet_id */
  initialLoadsheetId = null,
  /** When set (opened from a grid slot), offer "remove from this slot" for schedule_loads */
  scheduleLoadId = null,
  onSaved,
  /** Called after unlinking schedule row from loadsheet (refresh week loads) */
  onScheduleUnlinked,
}) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedId, setSelectedId] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [mt, setMt] = useState("");
  const [rate, setRate] = useState("");
  const [fsc, setFsc] = useState("");
  const [broker, setBroker] = useState("");
  const [saving, setSaving] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset picker when modal opens */
    if (!open) return;
    const want =
      initialLoadsheetId != null && String(initialLoadsheetId).trim() !== ""
        ? String(initialLoadsheetId)
        : "";
    const ok =
      want && loadSheets.some((s) => String(s.id) === want) ? want : "";
    setSelectedId(ok);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialLoadsheetId, loadSheets]);

  const selected = useMemo(
    () => loadSheets.find((s) => String(s.id) === String(selectedId)),
    [loadSheets, selectedId],
  );

  const loadTotalPreview = useMemo(
    () => computeLoadTotalDisplay(mt, rate, fsc),
    [mt, rate, fsc],
  );

  const loadTotalPreviewCad = useMemo(
    () => formatLoadTotalCad(loadTotalPreview),
    [loadTotalPreview],
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate form from selected loadsheet */
    if (!open) return;
    if (!selected) {
      setLoadNumber("");
      setOrigin("");
      setEndUser("");
      setMt("");
      setRate("");
      setFsc("");
      setBroker("");
      return;
    }
    setLoadNumber(selected.load_number != null ? String(selected.load_number) : "");
    setOrigin(selected.origin != null ? String(selected.origin) : "");
    setEndUser(selected.end_user != null ? String(selected.end_user) : "");
    setMt(selected.mt != null ? String(selected.mt) : "");
    setRate(selected.rate != null ? String(selected.rate) : "");
    setFsc(selected.fsc != null ? String(selected.fsc) : "");
    setBroker(selected.broker != null ? String(selected.broker) : "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, selected]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!selectedId) {
      alert("Choose which load sheet to edit.");
      return;
    }
    const num = loadNumber.trim();
    if (!num) {
      alert("Load number is required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("loadsheets")
      .update({
        load_number: num,
        origin: nullIfEmpty(origin),
        end_user: nullIfEmpty(endUser),
        mt: nullIfEmpty(mt),
        rate: nullIfEmpty(rate),
        fsc: nullIfEmpty(fsc),
        broker: nullIfEmpty(broker),
      })
      .eq("id", selectedId);
    setSaving(false);
    if (error) {
      if (/does not exist|schema cache|PGRST205/i.test(error.message ?? "")) {
        alert(
          "The loadsheets table is not available. Apply migrations, then try again.",
        );
      } else {
        alert(error.message);
      }
      return;
    }
    await onSaved?.();
    onClose();
  }

  async function handleRemoveFromSlot() {
    if (!scheduleLoadId) return;
    if (
      !confirm(
        "Remove the load from this slot? All copied load details (origin, metrics, notes, load sheet link) will be cleared.",
      )
    ) {
      return;
    }
    setUnlinking(true);
    const { error } = await supabase
      .from("schedule_loads")
      .update({
        loadsheet_id: null,
        load_number: null,
        load_note: null,
        origin: null,
        end_user: null,
        mt: null,
        rate: null,
        fsc: null,
        load_total: null,
      })
      .eq("id", scheduleLoadId);
    setUnlinking(false);
    if (error) {
      alert(error.message);
      return;
    }
    await onScheduleUnlinked?.();
    onClose();
  }

  if (!open) return null;

  const inputClass =
    "mt-1 w-full rounded-lg border border-green-950/25 bg-white px-3 py-2 text-sm text-green-950 outline-none focus:border-green-950/50";

  const selectClass =
    "mt-1 w-full rounded-lg border border-green-950/25 bg-white px-3 py-2 text-sm text-green-950 outline-none focus:border-green-950/50";

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-loadsheet-title"
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
        <h2 id="edit-loadsheet-title" className="mb-1 text-xl font-bold">
          Edit load sheet
        </h2>
        <p className="mb-4 text-sm text-green-900/80">
          Changes the saved template in your library. Assigned schedule rows keep their
          current values until you assign again from the day <strong>+</strong> button.
        </p>

        {scheduleLoadId ? (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="mb-2 font-medium">This slot</p>
            <button
              type="button"
              className="rounded-lg border border-amber-700 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
              disabled={unlinking}
              onClick={() => void handleRemoveFromSlot()}
            >
              {unlinking ? "Clearing…" : "Remove load from this slot"}
            </button>
          </div>
        ) : null}

        {loadSheets.length === 0 ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            No load sheets yet. Use <strong>New load sheet</strong> in the bottom bar first.
          </p>
        ) : (
          <label className="mb-3 block text-sm font-medium">
            Load sheet
            <select
              className={selectClass}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
            >
              <option value="">Select a load sheet…</option>
              {loadSheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {String(s.load_number ?? "").trim() || s.id}
                </option>
              ))}
            </select>
          </label>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Load number <span className="text-red-700">*</span>
            <input
              className={inputClass}
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              placeholder="e.g. 1042"
              required
              disabled={!selectedId}
            />
          </label>
          <label className="block text-sm font-medium">
            Origin
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin"
              disabled={!selectedId}
            />
          </label>
          <label className="block text-sm font-medium">
            End user
            <input
              className={inputClass}
              value={endUser}
              onChange={(e) => setEndUser(e.target.value)}
              placeholder="End user"
              disabled={!selectedId}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              MT
              <input
                className={inputClass}
                value={mt}
                onChange={(e) => setMt(e.target.value)}
                placeholder="MT"
                disabled={!selectedId}
              />
            </label>
            <label className="block text-sm font-medium">
              Rate
              <input
                className={inputClass}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Rate"
                disabled={!selectedId}
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            FSC{" "}
            <span className="font-normal text-green-900/60">
              (optional, added to MT × rate when filled)
            </span>
            <input
              className={inputClass}
              value={fsc}
              onChange={(e) => setFsc(e.target.value)}
              placeholder="e.g. 150"
              disabled={!selectedId}
            />
          </label>
          <label className="block text-sm font-medium">
            Total{" "}
            <span className="font-normal text-green-900/60">
              (matches schedule cells: MT × rate + FSC)
            </span>
            <input
              className={`${inputClass} cursor-not-allowed bg-neutral-100 text-neutral-700`}
              readOnly
              value={loadTotalPreviewCad}
              placeholder="—"
              title="Computed from MT, rate, and FSC (same as grid cells). Shown in CAD."
            />
          </label>
          <label className="block text-sm font-medium">
            Broker <span className="font-normal text-green-900/60">(optional)</span>
            <input
              className={inputClass}
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder="Broker"
              disabled={!selectedId}
            />
          </label>

          <div className="mt-2 flex justify-end gap-2 border-t border-green-950/15 pt-4">
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
              onClick={onClose}
            >
              Cancel
            </button>
            <ButtonDark
              type="submit"
              text={saving ? "Saving…" : "Save changes"}
              disabled={!selectedId || loadSheets.length === 0}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
