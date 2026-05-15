"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { createClient } from "@/lib/supabase/client";

const LOADS_PER_DAY = 3;

function isoDateKey(raw) {
  if (raw == null) return "";
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function nullIfEmpty(s) {
  const t = String(s ?? "").trim();
  return t.length ? t : null;
}

/** DB may return numeric load_number; always stringify before .trim(). */
function strTrim(v) {
  return String(v ?? "").trim();
}

/** Load # on first line; broker on second line when present (green notes column). */
function buildScheduleLoadNote(loadNumber, broker) {
  const num = strTrim(loadNumber);
  const br = strTrim(broker);
  if (!num && !br) return null;
  if (!br) return num.length ? num : null;
  if (!num) return `Broker: ${br}`;
  return `${num}\nBroker: ${br}`;
}

function slotOptionLabel(slot) {
  if (slot?.name != null && String(slot.name).trim() !== "") return slot.name;
  if (slot?.label != null && String(slot.label).trim() !== "") return slot.label;
  return `Load ${slot.sort_order ?? "?"}`;
}

/** Matches day column order: index 0 = top card, 2 = third / bottom slot. */
function slotSelectLabel(slot, indexInColumn) {
  const n = indexInColumn + 1;
  return `Slot ${n} of 3 (${slotOptionLabel(slot)})`;
}

/**
 * Pick a saved load sheet and a slot for that day; writes schedule_loads for this unit.
 */
export default function AssignLoadsheetModal({
  open,
  onClose,
  dayIso,
  dayTitle,
  weekId,
  inUseUnitId,
  loadSlots,
  loads,
  loadsheets,
  /** When set, modal opens with this load_slot_id selected (e.g. third slot). */
  initialSlotId = null,
  onAssigned,
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loadsheetId, setLoadsheetId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedSlots = useMemo(() => {
    if (!loadSlots?.length) return [];
    return [...loadSlots].sort((a, b) => {
      const o = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
      if (o !== 0) return o;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [loadSlots]);

  useEffect(() => {
    if (!open) return;
    setLoadsheetId("");
    const first = sortedSlots[0]?.id ? String(sortedSlots[0].id) : "";
    const want =
      initialSlotId != null && String(initialSlotId).trim() !== ""
        ? String(initialSlotId)
        : "";
    const valid =
      want &&
      sortedSlots.slice(0, LOADS_PER_DAY).some((s) => String(s.id) === want);
    setSlotId(valid ? want : first);
  }, [open, sortedSlots, initialSlotId]);

  const selectedSheet = useMemo(
    () => loadsheets.find((s) => String(s.id) === String(loadsheetId)),
    [loadsheets, loadsheetId],
  );

  const preview = selectedSheet
    ? {
        load_number: strTrim(selectedSheet.load_number),
        origin: selectedSheet.origin ?? "",
        end_user: selectedSheet.end_user ?? "",
        mt: selectedSheet.mt ?? "",
        rate: selectedSheet.rate ?? "",
        fsc: selectedSheet.fsc ?? "",
        notesAuto: (() => {
          const n = buildScheduleLoadNote(
            selectedSheet.load_number,
            selectedSheet.broker,
          );
          return n ?? "—";
        })(),
      }
    : null;

  async function handleApply(e) {
    e.preventDefault();
    if (!weekId || !inUseUnitId || !dayIso || !slotId || !loadsheetId || !selectedSheet) {
      alert("Choose a load sheet and a slot.");
      return;
    }
    if (!loadsheets.length) {
      alert("Create a load sheet first (New load sheet).");
      return;
    }
    setSaving(true);
    const dk = isoDateKey(dayIso);
    const row = (loads ?? []).find((l) => {
      const sid = l.load_slot_id ?? l.load_slots?.id;
      return isoDateKey(l.load_date) === dk && String(sid) === String(slotId);
    });

    const num = strTrim(selectedSheet.load_number);
    const loadNote = buildScheduleLoadNote(
      selectedSheet.load_number,
      selectedSheet.broker,
    );
    const payload = {
      loadsheet_id: selectedSheet.id,
      load_number: num.length ? num : null,
      load_note: loadNote,
      origin: nullIfEmpty(selectedSheet.origin),
      end_user: nullIfEmpty(selectedSheet.end_user),
      mt: nullIfEmpty(selectedSheet.mt),
      rate: nullIfEmpty(selectedSheet.rate),
      fsc: nullIfEmpty(selectedSheet.fsc),
    };

    if (row?.id) {
      const { error } = await supabase
        .from("schedule_loads")
        .update(payload)
        .eq("id", row.id);
      setSaving(false);
      if (error) {
        if (
          /loadsheet_id|load_number|\bfsc\b|\bload_note\b|column .* does not exist/i.test(
            error.message ?? "",
          )
        ) {
          alert(
            "Apply the latest Supabase migration (loadsheets + schedule_loads columns), then try again.",
          );
        } else {
          alert(error.message);
        }
        return;
      }
    } else {
      const { error } = await supabase.from("schedule_loads").insert({
        week_id: weekId,
        load_date: dk,
        load_slot_id: slotId,
        in_use_unit_id: inUseUnitId,
        ...payload,
      });
      setSaving(false);
      if (error) {
        alert(error.message);
        return;
      }
    }

    await onAssigned?.();
    onClose();
  }

  if (!open) return null;

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
        aria-labelledby="assign-loadsheet-title"
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
        <h2 id="assign-loadsheet-title" className="mb-1 text-xl font-bold">
          Assign load to schedule
        </h2>
        <p className="mb-2 text-sm text-green-900/80">
          Day: <strong>{dayTitle}</strong> ({dayIso})
        </p>
        <p className="mb-4 text-sm text-green-900/75">
          Choose a saved sheet and slot, then apply — values are copied into this week only.
          To change the reusable template itself, use <strong>Sheet</strong> on a load card.
        </p>

        {loadsheets.length === 0 ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            No load sheets yet. Tap <strong>New load sheet</strong> in the bottom
            bar, save one, then try again.
          </p>
        ) : null}

        {sortedSlots.length === 0 ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-snug text-amber-950">
            No slot choices: the app could not list <span className="font-mono">load_slots</span>{" "}
            (empty table, RLS blocking SELECT, or not signed in). Run migration{" "}
            <span className="font-mono">20260220120000_ensure_three_canonical_load_slots</span>{" "}
            or add three rows with <span className="font-mono">sort_order</span> 1–3, and grant{" "}
            <span className="font-mono">authenticated</span> read access. If the week already
            has schedule cells, try refreshing after fixing access.
          </p>
        ) : null}

        <form onSubmit={handleApply} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Load sheet
            <select
              className={selectClass}
              value={loadsheetId}
              onChange={(e) => setLoadsheetId(e.target.value)}
              required
            >
              <option value="">Select a load sheet…</option>
              {loadsheets.map((s) => (
                <option key={s.id} value={s.id}>
                  {strTrim(s.load_number) || s.id}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Slot (1 = top of day, 3 = bottom)
            <select
              className={selectClass}
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              required
            >
              {sortedSlots.length === 0 ? (
                <option value="">No slots — fix load_slots access (see note above)</option>
              ) : (
                sortedSlots.slice(0, LOADS_PER_DAY).map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {slotSelectLabel(s, idx)}
                  </option>
                ))
              )}
            </select>
          </label>

          {preview && (
            <div className="rounded-lg border border-green-950/20 bg-green-950/5 p-3 text-xs leading-relaxed text-green-900">
              <div className="mb-1 font-semibold text-green-950">Preview</div>
              <div className="mb-1 font-medium whitespace-pre-wrap text-green-950/90">
                Load notes (auto): {preview.notesAuto}
              </div>
              <div>Origin {preview.origin || "—"}</div>
              <div>End user {preview.end_user || "—"}</div>
              <div>
                MT {preview.mt || "—"} · Rate {preview.rate || "—"} · FSC{" "}
                {preview.fsc || "—"}
              </div>
            </div>
          )}

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
              text={saving ? "Applying…" : "Apply to schedule"}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
