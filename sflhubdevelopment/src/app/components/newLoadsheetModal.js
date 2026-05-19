"use client";

import { useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { computeLoadTotalDisplay, formatLoadTotalCad } from "@/lib/loadTotal";
import { createClient } from "@/lib/supabase/client";

function nullIfEmpty(s) {
  const t = String(s ?? "").trim();
  return t.length ? t : null;
}

export default function NewLoadsheetModal({ open, onClose, onCreated }) {
  const supabase = useMemo(() => createClient(), []);
  const [broker, setBroker] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [mt, setMt] = useState("");
  const [rate, setRate] = useState("");
  const [fsc, setFsc] = useState("");
  const [flatRate, setFlatRate] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadTotalPreview = useMemo(
    () => computeLoadTotalDisplay(mt, rate, fsc, flatRate),
    [mt, rate, fsc, flatRate],
  );

  const loadTotalPreviewCad = useMemo(
    () => formatLoadTotalCad(loadTotalPreview),
    [loadTotalPreview],
  );

  function reset() {
    setBroker("");
    setLoadNumber("");
    setOrigin("");
    setEndUser("");
    setMt("");
    setRate("");
    setFsc("");
    setFlatRate(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const num = loadNumber.trim();
    if (!num) {
      alert("Load number is required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("loadsheets").insert({
      load_number: num,
      broker: nullIfEmpty(broker),
      origin: nullIfEmpty(origin),
      end_user: nullIfEmpty(endUser),
      mt: nullIfEmpty(mt),
      rate: nullIfEmpty(rate),
      fsc: nullIfEmpty(fsc),
      flat_rate: flatRate,
    });
    setSaving(false);
    if (error) {
      if (/does not exist|schema cache|PGRST205/i.test(error.message ?? "")) {
        alert(
          "The loadsheets table is not available yet. Apply the latest Supabase migration, then try again.",
        );
      } else if (/flat_rate|column .* does not exist/i.test(error.message ?? "")) {
        alert(
          "Flat rate needs the latest Supabase migration (loadsheets.flat_rate). Apply migrations, then try again.",
        );
      } else {
        alert(error.message);
      }
      return;
    }
    reset();
    await onCreated?.();
    onClose();
  }

  if (!open) return null;

  const inputClass =
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
        aria-labelledby="new-loadsheet-title"
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
        <h2 id="new-loadsheet-title" className="mb-1 text-xl font-bold">
          New load sheet
        </h2>
        <p className="mb-4 text-sm text-green-900/80">
          Save a reusable load. On the schedule, use the day <strong>+</strong> button to
          copy these values into that unit&apos;s load row.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Broker <span className="font-normal text-green-900/60">(optional)</span>
            <input
              className={inputClass}
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder="Broker"
            />
          </label>
          <label className="block text-sm font-medium">
            Load number <span className="text-red-700">*</span>
            <input
              className={inputClass}
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              placeholder="e.g. 1042"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Origin
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin"
            />
          </label>
          <label className="block text-sm font-medium">
            End user
            <input
              className={inputClass}
              value={endUser}
              onChange={(e) => setEndUser(e.target.value)}
              placeholder="End user"
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
                disabled={flatRate}
              />
            </label>
            <label className="block text-sm font-medium">
              Rate
              <input
                className={inputClass}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="Rate"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            FSC <span className="font-normal text-green-900/60">(optional)</span>
            <input
              className={inputClass}
              value={fsc}
              onChange={(e) => setFsc(e.target.value)}
              placeholder="Fuel surcharge"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-green-950/30 text-green-950 focus:ring-green-950/30"
              checked={flatRate}
              onChange={(e) => setFlatRate(e.target.checked)}
            />
            Flat rate
            <span className="font-normal text-green-900/60">(total = rate × FSC only)</span>
          </label>
          <label className="block text-sm font-medium">
            Total{" "}
            <span className="font-normal text-green-900/60">
              {flatRate ? "(rate × FSC)" : "(MT × rate + FSC)"}
            </span>
            <input
              className={`${inputClass} cursor-not-allowed bg-neutral-100 text-neutral-700`}
              readOnly
              value={loadTotalPreviewCad}
              placeholder="—"
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
            <ButtonDark type="submit" text={saving ? "Saving…" : "Save load sheet"} />
          </div>
        </form>
      </div>
    </div>
  );
}