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

export default function NewBrokerModal({ open, onClose, onCreated }) {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      alert("Broker name is required.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await insertEntityRow(supabase, "brokers", {
        name: name.trim(),
      });
      if (error) {
        alert(error.message);
        return;
      }
      if (isEmptyUpdateResult(data)) {
        alert(entitySaveFailedMessage("broker"));
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
        aria-labelledby="new-broker-title"
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
        <h2 id="new-broker-title" className="mb-4 text-xl font-bold">
          Add Broker
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Name <span className="text-red-700">*</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
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
              text={saving ? "Adding…" : "Add broker"}
              disabled={saving}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
