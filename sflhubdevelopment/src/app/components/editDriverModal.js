"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { createClient } from "@/lib/supabase/client";

export default function EditDriverModal({ open, onClose, driver, onSaved }) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [pin, setPin] = useState("");
  const [division, setDivision] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !driver) return;
    setName(driver.name != null ? String(driver.name) : "");
    setPhone(driver.phone != null ? String(driver.phone) : "");
    setUser(driver.user != null ? String(driver.user) : "");
    setPass(driver.pass != null ? String(driver.pass) : "");
    setPin(driver.pin != null ? String(driver.pin) : "");
    setDivision(driver.division != null ? String(driver.division) : "");
  }, [open, driver]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || !driver?.id) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("drivers")
        .update({
          name: name.trim() || null,
          phone: phone.trim() || null,
          user: user.trim() || null,
          pass: pass.trim() || null,
          pin: pin.trim() || null,
          division: division.trim() || null,
        })
        .eq("id", driver.id)
        .select("id")
        .maybeSingle();
      if (error) {
        alert(error.message);
        return;
      }
      if (!data) {
        console.warn(
          "[editDriver] Update returned no row (RLS or no match). Refreshing lists anyway.",
        );
      }
      await onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (!open || !driver) return null;

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
        aria-labelledby="edit-driver-title"
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
        <h2 id="edit-driver-title" className="mb-4 text-xl font-bold">
          Edit driver
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Name
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
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
              text={saving ? "Saving…" : "Save"}
              disabled={saving}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
