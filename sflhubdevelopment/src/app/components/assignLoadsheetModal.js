"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { createClient } from "@/lib/supabase/client";
import {
  calcOptionsFromSheet,
  driverDivisionMatchesLoadCategory,
  loadCategoryLabel,
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
import { assignableUnitRowKey } from "@/lib/scheduleWeekAssign";
import {
  computeLoadTotalDisplay,
  formatLoadTotalCad,
} from "@/lib/loadTotal";
import SearchableSelect from "./searchableSelect";
const LOADS_PER_DAY = 3;

function PreviewRow({ label, value }) {
  const text = strTrim(value);
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-green-900/60">
        {label}
      </dt>
      <dd
        className={`min-w-0 text-sm ${
          text ? "font-medium text-green-950" : "text-green-900/40"
        }`}
      >
        {text || "—"}
      </dd>
    </div>
  );
}

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

function sourceAssignableKey(inUseUnitId, scheduleAssignmentId) {
  if (inUseUnitId != null && String(inUseUnitId).trim() !== "") {
    return String(inUseUnitId);
  }
  if (
    scheduleAssignmentId != null &&
    String(scheduleAssignmentId).trim() !== ""
  ) {
    return `sa:${scheduleAssignmentId}`;
  }
  return "";
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

/** A schedule cell already has load content (not an empty placeholder row). */
function scheduleLoadIsTaken(row) {
  if (!row) return false;
  return [
    row.loadsheet_id,
    row.load_number,
    row.origin,
    row.end_user,
    row.load_note,
    row.mt,
    row.rate,
  ].some((v) => String(v ?? "").trim() !== "");
}

function scheduleCellIsOpen(
  weekLoads,
  dayIso,
  slotId,
  { inUseUnitId = null, scheduleAssignmentId = null } = {},
) {
  const row = findScheduleRowForCell(weekLoads, dayIso, slotId, {
    inUseUnitId,
    scheduleAssignmentId,
  });
  return !scheduleLoadIsTaken(row);
}

/**
 * Pick a saved load sheet and a slot for that day; writes schedule_loads for this unit.
 * All load sheets support assigning to multiple drivers, days, and slots via checkboxes.
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
  /** Multi-assign: open slot ids keyed by day ISO (taken slots excluded per day). */
  const [selectedDaySlots, setSelectedDaySlots] = useState({});
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
      setLoadsheetId(loadsheets[0] ? String(loadsheets[0].id) : "");

      const sourceKey = sourceAssignableKey(
        inUseUnitId,
        scheduleAssignmentId,
      );
      setSelectedUnitIds(sourceKey ? [sourceKey] : []);
      setSelectedDaySlots({});

      const openDay =
        dayIso != null && String(dayIso).trim() !== "" ? isoDateKey(dayIso) : "";
      const dayValid =
        openDay && weekDays.some((d) => isoDateKey(d.iso) === openDay);
      setSelectedDayIsos(dayValid ? [openDay] : []);
    });
  }, [open, initialSlotId, inUseUnitId, scheduleAssignmentId, dayIso, weekDays]);

  const selectedSheet = useMemo(
    () => loadsheets.find((s) => String(s.id) === String(loadsheetId)),
    [loadsheets, loadsheetId],
  );

  const multiAssignMode = useMemo(() => {
    if (!selectedSheet) return false;
    const calc = calcOptionsFromSheet(selectedSheet);
    return supportsMultiDriverAssign(calc.loadCategory);
  }, [selectedSheet]);

  const sourceUnitKey = sourceAssignableKey(
    inUseUnitId,
    scheduleAssignmentId,
  );

  const filteredAssignableUnits = useMemo(() => {
    const sourceKey = sourceAssignableKey(inUseUnitId, scheduleAssignmentId);
    let list = assignableUnits;
    if (multiAssignMode && selectedSheet) {
      const calc = calcOptionsFromSheet(selectedSheet);
      list = assignableUnits.filter(
        (u) =>
          assignableUnitRowKey(u) === sourceKey ||
          driverDivisionMatchesLoadCategory(calc.loadCategory, u.division),
      );
    }
    if (!sourceKey) return list;
    const sourceIdx = list.findIndex(
      (u) => assignableUnitRowKey(u) === sourceKey,
    );
    if (sourceIdx <= 0) return list;
    const next = [...list];
    const [source] = next.splice(sourceIdx, 1);
    next.unshift(source);
    return next;
  }, [
    assignableUnits,
    multiAssignMode,
    selectedSheet,
    inUseUnitId,
    scheduleAssignmentId,
  ]);

  useEffect(() => {
    if (!open || !multiAssignMode) return;
    const valid = new Set(
      filteredAssignableUnits.map((u) => assignableUnitRowKey(u)),
    );
    setSelectedUnitIds((prev) => {
      const next = prev.filter((id) => valid.has(id) || id === sourceUnitKey);
      if (
        sourceUnitKey &&
        valid.has(sourceUnitKey) &&
        !next.includes(sourceUnitKey)
      ) {
        return [sourceUnitKey, ...next];
      }
      return next;
    });
  }, [
    open,
    multiAssignMode,
    filteredAssignableUnits,
    loadsheetId,
    sourceUnitKey,
  ]);

  const weekLoadsForLookup = allWeekLoads ?? loads;

  const unitsForSlotCheck = useMemo(() => {
    if (multiAssignMode) {
      const selected = filteredAssignableUnits.filter((u) =>
        selectedUnitIds.includes(assignableUnitRowKey(u)),
      );
      if (selected.length) return selected;
      if (inUseUnitId != null || scheduleAssignmentId != null) {
        return [{ inUseUnitId, scheduleAssignmentId }];
      }
      return [];
    }
    return [{ inUseUnitId, scheduleAssignmentId }];
  }, [
    multiAssignMode,
    filteredAssignableUnits,
    selectedUnitIds,
    inUseUnitId,
    scheduleAssignmentId,
  ]);

  /** Open slots per day — a taken slot on Monday does not hide Tuesday's same slot. */
  const openSlotsByDay = useMemo(() => {
    const map = new Map();
    const days = multiAssignMode
      ? selectedDayIsos.map(isoDateKey).filter(Boolean)
      : dayIso
        ? [isoDateKey(dayIso)]
        : [];

    for (const dk of days) {
      const open = daySlots.filter((slot) => {
        if (!unitsForSlotCheck.length) return true;
        return unitsForSlotCheck.some((unit) =>
          scheduleCellIsOpen(weekLoadsForLookup, dk, slot.id, {
            inUseUnitId: unit.inUseUnitId ?? null,
            scheduleAssignmentId: unit.scheduleAssignmentId ?? null,
          }),
        );
      });
      map.set(dk, open);
    }
    return map;
  }, [
    multiAssignMode,
    selectedDayIsos,
    dayIso,
    daySlots,
    unitsForSlotCheck,
    weekLoadsForLookup,
  ]);

  /** Single-day (non-multi) dropdown: open slots for the opened day only. */
  const availableSlots = useMemo(() => {
    if (multiAssignMode) return [];
    const dk = dayIso ? isoDateKey(dayIso) : "";
    return openSlotsByDay.get(dk) ?? [];
  }, [multiAssignMode, dayIso, openSlotsByDay]);

  useEffect(() => {
    if (!open || multiAssignMode) return;
    const ids = new Set(availableSlots.map((s) => String(s.id)));
    const want =
      initialSlotId != null && String(initialSlotId).trim() !== ""
        ? String(initialSlotId)
        : "";
    const preferred = want && ids.has(want) ? want : "";
    const first = preferred || (availableSlots[0]?.id
      ? String(availableSlots[0].id)
      : "");
    setSlotId((prev) => (prev && ids.has(prev) ? prev : first));
  }, [open, multiAssignMode, availableSlots, initialSlotId]);

  useEffect(() => {
    if (!open || !multiAssignMode) return;
    setSelectedDaySlots((prev) => {
      const next = {};
      for (const rawDay of selectedDayIsos) {
        const dk = isoDateKey(rawDay);
        if (!dk) continue;
        const openList = openSlotsByDay.get(dk) ?? [];
        const openIds = new Set(openList.map((s) => String(s.id)));
        const kept = (prev[dk] ?? []).filter((id) => openIds.has(id));
        if (kept.length) {
          next[dk] = kept;
          continue;
        }
        const want =
          initialSlotId != null && String(initialSlotId).trim() !== ""
            ? String(initialSlotId)
            : "";
        const preferred = want && openIds.has(want) ? want : "";
        const first = preferred || (openList[0]?.id ? String(openList[0].id) : "");
        next[dk] = first ? [first] : [];
      }
      return next;
    });
  }, [open, multiAssignMode, selectedDayIsos, openSlotsByDay, initialSlotId]);

  const assignTargetCount = useMemo(() => {
    if (!multiAssignMode) return 0;
    let count = 0;
    for (const rawDay of selectedDayIsos) {
      const dk = isoDateKey(rawDay);
      const slotIds = selectedDaySlots[dk] ?? [];
      if (!dk || !slotIds.length) continue;
      for (const rowKey of selectedUnitIds) {
        const unitRow = filteredAssignableUnits.find(
          (u) => assignableUnitRowKey(u) === rowKey,
        );
        for (const sid of slotIds) {
          if (
            scheduleCellIsOpen(weekLoadsForLookup, dk, sid, {
              inUseUnitId: unitRow?.inUseUnitId ?? null,
              scheduleAssignmentId: unitRow?.scheduleAssignmentId ?? null,
            })
          ) {
            count += 1;
          }
        }
      }
    }
    return count;
  }, [
    multiAssignMode,
    selectedDayIsos,
    selectedDaySlots,
    selectedUnitIds,
    filteredAssignableUnits,
    weekLoadsForLookup,
  ]);

  const dayTitleByIso = useMemo(() => {
    const map = new Map();
    for (const d of weekDays) {
      map.set(isoDateKey(d.iso), d.columnTitle ?? d.label ?? isoDateKey(d.iso));
    }
    return map;
  }, [weekDays]);

  const preview = selectedSheet
    ? (() => {
        const calc = calcOptionsFromSheet(selectedSheet);
        const totalRaw = computeLoadTotalDisplay(
          selectedSheet.mt,
          selectedSheet.rate,
          selectedSheet.fsc,
          {
            loadCategory: calc.loadCategory,
            usdCadRate: calc.usdCadRate,
            kms: selectedSheet.kms,
            flatRate: calc.flatRate,
          },
        );
        const notesAuto = buildScheduleLoadNote(
          selectedSheet.load_number,
          selectedSheet.broker,
        );
        return {
          load_number: strTrim(selectedSheet.load_number),
          broker: strTrim(selectedSheet.broker),
          origin: strTrim(selectedSheet.origin),
          end_user: strTrim(selectedSheet.end_user),
          mt: strTrim(selectedSheet.mt),
          rate: strTrim(selectedSheet.rate),
          fsc: strTrim(selectedSheet.fsc),
          kms: strTrim(selectedSheet.kms),
          category: loadCategoryLabel(calc.loadCategory),
          total: formatLoadTotalCad(totalRaw),
          notesAuto: strTrim(notesAuto),
        };
      })()
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
      const hasSlotSelection = selectedDayIsos.some(
        (d) => (selectedDaySlots[isoDateKey(d)] ?? []).length > 0,
      );
      if (
        !selectedDayIsos.length ||
        !selectedUnitIds.length ||
        !hasSlotSelection
      ) {
        alert("Select at least one day, one driver, and one slot.");
        return;
      }
      if (!daySlots.length) {
        alert("No load slots available. Fix load_slots access, then try again.");
        return;
      }
      if (assignTargetCount === 0) {
        alert(
          "No open cells for the selected days, drivers, and slots. Clear a load or pick different targets.",
        );
        return;
      }
      setSaving(true);
      let applied = 0;
      let lastError = null;

      for (const dayKey of selectedDayIsos) {
        const dk = isoDateKey(dayKey);
        const slotsForDay = selectedDaySlots[dk] ?? [];
        for (const rowKey of selectedUnitIds) {
          const unitRow = filteredAssignableUnits.find(
            (u) => assignableUnitRowKey(u) === rowKey,
          );
          for (const sid of slotsForDay) {
            if (
              !scheduleCellIsOpen(weekLoadsForLookup, dk, sid, {
                inUseUnitId: unitRow?.inUseUnitId ?? null,
                scheduleAssignmentId: unitRow?.scheduleAssignmentId ?? null,
              })
            ) {
              continue;
            }
            const { data, error } = await persistToCell(
              dk,
              unitRow?.inUseUnitId ?? null,
              sid,
              unitRow?.scheduleAssignmentId ?? null,
            );
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
      alert(
        availableSlots.length === 0
          ? "No open slots for this day. Clear a load first or pick another day."
          : "Choose a load sheet and a slot.",
      );
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
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 text-green-950 shadow-xl"
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
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <SearchableSelect
              open={open}
              label="Load sheet"
              placeholder="Search load sheets…"
              emptyMessage="No load sheets match."
              options={loadsheets}
              value={loadsheetId}
              onChange={setLoadsheetId}
              autoSelectFirst
              selectOnNavigate
              autoFocus
              className="min-w-0 p-0"
              listClassName="max-h-64"
              getOptionValue={(s) => String(s.id)}
              getOptionLabel={(s) => {
                const num = strTrim(s.load_number) || String(s.id);
                const origin = strTrim(s.origin);
                const endUser = strTrim(s.end_user);
                const parts = [num];
                if (origin) parts.push(origin);
                if (endUser) parts.push(endUser);
                return parts.join(" · ");
              }}
            />
            <div className="flex min-h-64 max-h-80 flex-col overflow-y-auto rounded-lg border border-green-950/20 bg-green-950/5 p-3 text-green-900">
              <div className="mb-1 text-sm font-semibold text-green-950">
                Load sheet preview
              </div>
              <p className="mb-3 text-[11px] leading-snug text-green-900/70">
                This is what will be copied onto the schedule when you apply.
              </p>
              {preview ? (
                <dl className="flex min-w-0 flex-col gap-2">
                  <PreviewRow label="Load #" value={preview.load_number} />
                  <PreviewRow label="Broker" value={preview.broker} />
                  <PreviewRow label="Type" value={preview.category} />
                  <div className="my-1 border-t border-green-950/10" />
                  <PreviewRow label="Origin" value={preview.origin} />
                  <PreviewRow label="End user" value={preview.end_user} />
                  <div className="my-1 border-t border-green-950/10" />
                  <PreviewRow label="MT" value={preview.mt} />
                  <PreviewRow label="Rate" value={preview.rate} />
                  <PreviewRow label="FSC" value={preview.fsc} />
                  {preview.kms ? (
                    <PreviewRow label="KMs" value={preview.kms} />
                  ) : null}
                  <PreviewRow label="Total" value={preview.total} />
                  <div className="my-1 border-t border-green-950/10" />
                  <div>
                    <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-green-900/60">
                      Load notes
                    </dt>
                    <dd className="whitespace-pre-wrap rounded-md border border-green-950/10 bg-white/70 px-2 py-1.5 text-sm font-medium text-green-950">
                      {preview.notesAuto || "—"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-green-900/70">
                  Highlight a load sheet to preview it.
                </p>
              )}
            </div>
          </div>

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
                          assignableUnitRowKey(u),
                        );
                        const allSelected =
                          all.length > 0 &&
                          all.every((id) => selectedUnitIds.includes(id));
                        setSelectedUnitIds(allSelected ? [] : all);
                      }}
                    >
                      {filteredAssignableUnits.every((u) =>
                        selectedUnitIds.includes(assignableUnitRowKey(u)),
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
                      {loadCategoryLabel(
                        calcOptionsFromSheet(selectedSheet).loadCategory,
                      )}
                    </strong>{" "}
                    division this week.
                  </p>
                ) : (
                  <div className="max-h-40 space-y-0.5 overflow-y-auto">
                    {filteredAssignableUnits.map((u) => {
                      const id = assignableUnitRowKey(u);
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
                    Slots (open per day)
                  </span>
                </div>
                {selectedDayIsos.length === 0 ? (
                  <p className="text-sm text-green-900/75">
                    Select at least one day to choose slots.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayIsos.map((rawDay) => {
                      const dk = isoDateKey(rawDay);
                      const openForDay = openSlotsByDay.get(dk) ?? [];
                      const selectedForDay = selectedDaySlots[dk] ?? [];
                      return (
                        <div key={dk}>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-green-950">
                              {dayTitleByIso.get(dk) ?? dk}
                            </span>
                            {openForDay.length > 0 ? (
                              <button
                                type="button"
                                className="text-xs font-semibold text-green-900 underline hover:no-underline"
                                onClick={() => {
                                  const all = openForDay.map((s) =>
                                    String(s.id),
                                  );
                                  const allSelected =
                                    all.length > 0 &&
                                    all.every((id) =>
                                      selectedForDay.includes(id),
                                    );
                                  setSelectedDaySlots((prev) => ({
                                    ...prev,
                                    [dk]: allSelected ? [] : all,
                                  }));
                                }}
                              >
                                {openForDay.every((s) =>
                                  selectedForDay.includes(String(s.id)),
                                )
                                  ? "Clear"
                                  : "Select all"}
                              </button>
                            ) : null}
                          </div>
                          {openForDay.length === 0 ? (
                            <p className="text-sm text-green-900/75">
                              No open slots this day for the selected driver(s).
                            </p>
                          ) : (
                            <div className="space-y-0.5">
                              {openForDay.map((s) => {
                                const id = String(s.id);
                                const originalIndex = daySlots.findIndex(
                                  (slot) => String(slot.id) === id,
                                );
                                return (
                                  <label key={id} className={checkRowClass}>
                                    <input
                                      type="checkbox"
                                      className="size-4 shrink-0 accent-green-950"
                                      checked={selectedForDay.includes(id)}
                                      onChange={() =>
                                        setSelectedDaySlots((prev) => ({
                                          ...prev,
                                          [dk]: toggleId(
                                            prev[dk] ?? [],
                                            id,
                                          ),
                                        }))
                                      }
                                    />
                                    <span>
                                      {slotSelectLabel(
                                        s,
                                        originalIndex >= 0
                                          ? originalIndex
                                          : 0,
                                      )}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {assignTargetCount > 0 ? (
                <p className="text-xs text-green-900/80">
                  Will copy this sheet into{" "}
                  <strong>{assignTargetCount}</strong> open schedule cell
                  {assignTargetCount === 1 ? "" : "s"}
                  {selectedDayIsos.length > 1
                    ? ` across ${selectedDayIsos.length} days`
                    : selectedDayIsos.length === 1
                      ? " on the selected day"
                      : ""}
                  . Taken slots on other days stay untouched.
                </p>
              ) : null}
            </>
          ) : (
            <label className="block text-sm font-medium">
              Slot (open only)
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
                ) : availableSlots.length === 0 ? (
                  <option value="">No open slots for this day</option>
                ) : (
                  availableSlots.map((s) => {
                    const originalIndex = daySlots.findIndex(
                      (slot) => String(slot.id) === String(s.id),
                    );
                    return (
                      <option key={s.id} value={s.id}>
                        {slotSelectLabel(
                          s,
                          originalIndex >= 0 ? originalIndex : 0,
                        )}
                      </option>
                    );
                  })
                )}
              </select>
            </label>
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
