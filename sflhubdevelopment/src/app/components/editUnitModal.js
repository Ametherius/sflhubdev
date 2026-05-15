"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { createClient } from "@/lib/supabase/client";

function hasOwn(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

/** DB may expose camelCase or snake_case for the same logical columns. */
function unitPinColumnKeys(unit) {
  const petroPin = hasOwn(unit, "petro_pin") ? "petro_pin" : "petroPIN";
  const ufaPin = hasOwn(unit, "ufa_pin") ? "ufa_pin" : "ufaPIN";
  return { petroPin, ufaPin };
}

export default function EditUnitModal({ open, onClose, unit, onSaved }) {
  const supabase = useMemo(() => createClient(), []);
  const [unitNum, setUnitNum] = useState("");
  const [petro, setPetro] = useState("");
  const [petroPIN, setPetroPIN] = useState("");
  const [ufa, setUfa] = useState("");
  const [ufaPIN, setUfaPIN] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !unit) return;
    const { petroPin, ufaPin } = unitPinColumnKeys(unit);
    setUnitNum(unit.unit != null ? String(unit.unit) : "");
    setPetro(unit.petro != null ? String(unit.petro) : "");
    setPetroPIN(
      unit[petroPin] != null ? String(unit[petroPin]) : "",
    );
    setUfa(unit.ufa != null ? String(unit.ufa) : "");
    setUfaPIN(unit[ufaPin] != null ? String(unit[ufaPin]) : "");
  }, [open, unit]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || !unit?.id) return;
    setSaving(true);
    try {
      const { petroPin, ufaPin } = unitPinColumnKeys(unit);
      const patch = {
        unit: unitNum.trim() || null,
        petro: petro.trim() || null,
        ufa: ufa.trim() || null,
        [petroPin]: petroPIN.trim() || null,
        [ufaPin]: ufaPIN.trim() || null,
      };
      const { data, error } = await supabase
        .from("units")
        .update(patch)
        .eq("id", unit.id)
        .select("id")
        .maybeSingle();
      if (error) {
        alert(error.message);
        return;
      }
      if (!data) {
        console.warn(
          "[editUnit] Update returned no row (RLS or no match). Refreshing lists anyway.",
        );
      }
      await onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open || !unit) return null;

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
        aria-labelledby="edit-unit-title"
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
        <h2 id="edit-unit-title" className="mb-4 text-xl font-bold">
          Edit unit
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Unit
            <input className={inputClass} value={unitNum} onChange={(e) => setUnitNum(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Petro
            <input className={inputClass} value={petro} onChange={(e) => setPetro(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Petro PIN
            <input className={inputClass} value={petroPIN} onChange={(e) => setPetroPIN(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            UFA
            <input className={inputClass} value={ufa} onChange={(e) => setUfa(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            UFA PIN
            <input className={inputClass} value={ufaPIN} onChange={(e) => setUfaPIN(e.target.value)} />
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
              text={saving ? "Saving…" : "Save"}
              disabled={saving}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
