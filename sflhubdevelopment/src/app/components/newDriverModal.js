"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { createClient } from "@/lib/supabase/client";
import {
  entitySaveFailedMessage,
  insertEntityRow,
  isEmptyUpdateResult,
} from "@/lib/entityUpdate";

export default function NewDriverModal({ open, onClose, onCreated }) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [pin, setPin] = useState("");
  const [division, setDivision] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setUser("");
    setPass("");
    setPin("");
    setDivision("");
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      alert("Driver name is required.");
      return;
    }
    setSaving(true);
    try {
      const row = {
        name: name.trim(),
        phone: phone.trim() || null,
        user: user.trim() || null,
        pass: pass.trim() || null,
        pin: pin.trim() || null,
        division: division.trim() || null,
      };
      const { data, error } = await insertEntityRow(supabase, "drivers", row);
      if (error) {
        alert(error.message);
        return;
      }
      if (isEmptyUpdateResult(data)) {
        alert(entitySaveFailedMessage("driver"));
        return;
      }
      await onCreated?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const inputClass =
    "mt-1 w-full rounded-lg border border-green-950/25 bg-white px-3 py-2 text-sm text-green-950 outline-none focus:border-green-950/50";

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
        aria-labelledby="new-driver-title"
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
        <h2 id="new-driver-title" className="mb-4 text-xl font-bold">
          Add driver
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Name <span className="text-red-700">*</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Division
            <input className={inputClass} value={division} onChange={(e) => setDivision(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            User
            <input className={inputClass} value={user} onChange={(e) => setUser(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Pass
            <input className={inputClass} value={pass} onChange={(e) => setPass(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            PIN
            <input className={inputClass} value={pin} onChange={(e) => setPin(e.target.value)} />
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
              text={saving ? "Adding…" : "Add driver"}
              disabled={saving}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
