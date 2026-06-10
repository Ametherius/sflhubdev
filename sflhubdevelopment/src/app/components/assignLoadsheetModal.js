"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { createClient } from "@/lib/supabase/client";
import {
  calcOptionsFromSheet,
  driverDivisionMatchesLoadCategory,
  supportsMultiDriverAssign,
} from "@/lib/loadCategory";
import {
  buildScheduleLoadNote,
  buildScheduleLoadPayload,
} from "@/lib/loadsheetCopy";
import {
  persistScheduleLoad,
  scheduleLoadErrorMessage,
} from "@/lib/scheduleLoadsPersist";
const LOADS_PER_DAY = 3;

function isoDateKey(raw) {
  if (raw == null) return "";
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** DB may return numeric load_number; always stringify before .trim(). */
function strTrim(v) {
  return String(v ?? "").trim();
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

function toggleId(list, id) {
  const key = String(id);
  return list.includes(key) ? list.filter((x) => x !== key) : [...list, key];
}

function findScheduleRowForCell(
  weekLoads,
  dayIso,
  slotId,
  { inUseUnitId = null, scheduleAssignmentId = null } = {},
) {
  const dk = isoDateKey(dayIso);
  const unitId =
    inUseUnitId != null && String(inUseUnitId).trim() !== ""
      ? String(inUseUnitId)
      : null;
  const assignmentId =
    scheduleAssignmentId != null && String(scheduleAssignmentId).trim() !== ""
      ? String(scheduleAssignmentId)
      : null;
  return (weekLoads ?? []).find((l) => {
    const sid = l.load_slot_id ?? l.load_slots?.id;
    if (isoDateKey(l.load_date) !== dk || String(sid) !== String(slotId)) {
      return false;
    }
    if (unitId) {
      return String(l.in_use_unit_id ?? "") === unitId;
    }
    if (assignmentId) {
      return String(l.schedule_assignment_id ?? "") === assignmentId;
    }
    return false;
  });
}

/**
 * Pick a saved load sheet and a slot for that day; writes schedule_loads for this unit.
 * Cattle/chicken sheets support assigning to multiple drivers and slots via checkboxes.
 */
export default function AssignLoadsheetModal({
  open,
  onClose,
  dayIso,
  dayTitle,
  weekId,
  weekStartISO = null,
  inUseUnitId,
  scheduleAssignmentId = null,
  loadSlots,
  loads,
  /** Full week schedule_loads (required for multi-driver assign). */
  allWeekLoads = null,
  /** Live board rows: { inUseUnitId, label, division } */
  assignableUnits = [],
  /** Seven days for the current week: { iso, label, columnTitle } */
  weekDays = [],
  loadsheets,
  /** When set, modal opens with this load_slot_id selected (e.g. third slot). */
  initialSlotId = null,
  onAssigned,
  onLoadPatched,
}) {
  const supabase = useMemo(() => createClient(), []);
  const [loadsheetId, setLoadsheetId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [selectedDayIsos, setSelectedDayIsos] = useState([]);
  const [saving, setSaving] = useState(false);

  const sortedSlots = useMemo(() => {
    if (!loadSlots?.length) return [];
    return [...loadSlots].sort((a, b) => {
      const o = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
      if (o !== 0) return o;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [loadSlots]);

  const daySlots = useMemo(
    () => sortedSlots.slice(0, LOADS_PER_DAY).filter((s) => s?.id != null),
    [sortedSlots],
  );

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setLoadsheetId("");
      const first = daySlots[0]?.id ? String(daySlots[0].id) : "";
      const want =
        initialSlotId != null && String(initialSlotId).trim() !== ""
          ? String(initialSlotId)
          : "";
      const valid = want && daySlots.some((s) => String(s.id) === want);
      setSlotId(valid ? want : first);

      const defaultUnits =
        inUseUnitId != null && String(inUseUnitId).trim() !== ""
          ? [String(inUseUnitId)]
          : [];
      setSelectedUnitIds(defaultUnits);
      setSelectedSlotIds(valid ? [want] : first ? [first] : []);

      const openDay =
        dayIso != null && String(dayIso).trim() !== "" ? isoDateKey(dayIso) : "";
      const dayValid =
        openDay && weekDays.some((d) => isoDateKey(d.iso) === openDay);
      setSelectedDayIsos(dayValid ? [openDay] : []);
    });
  }, [open, daySlots, initialSlotId, inUseUnitId, dayIso, weekDays]);

  const selectedSheet = useMemo(
    () => loadsheets.find((s) => String(s.id) === String(loadsheetId)),
    [loadsheets, loadsheetId],
  );

  const multiAssignMode = useMemo(() => {
    if (!selectedSheet) return false;
    const calc = calcOptionsFromSheet(selectedSheet);
    return supportsMultiDriverAssign(calc.loadCategory);
  }, [selectedSheet]);

  const filteredAssignableUnits = useMemo(() => {
    if (!multiAssignMode || !selectedSheet) return assignableUnits;
    const calc = calcOptionsFromSheet(selectedSheet);
    return assignableUnits.filter((u) =>
      driverDivisionMatchesLoadCategory(calc.loadCategory, u.division),
    );
  }, [assignableUnits, multiAssignMode, selectedSheet]);

  useEffect(() => {
    if (!multiAssignMode) return;
    const valid = new Set(
      filteredAssignableUnits.map((u) => String(u.inUseUnitId)),
    );
    setSelectedUnitIds((prev) => prev.filter((id) => valid.has(id)));
  }, [multiAssignMode, filteredAssignableUnits, loadsheetId]);

  const weekLoadsForLookup = allWeekLoads ?? loads;

  const assignTargetCount =
    selectedDayIsos.length * selectedUnitIds.length * selectedSlotIds.length;

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

  async function persistToCell(
    targetDayIso,
    targetUnitId,
    targetSlotId,
    targetAssignmentId = null,
  ) {
    const dk = isoDateKey(targetDayIso);
    const row = findScheduleRowForCell(weekLoadsForLookup, dk, targetSlotId, {
      inUseUnitId: targetUnitId,
      scheduleAssignmentId: targetAssignmentId,
    });

    const calc = calcOptionsFromSheet(selectedSheet);
    const payload = buildScheduleLoadPayload({
      loadsheetId: selectedSheet.id,
      loadNumber: selectedSheet.load_number,
      origin: selectedSheet.origin,
      endUser: selectedSheet.end_user,
      mt: selectedSheet.mt,
      rate: selectedSheet.rate,
      fsc: selectedSheet.fsc,
      broker: selectedSheet.broker,
      flatRate: calc.flatRate,
      loadCategory: calc.loadCategory,
      usdCadRate: calc.usdCadRate,
      kms: selectedSheet.kms,
      invoiced: false,
    });

    return persistScheduleLoad(supabase, {
      scheduleLoadId: row?.id ?? null,
      weekId,
      weekStartISO,
      loadDate: dk,
      loadSlotId: targetSlotId,
      inUseUnitId: targetUnitId,
      scheduleAssignmentId: targetAssignmentId,
      payload,
    });
  }

  async function handleApply(e) {
    e.preventDefault();
    if (!weekId || !dayIso || !loadsheetId || !selectedSheet) {
      alert("Choose a load sheet.");
      return;
    }
    if (!loadsheets.length) {
      alert("Create a load sheet first (New load sheet).");
      return;
    }

    if (multiAssignMode) {
      if (
        !selectedDayIsos.length ||
        !selectedUnitIds.length ||
        !selectedSlotIds.length
      ) {
        alert("Select at least one day, one driver, and one slot.");
        return;
      }
      if (!daySlots.length) {
        alert("No load slots available. Fix load_slots access, then try again.");
        return;
      }
      setSaving(true);
      let applied = 0;
      let lastError = null;

      for (const dayKey of selectedDayIsos) {
        for (const uid of selectedUnitIds) {
          for (const sid of selectedSlotIds) {
            const { data, error } = await persistToCell(dayKey, uid, sid);
            if (error) {
              lastError = error;
              break;
            }
            if (data) {
              onLoadPatched?.(data);
              applied += 1;
            }
          }
          if (lastError) break;
        }
        if (lastError) break;
      }

      setSaving(false);

      if (lastError) {
        const msg = lastError.message ?? "";
        if (
          /loadsheet_id|load_number|\bfsc\b|\bload_note\b|column .* does not exist/i.test(
            msg,
          )
        ) {
          alert(
            "Apply the latest Supabase migration (loadsheets + schedule_loads columns), then try again.",
          );
        } else if (applied > 0) {
          alert(
            `${scheduleLoadErrorMessage(msg)}\n\n${applied} cell(s) were updated before the error.`,
          );
        } else {
          alert(scheduleLoadErrorMessage(msg));
        }
        if (applied > 0) await onAssigned?.();
        return;
      }

      await onAssigned?.();
      onClose();
      return;
    }

    if ((!inUseUnitId && !scheduleAssignmentId) || !slotId) {
      alert("Choose a load sheet and a slot.");
      return;
    }
    setSaving(true);
    const { data, error } = await persistToCell(
      dayIso,
      inUseUnitId,
      slotId,
      scheduleAssignmentId,
    );
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
        alert(scheduleLoadErrorMessage(error.message));
      }
      return;
    }

    if (data) {
      onLoadPatched?.(data);
    }
    await onAssigned?.();
    onClose();
  }

  if (!open) return null;

  const selectClass =
    "mt-1 w-full rounded-lg border border-green-950/25 bg-white px-3 py-2 text-sm text-green-950 outline-none focus:border-green-950/50";
  const checkRowClass =
    "flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-green-950/5";

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
          {multiAssignMode ? (
            <>
              Opened from: <strong>{dayTitle}</strong> ({dayIso})
            </>
          ) : (
            <>
              Day: <strong>{dayTitle}</strong> ({dayIso})
            </>
          )}
        </p>
        <p className="mb-4 text-sm text-green-900/75">
          Choose a saved sheet
          {multiAssignMode
            ? ", then pick days, drivers, and slots to fill."
            : " and slot, then apply — values are copied into this week only."}{" "}
          To change the reusable template itself, use <strong>Sheet</strong> on a
          load card.
        </p>

        {loadsheets.length === 0 ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            No load sheets yet. Tap <strong>New load sheet</strong> in the bottom
            bar, save one, then try again.
          </p>
        ) : null}

        {sortedSlots.length === 0 ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-snug text-amber-950">
            No slot choices: the app could not list{" "}
            <span className="font-mono">load_slots</span> (empty table, RLS
            blocking SELECT, or not signed in). Run migration{" "}
            <span className="font-mono">
              20260220120000_ensure_three_canonical_load_slots
            </span>{" "}
            or add three rows with <span className="font-mono">sort_order</span>{" "}
            1–3, and grant <span className="font-mono">authenticated</span> read
            access.
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

          {multiAssignMode ? (
            <>
              <div className="rounded-lg border border-green-950/20 bg-green-950/3 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Days</span>
                  {weekDays.length > 0 ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-green-900 underline hover:no-underline"
                      onClick={() => {
                        const all = weekDays.map((d) => isoDateKey(d.iso));
                        const allSelected =
                          all.length > 0 &&
                          all.every((id) => selectedDayIsos.includes(id));
                        setSelectedDayIsos(allSelected ? [] : all);
                      }}
                    >
                      {weekDays.every((d) =>
                        selectedDayIsos.includes(isoDateKey(d.iso)),
                      )
                        ? "Clear all"
                        : "Select all"}
                    </button>
                  ) : null}
                </div>
                {weekDays.length === 0 ? (
                  <p className="text-sm text-green-900/75">
                    Week days could not be loaded.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                    {weekDays.map((d) => {
                      const id = isoDateKey(d.iso);
                      return (
                        <label key={id} className={checkRowClass}>
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-green-950"
                            checked={selectedDayIsos.includes(id)}
                            onChange={() =>
                              setSelectedDayIsos((prev) => toggleId(prev, id))
                            }
                          />
                          <span className="truncate">
                            {d.columnTitle ?? d.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-green-950/20 bg-green-950/3 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Drivers</span>
                  {filteredAssignableUnits.length > 0 ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-green-900 underline hover:no-underline"
                      onClick={() => {
                        const all = filteredAssignableUnits.map((u) =>
                          String(u.inUseUnitId),
                        );
                        const allSelected =
                          all.length > 0 &&
                          all.every((id) => selectedUnitIds.includes(id));
                        setSelectedUnitIds(allSelected ? [] : all);
                      }}
                    >
                      {filteredAssignableUnits.every((u) =>
                        selectedUnitIds.includes(String(u.inUseUnitId)),
                      )
                        ? "Clear all"
                        : "Select all"}
                    </button>
                  ) : null}
                </div>
                {filteredAssignableUnits.length === 0 ? (
                  <p className="text-sm text-green-900/75">
                    No assigned units in the{" "}
                    <strong>
                      {calcOptionsFromSheet(selectedSheet).loadCategory ===
                      "cattle"
                        ? "Cattle"
                        : "Chicken"}
                    </strong>{" "}
                    division this week.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-0.5 overflow-y-auto">
                    {filteredAssignableUnits.map((u) => {
                      const id = String(u.inUseUnitId);
                      return (
                        <label key={id} className={checkRowClass}>
                          <input
                            type="checkbox"
                            className="size-4 shrink-0 accent-green-950"
                            checked={selectedUnitIds.includes(id)}
                            onChange={() =>
                              setSelectedUnitIds((prev) => toggleId(prev, id))
                            }
                          />
                          <span>{u.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-green-950/20 bg-green-950/3 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    Slots (1 = top, 3 = bottom)
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-green-900 underline hover:no-underline"
                    onClick={() => {
                      const all = daySlots.map((s) => String(s.id));
                      const allSelected =
                        all.length > 0 &&
                        all.every((id) => selectedSlotIds.includes(id));
                      setSelectedSlotIds(allSelected ? [] : all);
                    }}
                  >
                    {daySlots.length > 0 &&
                    daySlots.every((s) =>
                      selectedSlotIds.includes(String(s.id)),
                    )
                      ? "Clear all"
                      : "Select all"}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {daySlots.map((s, idx) => {
                    const id = String(s.id);
                    return (
                      <label key={id} className={checkRowClass}>
                        <input
                          type="checkbox"
                          className="size-4 shrink-0 accent-green-950"
                          checked={selectedSlotIds.includes(id)}
                          onChange={() =>
                            setSelectedSlotIds((prev) => toggleId(prev, id))
                          }
                        />
                        <span>{slotSelectLabel(s, idx)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {assignTargetCount > 0 ? (
                <p className="text-xs text-green-900/80">
                  Will copy this sheet into{" "}
                  <strong>{assignTargetCount}</strong> schedule cell
                  {assignTargetCount === 1 ? "" : "s"}
                  {selectedDayIsos.length > 1
                    ? ` across ${selectedDayIsos.length} days`
                    : selectedDayIsos.length === 1
                      ? " on the selected day"
                      : ""}
                  .
                </p>
              ) : null}
            </>
          ) : (
            <label className="block text-sm font-medium">
              Slot (1 = top of day, 3 = bottom)
              <select
                className={selectClass}
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
                required
              >
                {daySlots.length === 0 ? (
                  <option value="">
                    No slots — fix load_slots access (see note above)
                  </option>
                ) : (
                  daySlots.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {slotSelectLabel(s, idx)}
                    </option>
                  ))
                )}
              </select>
            </label>
          )}

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
              text={
                saving
                  ? "Applying…"
                  : multiAssignMode && assignTargetCount > 1
                    ? `Apply to ${assignTargetCount} cells`
                    : "Apply to schedule"
              }
            />
          </div>
        </form>
      </div>
    </div>
  );
}
