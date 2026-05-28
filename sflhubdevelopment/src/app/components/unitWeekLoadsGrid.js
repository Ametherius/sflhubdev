"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { weekDayLabels } from "@/lib/weekDates";
import {
  calcOptionsFromSheet,
  fieldRulesForCategory,
  totalFormulaHint,
} from "@/lib/loadCategory";
import {
  computeLoadTotalDisplay,
  formatLoadTotalCadGrid,
} from "@/lib/loadTotal";
import {
  persistScheduleLoad,
  scheduleLoadErrorMessage,
} from "@/lib/scheduleLoadsPersist";
import { resolveLoadInvoiced } from "@/lib/weekUnitRevenue";
import { createClient } from "@/lib/supabase/client";
import AssignLoadsheetModal from "./assignLoadsheetModal";
import EditLoadsheetModal from "./editLoadsheetModal";

const LOADS_PER_DAY = 3; // fixed; matches DB ensure_schedule_loads_for_week (limit 3) + canonical load_slots

/** Embedded schedule: fixed day columns; scroll wrapper is ScheduleRow. */
const EMBEDDED_DAY_COL_BASE_PX = 296;
const EMBEDDED_DAY_COL_EXTRA_REM = 3;
const EMBEDDED_DAY_COL_PX =
  EMBEDDED_DAY_COL_BASE_PX + EMBEDDED_DAY_COL_EXTRA_REM * 16;
const EMBEDDED_GRID_GAP_PX = 8;
const EMBEDDED_GRID_WIDTH_PX =
  7 * EMBEDDED_DAY_COL_PX + 6 * EMBEDDED_GRID_GAP_PX;
const EMBEDDED_GRID_STYLE = {
  gridTemplateColumns: `repeat(7, calc(${EMBEDDED_DAY_COL_BASE_PX}px + ${EMBEDDED_DAY_COL_EXTRA_REM}rem))`,
  width: EMBEDDED_GRID_WIDTH_PX,
  minWidth: EMBEDDED_GRID_WIDTH_PX,
};
const EMBEDDED_ROOT_CLASS = "relative flex h-full min-h-0 shrink-0 flex-col";
const EMBEDDED_GRID_CLASS = "grid min-h-0 shrink-0 gap-x-2 gap-y-1";

/** Normalize PostgREST date / string to YYYY-MM-DD for map keys. */
function isoDateKey(raw) {
  if (raw == null) return "";
  const s = String(raw);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function nullIfEmpty(s) {
  const t = String(s ?? "").trim();
  return t.length ? t : null;
}

function strField(v) {
  return v != null && String(v).trim() !== "" ? String(v) : "";
}

function slotLabel(slot) {
  if (slot?.__pad) return `Load ${slot.sort_order}`;
  if (slot?.name != null && String(slot.name).trim() !== "") return slot.name;
  if (slot?.label != null && String(slot.label).trim() !== "")
    return slot.label;
  return `Load ${slot.sort_order ?? "?"}`;
}

function slotsFromLoads(loads) {
  const byId = new Map();
  for (const row of loads ?? []) {
    const ls = row.load_slots;
    const id = row.load_slot_id ?? ls?.id;
    if (!id) continue;
    if (!byId.has(id)) {
      byId.set(id, {
        id,
        sort_order: ls?.sort_order ?? 0,
        name: ls?.name,
        label: ls?.label,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) => {
    const o = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (o !== 0) return o;
    return String(a.id).localeCompare(String(b.id));
  });
}

const fieldStack =
  "w-full min-w-0 border-0 border-b border-neutral-300 bg-white px-2.5 py-2 text-left text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:bg-neutral-50";

const fieldStackInvoiced =
  "w-full border-0 border-b border-neutral-300 bg-green-300 px-2.5 py-2 text-left text-sm text-neutral-900 outline-none placeholder:text-neutral-500 focus:bg-green-300";

const fieldCell =
  "min-h-9 h-9 max-h-9 w-full min-w-0 max-w-full border-0 border-r border-neutral-300 bg-white px-1 py-1 text-center text-sm leading-snug text-neutral-900 outline-none placeholder:text-neutral-400 last:border-r-0 focus:bg-neutral-50";

/** Read-only total: fixed height; matches pre-scroll layout proportions. */
const fieldCellTotal =
  "min-h-9 h-9 max-h-9 w-full min-w-0 max-w-full border-0 border-r border-neutral-300 bg-neutral-100 px-0.5 py-0 text-neutral-700 last:border-r-0 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:thin] flex items-center justify-center";

/**
 * Left: Origin, End user, then MT | Rate | FSC | Total in one compact row.
 * Right: Load notes (load # and broker when assigning from a load sheet).
 */
function LoadSplitCard({
  row,
  scheduleLoadId,
  dayIso,
  slotId,
  weekId,
  inUseUnitId,
  slot,
  fillColumn,
  onPersist,
  onEditLoadsheet,
  loadsheetInvoiced = false,
  loadsheetCalc = null,
}) {
  const slotTitle = slotLabel(slot);
  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [fsc, setFsc] = useState("");
  const [mt, setMt] = useState("");
  const [rate, setRate] = useState("");
  const [loadNote, setLoadNote] = useState("");
  const [loadsheetId, setLoadsheetId] = useState("");
  const pendingLocalRef = useRef(null);

  const sheetCategory = loadsheetCalc?.loadCategory ?? null;
  const sheetUsdCad = loadsheetCalc?.usdCadRate ?? null;
  const sheetKms = loadsheetCalc?.kms ?? null;
  const sheetFlatRate = Boolean(loadsheetCalc?.flatRate);
  const linkedSheet = loadsheetId.trim().length > 0 && loadsheetCalc != null;

  const fieldRules = fieldRulesForCategory(sheetCategory, sheetFlatRate);

  const loadTotalDisplay = useMemo(
    () =>
      computeLoadTotalDisplay(mt, rate, fsc, {
        loadCategory: sheetCategory,
        usdCadRate: sheetUsdCad,
        kms: sheetKms,
        flatRate: sheetFlatRate,
      }),
    [mt, rate, fsc, sheetCategory, sheetUsdCad, sheetKms, sheetFlatRate],
  );

  const totalHint = useMemo(
    () =>
      totalFormulaHint(sheetCategory, sheetFlatRate) + " → CAD on schedule",
    [sheetCategory, sheetFlatRate],
  );

  const loadTotalCad = useMemo(() => {
    const fromComputed = formatLoadTotalCadGrid(loadTotalDisplay);
    if (linkedSheet) {
      return fromComputed || "";
    }
    if (fromComputed) return fromComputed;
    return formatLoadTotalCadGrid(row?.load_total);
  }, [loadTotalDisplay, row?.load_total, linkedSheet]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- mirror schedule_loads row into local inputs */
    if (!row) {
      pendingLocalRef.current = null;
      setOrigin("");
      setEndUser("");
      setFsc("");
      setMt("");
      setRate("");
      setLoadNote("");
      setLoadsheetId("");
      return;
    }

    const pending = pendingLocalRef.current;
    const rowOrigin = strField(row.origin);
    const rowEndUser = strField(row.end_user);
    const rowFsc = strField(row.fsc);
    const rowMt = strField(row.mt);
    const rowRate = strField(row.rate);
    const rowNote = strField(row.load_note);
    const rowSheetId = strField(row.loadsheet_id);

    if (pending) {
      const caughtUp =
        rowOrigin === strField(pending.origin) &&
        rowEndUser === strField(pending.endUser) &&
        rowFsc === strField(pending.fsc) &&
        rowMt === strField(pending.mt) &&
        rowRate === strField(pending.rate) &&
        rowNote === strField(pending.loadNote) &&
        rowSheetId === strField(pending.loadsheetId);
      if (caughtUp) {
        pendingLocalRef.current = null;
      }
    }

    const p = pendingLocalRef.current;
    setOrigin(p?.origin ?? rowOrigin);
    setEndUser(p?.endUser ?? rowEndUser);
    setFsc(p?.fsc ?? rowFsc);
    setMt(p?.mt ?? rowMt);
    setRate(p?.rate ?? rowRate);
    setLoadNote(p?.loadNote ?? rowNote);
    setLoadsheetId(p?.loadsheetId ?? rowSheetId);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    row?.id,
    row?.origin,
    row?.end_user,
    row?.fsc,
    row?.mt,
    row?.rate,
    row?.load_note,
    row?.loadsheet_id,
    row?.load_total,
  ]);

  const save = useCallback(async () => {
    if (!slotId) return;
    const lid = loadsheetId.trim();
    const snapshot = {
      origin,
      endUser,
      fsc,
      mt,
      rate,
      loadNote,
      loadsheetId: lid,
    };
    pendingLocalRef.current = snapshot;
    const payload = {
      loadsheet_id: lid.length ? lid : null,
      origin: nullIfEmpty(origin),
      end_user: nullIfEmpty(endUser),
      fsc: nullIfEmpty(fsc),
      mt: nullIfEmpty(mt),
      rate: nullIfEmpty(rate),
      load_total: nullIfEmpty(loadTotalDisplay),
      load_note: nullIfEmpty(loadNote),
    };
    const ok = await onPersist({
      scheduleLoadId,
      dayIso,
      slotId,
      weekId,
      inUseUnitId,
      payload,
    });
    if (ok !== false) {
      pendingLocalRef.current = null;
    }
  }, [
    scheduleLoadId,
    dayIso,
    slotId,
    weekId,
    inUseUnitId,
    loadsheetId,
    origin,
    endUser,
    fsc,
    mt,
    rate,
    loadTotalDisplay,
    loadNote,
    sheetCategory,
    sheetUsdCad,
    sheetFlatRate,
    onPersist,
  ]);

  const rootGrow = fillColumn
    ? "flex h-full min-h-0 flex-1 flex-col"
    : "flex h-fit flex-col";
  const innerRow = fillColumn
    ? "flex min-h-0 flex-1 flex-row"
    : "flex w-full min-w-0 flex-row";

  const locationFieldClass = loadsheetInvoiced
    ? fieldStackInvoiced
    : fieldStack;

  return (
    <div
      className={`${rootGrow} relative w-full min-w-0 overflow-hidden rounded-lg border border-neutral-400/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]`}
    >
      <div className={innerRow}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-neutral-300 bg-white">
          <input
            type="text"
            className={locationFieldClass}
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            onBlur={() => void save()}
            placeholder="Origin"
            aria-label={`${slotTitle} origin`}
          />
          <input
            type="text"
            className={locationFieldClass}
            value={endUser}
            onChange={(e) => setEndUser(e.target.value)}
            onBlur={() => void save()}
            placeholder="End user"
            aria-label={`${slotTitle} end user`}
          />
          <div className="grid min-h-9 min-w-0 grid-cols-[minmax(2.5rem,1fr)_minmax(2.75rem,1fr)_minmax(2.75rem,1fr)_minmax(3.75rem,1.1fr)] border-t border-neutral-300">
            <input
              type="text"
              className={fieldCell}
              value={mt}
              onChange={(e) => setMt(e.target.value)}
              onBlur={() => void save()}
              placeholder="MT"
              disabled={loadsheetCalc != null && !fieldRules.showMt}
              aria-label={`${slotTitle} MT`}
            />
            <input
              type="text"
              className={fieldCell}
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              onBlur={() => void save()}
              placeholder="Rate"
              aria-label={`${slotTitle} rate`}
            />
            <input
              type="text"
              className={fieldCell}
              value={fsc}
              onChange={(e) => setFsc(e.target.value)}
              onBlur={() => void save()}
              placeholder="FSC"
              disabled={loadsheetCalc != null && !fieldRules.showFsc}
              aria-label={`${slotTitle} FSC`}
            />
            <div
              title={totalHint}
              className={`${fieldCellTotal} cursor-default`}
              aria-label={`${slotTitle} total (auto)`}
            >
              <span className="block w-full truncate px-0.5 text-center text-[10px] tabular-nums leading-tight text-neutral-800 sm:text-[11px]">
                {loadTotalCad || (
                  <span className="text-neutral-400">Total</span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex w-[10rem] max-w-[12rem] min-h-0 shrink-0 flex-col bg-green-950 p-2">
          <textarea
            className="min-h-[60px] flex-1 resize-y rounded-sm border border-white/90 bg-[#40916c]/35 p-2 text-sm leading-snug text-white outline-none placeholder:text-white/60 focus:bg-[#40916c]/55"
            value={loadNote}
            onChange={(e) => setLoadNote(e.target.value)}
            onBlur={() => void save()}
            placeholder="Load notes (load # and broker fill when you assign from a sheet)"
            aria-label={`${slotTitle} load notes`}
          />
        </div>
      </div>
      {typeof onEditLoadsheet === "function" && slot?.id ? (
        <button
          type="button"
          className="absolute bottom-1 right-1 z-[1] rounded border border-white/40 bg-[#1b4332]/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#1b4332]"
          title="Edit the saved load sheet (library template)"
          aria-label="Edit load sheet template"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditLoadsheet();
          }}
        >
          Sheet
        </button>
      ) : null}
    </div>
  );
}

/**
 * Seven day columns; each day has three load cards (Origin / End user / metrics | Load notes).
 */
export default function UnitWeekLoadsGrid({
  embeddedInRow = false,
  weekStartISO,
  weekId,
  inUseUnitId,
  loads = [],
  loadSlots = [],
  loadSheets = [],
  onUpdated,
  onLoadPatched,
  onLoadSheetsUpdated,
}) {
  const supabase = useMemo(() => createClient(), []);
  const [assignTarget, setAssignTarget] = useState(null);
  const [editLoadsheetTarget, setEditLoadsheetTarget] = useState(null);

  const days = useMemo(
    () => (weekStartISO ? weekDayLabels(weekStartISO) : []),
    [weekStartISO],
  );

  /** First three load_slots rows (matches ensure_schedule_loads limit 3), by sort_order then id. */
  const { slots, slotPlan, assignModalSlots } = useMemo(() => {
    const fromTable = loadSlots.length > 0;
    const sorted = fromTable
      ? [...loadSlots].sort((a, b) => {
          const o = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
          if (o !== 0) return o;
          return String(a.id).localeCompare(String(b.id));
        })
      : slotsFromLoads(loads);

    const out = [];
    for (let i = 0; i < LOADS_PER_DAY; i++) {
      out.push(
        sorted[i] ?? {
          id: null,
          sort_order: i + 1,
          name: null,
          __pad: true,
        },
      );
    }
    return {
      slots: out,
      slotPlan: { fromTable, defined: sorted.length, need: LOADS_PER_DAY },
      assignModalSlots: sorted
        .filter((s) => s != null && s.id != null && !s.__pad)
        .slice(0, LOADS_PER_DAY),
    };
  }, [loadSlots, loads]);

  const loadMap = useMemo(() => {
    const m = new Map();
    for (const row of loads ?? []) {
      const sid = row.load_slot_id ?? row.load_slots?.id;
      if (!sid) continue;
      const dk = isoDateKey(row.load_date);
      m.set(`${dk}-${String(sid)}`, row);
    }
    return m;
  }, [loads]);

  const sheetsById = useMemo(() => {
    const m = new Map();
    for (const sheet of loadSheets ?? []) {
      if (sheet?.id == null) continue;
      m.set(String(sheet.id), sheet);
    }
    return m;
  }, [loadSheets]);

  const calcBySheetId = useMemo(() => {
    const m = new Map();
    for (const sheet of loadSheets ?? []) {
      if (sheet?.id == null) continue;
      const id = String(sheet.id);
      m.set(id, {
        ...calcOptionsFromSheet(sheet),
        _rev: `${sheet.load_category ?? ""}|${sheet.usd_cad_rate ?? ""}|${sheet.flat_rate ?? ""}|${sheet.rate ?? ""}|${sheet.mt ?? ""}|${sheet.fsc ?? ""}|${sheet.kms ?? ""}`,
      });
    }
    return m;
  }, [loadSheets]);

  const persistRow = useCallback(
    async ({
      scheduleLoadId,
      dayIso,
      slotId,
      weekId: wk,
      inUseUnitId: unitId,
      payload,
    }) => {
      if (!slotId || !dayIso) return false;

      const { data, error } = await persistScheduleLoad(supabase, {
        scheduleLoadId: scheduleLoadId ?? null,
        weekId: wk,
        loadDate: dayIso,
        loadSlotId: slotId,
        inUseUnitId: unitId,
        payload,
      });

      if (error) {
        const colMissing = /column .* does not exist/i.test(
          error.message ?? "",
        );
        if (
          colMissing &&
          scheduleLoadId &&
          /fsc|load_total|loadsheet_id/i.test(error.message ?? "")
        ) {
          const { error: retryErr } = await supabase
            .from("schedule_loads")
            .update(payload)
            .eq("id", scheduleLoadId);
          if (!retryErr) {
            onLoadPatched?.({ id: scheduleLoadId, ...payload });
            await onUpdated?.();
            return true;
          }
        }
        if (
          /load_note|origin|end_user|\bmt\b|rate|load_total|loadsheet_id|load_number|\bfsc\b|column .* does not exist/i.test(
            error.message ?? "",
          )
        ) {
          alert(
            "Apply the latest Supabase migrations for schedule_loads detail columns, then try again.",
          );
        } else {
          alert(scheduleLoadErrorMessage(error.message));
        }
        return false;
      }

      if (data) {
        onLoadPatched?.(data);
      } else if (scheduleLoadId) {
        onLoadPatched?.({ id: scheduleLoadId, ...payload });
      }
      await onUpdated?.();
      return true;
    },
    [supabase, onUpdated, onLoadPatched],
  );

  if (!weekStartISO || days.length === 0) {
    const emptyWrap = embeddedInRow
      ? "flex min-h-[120px] items-center justify-center p-4 text-center text-sm text-neutral-600"
      : "mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-4 text-sm text-white/85";
    return (
      <p className={emptyWrap}>
        Select an active week to show this unit&apos;s load grid.
      </p>
    );
  }

  const rootShell = embeddedInRow
    ? EMBEDDED_ROOT_CLASS
    : "relative overflow-x-auto rounded-lg rounded-l-none border border-green-950 bg-white p-3 text-green-950 shadow-sm lg:-ml-px lg:border-l-0";

  const gridShell = embeddedInRow
    ? EMBEDDED_GRID_CLASS
    : "grid min-w-[980px] grid-cols-7 gap-3";

  const dayHeaderShell = embeddedInRow
    ? "relative flex flex-row items-center justify-center gap-1 rounded-t-md bg-[#1b4332] px-1.5 py-1 pr-7 text-[11px] font-semibold leading-tight text-white shadow-sm"
    : "rounded-t-lg bg-green-950 py-2.5 text-center text-[13px] font-semibold leading-tight text-white shadow-sm";

  const dayColShell = embeddedInRow
    ? "flex h-full min-h-0 min-w-0 flex-col gap-1"
    : "flex min-w-0 flex-col gap-2";

  const slotShortfall = slotPlan.need - slotPlan.defined;
  const showSlotShortfallBanner = slotShortfall > 0 && slotPlan.fromTable;

  const embeddedRootStyle = embeddedInRow
    ? { width: EMBEDDED_GRID_WIDTH_PX, minWidth: EMBEDDED_GRID_WIDTH_PX }
    : undefined;
  const embeddedGridStyle = embeddedInRow ? EMBEDDED_GRID_STYLE : undefined;

  return (
    <div className={rootShell} style={embeddedRootStyle}>
      {showSlotShortfallBanner ? (
        <div
          className={`mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-950 ${
            embeddedInRow ? "" : "mx-0"
          }`}
        >
          The <span className="font-mono">load_slots</span> table returned{" "}
          <strong>{slotPlan.defined}</strong> row
          {slotPlan.defined === 1 ? "" : "s"}; this grid needs{" "}
          <strong>{slotPlan.need}</strong>. Add <strong>{slotShortfall}</strong>{" "}
          more in Supabase (or fix RLS so the app can read them). Extra
          placeholder rows do not persist until they map to real{" "}
          <span className="font-mono">load_slots</span> ids.
        </div>
      ) : null}
      <div className={gridShell} style={embeddedGridStyle}>
        {days.map((d) => (
          <div key={d.iso} className={dayColShell}>
            <div className={dayHeaderShell}>
              {embeddedInRow && weekId && inUseUnitId ? (
                <>
                  <span className="min-w-0 max-w-full truncate text-center font-semibold">
                    {d.columnTitle ?? d.label}
                  </span>
                  <button
                    type="button"
                    title="Assign a load sheet to this day (copy into schedule)"
                    aria-label="Assign load sheet to this day"
                    className="absolute right-1 top-1/2 shrink-0 -translate-y-1/2 rounded border border-white/30 bg-white/10 px-1 py-px text-[12px] font-bold uppercase tracking-wide text-white hover:bg-white/20"
                    onClick={() =>
                      setAssignTarget({
                        dayIso: d.iso,
                        dayTitle: d.columnTitle ?? d.label,
                      })
                    }
                  >
                    +
                  </button>
                </>
              ) : (
                <span className="w-full text-center">
                  {d.columnTitle ?? d.label}
                </span>
              )}
            </div>
            <div
              className={
                embeddedInRow
                  ? "flex min-h-0 flex-1 flex-col gap-1"
                  : "flex flex-col gap-2"
              }
            >
              {slots.map((slot) => {
                const row =
                  slot.id != null
                    ? loadMap.get(`${d.iso}-${String(slot.id)}`)
                    : undefined;
                const sheetId =
                  row?.loadsheet_id != null ? String(row.loadsheet_id) : "";
                const loadsheetInvoiced = resolveLoadInvoiced(row, sheetsById);
                const loadsheetCalc =
                  sheetId.length > 0 ? calcBySheetId.get(sheetId) ?? null : null;
                return (
                  <LoadSplitCard
                    key={`${d.iso}-${slot.id ?? `pad-${slot.sort_order}`}-${sheetId}-${loadsheetCalc?._rev ?? ""}`}
                    fillColumn={embeddedInRow}
                    row={row}
                    loadsheetInvoiced={loadsheetInvoiced}
                    loadsheetCalc={loadsheetCalc}
                    scheduleLoadId={row?.id ?? null}
                    dayIso={d.iso}
                    slotId={slot.id}
                    weekId={weekId}
                    inUseUnitId={inUseUnitId}
                    slot={slot}
                    onPersist={persistRow}
                    onEditLoadsheet={
                      embeddedInRow && weekId && inUseUnitId && slot.id
                        ? () =>
                            setEditLoadsheetTarget({
                              initialLoadsheetId:
                                row?.loadsheet_id != null
                                  ? String(row.loadsheet_id)
                                  : null,
                              scheduleLoadId:
                                row?.id != null ? String(row.id) : null,
                            })
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <AssignLoadsheetModal
        open={assignTarget != null}
        onClose={() => setAssignTarget(null)}
        dayIso={assignTarget?.dayIso ?? ""}
        dayTitle={assignTarget?.dayTitle ?? ""}
        weekId={weekId}
        inUseUnitId={inUseUnitId}
        loadSlots={assignModalSlots}
        loads={loads}
        loadsheets={loadSheets}
        initialSlotId={assignTarget?.initialSlotId ?? null}
        onAssigned={onUpdated}
        onLoadPatched={onLoadPatched}
      />
      <EditLoadsheetModal
        open={editLoadsheetTarget != null}
        onClose={() => setEditLoadsheetTarget(null)}
        initialLoadsheetId={editLoadsheetTarget?.initialLoadsheetId ?? null}
        scheduleLoadId={editLoadsheetTarget?.scheduleLoadId ?? null}
        scheduleKms={editLoadsheetTarget?.scheduleKms}
        scheduleInvoiced={editLoadsheetTarget?.scheduleInvoiced}
        loadSheets={loadSheets}
        onSaved={onLoadSheetsUpdated ?? (async () => {})}
        onScheduleUpdated={onUpdated}
        onSchedulePatched={onLoadPatched}
        onScheduleUnlinked={onUpdated}
      />
    </div>
  );
}
