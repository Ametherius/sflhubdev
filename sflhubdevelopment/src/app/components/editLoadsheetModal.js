"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import {
  DEFAULT_LOAD_CATEGORY,
  LOAD_CATEGORIES,
  computeUsGrainUsdTotal,
  fetchLiveUsdCadRate,
  fieldRulesForCategory,
  loadCategoryFromStorage,
  loadCategoryStorageValue,
  normalizeLoadCategory,
  totalFormulaHint,
} from "@/lib/loadCategory";
import {
  computeLoadTotalDisplay,
  formatLoadTotalCad,
  formatUsdTotal,
} from "@/lib/loadTotal";
import {
  computeRevenuePerKm,
  formatRevenuePerKmCad,
} from "@/lib/revenuePerKm";
import {
  brokerFromScheduleLoadNote,
  buildScheduleLoadPayload,
  nextCopyLoadNumber,
} from "@/lib/loadsheetCopy";
import { createClient } from "@/lib/supabase/client";
import {
  persistScheduleLoad,
  SCHEDULE_LOAD_RETURN_SELECT,
} from "@/lib/scheduleLoadsPersist";
import { useConfirm } from "@/context/confirmContext";
import { saveChangesConfirmOptions } from "@/lib/confirmEdit";
import {
  FieldWithTextColor,
  parseFieldTextColors,
} from "./fieldWithTextColor";

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
  /** Current schedule_loads row from the grid (slot values, not the library template). */
  initialScheduleRow = null,
  /** Per-slot KMs / invoiced from schedule_loads (not the shared loadsheet). */
  scheduleKms = undefined,
  scheduleInvoiced = undefined,
  scheduleLoadCategory = undefined,
  scheduleUsdCadRate = undefined,
  readOnly = false,
  onSaved,
  /** Called after syncing this slot's schedule_loads row (refresh week loads) */
  onScheduleUpdated,
  /** Merge saved row into week loads immediately (before refetch) */
  onSchedulePatched,
  /** Called after unlinking schedule row from loadsheet (refresh week loads) */
  onScheduleUnlinked,
}) {
  const confirm = useConfirm();
  const supabase = useMemo(() => createClient(), []);
  const [selectedId, setSelectedId] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [mt, setMt] = useState("");
  const [rate, setRate] = useState("");
  const [fsc, setFsc] = useState("");
  const [broker, setBroker] = useState("");
  const [kms, setKms] = useState("");
  const [loadCategory, setLoadCategory] = useState(DEFAULT_LOAD_CATEGORY);
  const [usdCadRate, setUsdCadRate] = useState("");
  const [fetchingFx, setFetchingFx] = useState(false);
  const [invoiced, setInvoiced] = useState(false);
  const [fieldTextColors, setFieldTextColors] = useState({});
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const liveSyncReadyRef = useRef(false);
  const liveSyncGenRef = useRef(0);
  const lastHydratedKeyRef = useRef(null);
  const [scheduleSlotRow, setScheduleSlotRow] = useState(null);
  const liveSyncSuppressUntilRef = useRef(0);
  const slotMetaFetchGenRef = useRef(0);

  useEffect(() => {
    if (open) {
      lastHydratedKeyRef.current = null;
      liveSyncSuppressUntilRef.current = Date.now() + 700;
      setScheduleSlotRow(initialScheduleRow ?? null);
    } else {
      setScheduleSlotRow(null);
    }
  }, [open, initialScheduleRow]);

  /** Refresh slot row from DB when opened from schedule (values may differ from loadsheet library). */
  useEffect(() => {
    if (!open || !scheduleLoadId) return;
    const gen = ++slotMetaFetchGenRef.current;
    void (async () => {
      const { data, error } = await supabase
        .from("schedule_loads")
        .select(SCHEDULE_LOAD_RETURN_SELECT)
        .eq("id", scheduleLoadId)
        .maybeSingle();
      if (gen !== slotMetaFetchGenRef.current) return;
      if (error) {
        if (!/column .* does not exist/i.test(error.message ?? "")) {
          console.error(error.message);
        }
        return;
      }
      if (!data) return;
      setScheduleSlotRow(data);
      liveSyncSuppressUntilRef.current = Date.now() + 600;
    })();
  }, [open, scheduleLoadId, supabase]);

  useEffect(() => {
    if (!open) {
      liveSyncReadyRef.current = false;
      return;
    }
    liveSyncReadyRef.current = false;
    /* eslint-disable react-hooks/set-state-in-effect -- reset picker when modal opens */
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

  const fieldRules = useMemo(
    () => fieldRulesForCategory(loadCategory, false),
    [loadCategory],
  );

  const totalHint = useMemo(
    () => totalFormulaHint(loadCategory, false),
    [loadCategory],
  );

  const loadTotalPreview = useMemo(
    () =>
      computeLoadTotalDisplay(mt, rate, fsc, {
        loadCategory,
        usdCadRate,
        kms,
        flatRate: false,
      }),
    [mt, rate, fsc, loadCategory, usdCadRate, kms],
  );

  const loadTotalPreviewCad = useMemo(
    () => formatLoadTotalCad(loadTotalPreview),
    [loadTotalPreview],
  );

  const usdTotalPreview = useMemo(() => {
    if (loadCategory !== "us_grain") return "";
    return formatUsdTotal(computeUsGrainUsdTotal(mt, rate));
  }, [loadCategory, mt, rate]);

  const revenuePerKmPreview = useMemo(() => {
    const rev = loadTotalPreview
      ? Number(String(loadTotalPreview).replace(/,/g, ""))
      : null;
    const perKm =
      rev != null && Number.isFinite(rev)
        ? computeRevenuePerKm(rev, kms)
        : null;
    return formatRevenuePerKmCad(perKm);
  }, [loadTotalPreview, kms]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate form when sheet/slot changes */
    if (!open) {
      lastHydratedKeyRef.current = null;
      return;
    }
    if (!selected) {
      lastHydratedKeyRef.current = null;
      setLoadNumber("");
      setOrigin("");
      setEndUser("");
      setMt("");
      setRate("");
      setFsc("");
      setBroker("");
      setKms("");
      setLoadCategory(DEFAULT_LOAD_CATEGORY);
      setUsdCadRate("");
      setInvoiced(false);
      setFieldTextColors({});
      return;
    }

    const hydrateKey = scheduleLoadId
      ? `slot:${scheduleLoadId}:${selectedId}`
      : `sheet:${selectedId}`;

    if (scheduleLoadId && !scheduleSlotRow) {
      return;
    }
    if (lastHydratedKeyRef.current === hydrateKey) return;
    lastHydratedKeyRef.current = hydrateKey;

    const slot = scheduleLoadId ? scheduleSlotRow : null;

    liveSyncReadyRef.current = false;

    if (scheduleLoadId && slot) {
      setLoadNumber(
        slot.load_number != null
          ? String(slot.load_number)
          : selected.load_number != null
            ? String(selected.load_number)
            : "",
      );
      setOrigin(slot.origin != null ? String(slot.origin) : "");
      setEndUser(slot.end_user != null ? String(slot.end_user) : "");
      setMt(slot.mt != null ? String(slot.mt) : "");
      setRate(slot.rate != null ? String(slot.rate) : "");
      setFsc(slot.fsc != null ? String(slot.fsc) : "");
      setBroker(
        brokerFromScheduleLoadNote(slot.load_note) ||
          (selected.broker != null ? String(selected.broker) : ""),
      );
      setKms(slot.kms != null ? String(slot.kms) : "");
      setInvoiced(Boolean(slot.invoiced));
      setLoadCategory(
        loadCategoryFromStorage(
          slot.load_category ?? scheduleLoadCategory ?? selected.load_category,
        ),
      );
      setUsdCadRate(
        slot.usd_cad_rate != null
          ? String(slot.usd_cad_rate)
          : scheduleUsdCadRate != null
            ? String(scheduleUsdCadRate)
            : selected.usd_cad_rate != null
              ? String(selected.usd_cad_rate)
              : "",
      );
      setFieldTextColors(parseFieldTextColors(slot.field_text_colors));
    } else if (!scheduleLoadId) {
      setLoadNumber(
        selected.load_number != null ? String(selected.load_number) : "",
      );
      setOrigin(selected.origin != null ? String(selected.origin) : "");
      setEndUser(selected.end_user != null ? String(selected.end_user) : "");
      setMt(selected.mt != null ? String(selected.mt) : "");
      setRate(selected.rate != null ? String(selected.rate) : "");
      setFsc(selected.fsc != null ? String(selected.fsc) : "");
      setBroker(selected.broker != null ? String(selected.broker) : "");
      setLoadCategory(loadCategoryFromStorage(selected.load_category));
      if (Boolean(selected.flat_rate) && !selected.load_category) {
        setLoadCategory("legacy_flat");
      }
      setUsdCadRate(
        selected.usd_cad_rate != null ? String(selected.usd_cad_rate) : "",
      );
      setKms(selected.kms != null ? String(selected.kms) : "");
      setInvoiced(Boolean(selected.invoiced));
      setFieldTextColors({});
    }

    queueMicrotask(() => {
      liveSyncReadyRef.current = true;
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [
    open,
    selected,
    selectedId,
    scheduleLoadId,
    scheduleSlotRow,
    scheduleLoadCategory,
    scheduleUsdCadRate,
  ]);

  const saveLoadsheet = useCallback(
    async (overrides = {}) => {
      if (!selectedId) return { error: null };

      const num = (overrides.loadNumber ?? loadNumber).trim();
      if (!num) return { error: null };

      const values = {
        loadNumber: num,
        origin: overrides.origin ?? origin,
        endUser: overrides.endUser ?? endUser,
        mt: overrides.mt ?? mt,
        rate: overrides.rate ?? rate,
        fsc: overrides.fsc ?? fsc,
        broker: overrides.broker ?? broker,
        kms: overrides.kms ?? kms,
        loadCategory: overrides.loadCategory ?? loadCategory,
        usdCadRate: overrides.usdCadRate ?? usdCadRate,
        invoiced:
          overrides.invoiced !== undefined ? overrides.invoiced : invoiced,
      };

      const cat = normalizeLoadCategory(values.loadCategory, false);
      const categoryStored = loadCategoryStorageValue(cat);

      if (scheduleLoadId) {
        const schedulePayload = buildScheduleLoadPayload({
          loadsheetId: selectedId,
          loadNumber: values.loadNumber,
          origin: values.origin,
          endUser: values.endUser,
          mt: values.mt,
          rate: values.rate,
          fsc: values.fsc,
          broker: values.broker,
          flatRate: cat === "legacy_flat",
          loadCategory: cat,
          usdCadRate: values.usdCadRate,
          kms: values.kms,
          categoryStored,
          fieldTextColors,
          ...(overrides.includeInvoicedOnSchedule === true
            ? { invoiced: values.invoiced }
            : {}),
        });
        const { data: scheduleRow, error: scheduleError } =
          await persistScheduleLoad(supabase, {
            scheduleLoadId,
            payload: schedulePayload,
          });
        if (scheduleError) {
          return { error: scheduleError };
        }
        if (scheduleRow) {
          onSchedulePatched?.(scheduleRow);
          setScheduleSlotRow(scheduleRow);
        } else {
          await onScheduleUpdated?.();
        }
        return { error: null };
      }

      const sheetUpdate = {
        load_number: values.loadNumber,
        origin: nullIfEmpty(values.origin),
        end_user: nullIfEmpty(values.endUser),
        mt: nullIfEmpty(values.mt),
        rate: nullIfEmpty(values.rate),
        fsc: nullIfEmpty(values.fsc),
        broker: nullIfEmpty(values.broker),
        load_category: categoryStored,
        usd_cad_rate: nullIfEmpty(values.usdCadRate),
        flat_rate: cat === "legacy_flat",
        kms: nullIfEmpty(values.kms),
        invoiced: values.invoiced,
      };

      const { error } = await supabase
        .from("loadsheets")
        .update(sheetUpdate)
        .eq("id", selectedId);

      if (error) {
        return { error };
      }

      await onSaved?.();

      return { error: null };
    },
    [
      selectedId,
      loadNumber,
      origin,
      endUser,
      mt,
      rate,
      fsc,
      broker,
      kms,
      loadCategory,
      usdCadRate,
      invoiced,
      fieldTextColors,
      scheduleLoadId,
      supabase,
      onSaved,
      onScheduleUpdated,
      onSchedulePatched,
    ],
  );

  const fieldLocked = (idSelected = selectedId) =>
    readOnly || !idSelected;

  function reportSaveError(error) {
    const msg = error?.message ?? String(error);
    if (/load_category|usd_cad_rate|kms|column .* does not exist/i.test(msg)) {
      alert(
        "Load category / KMs / FX need the latest Supabase migrations (loadsheets.load_category, kms, usd_cad_rate). Apply migrations, then try again.",
      );
      return;
    }
    if (
      /load_note|origin|end_user|\bmt\b|rate|load_total|loadsheet_id|load_number|\bfsc\b|column .* does not exist/i.test(
        msg,
      )
    ) {
      alert(
        "Load sheet saved, but the schedule slot could not update (missing columns). Apply the latest schedule_loads migrations, then try again.",
      );
      return;
    }
    if (!/does not exist|schema cache|PGRST205/i.test(msg)) {
      alert(msg);
    }
  }

  const persistLive = useCallback(
    async (overrides = {}) => {
      if (!selectedId || !liveSyncReadyRef.current) return;
      if (Date.now() < liveSyncSuppressUntilRef.current) return;
      const { error } = await saveLoadsheet(overrides);
      if (error) {
        reportSaveError(error);
      }
    },
    [selectedId, saveLoadsheet],
  );

  useEffect(() => {
    if (!open || !selectedId || !liveSyncReadyRef.current) {
      return;
    }

    const gen = ++liveSyncGenRef.current;
    const timer = setTimeout(() => {
      if (gen !== liveSyncGenRef.current) return;
      if (Date.now() < liveSyncSuppressUntilRef.current) return;
      void persistLive();
    }, 350);

    return () => clearTimeout(timer);
  }, [
    open,
    selectedId,
    loadNumber,
    origin,
    endUser,
    mt,
    rate,
    fsc,
    broker,
    kms,
    loadCategory,
    usdCadRate,
    fieldTextColors,
    persistLive,
  ]);

  function setFieldColor(fieldKey, value) {
    setFieldTextColors((prev) => {
      const next = { ...prev };
      const hex = String(value ?? "").trim();
      if (!hex) {
        delete next[fieldKey];
      } else {
        next[fieldKey] = hex;
      }
      return next;
    });
  }

  const showFieldColors = Boolean(scheduleLoadId);

  function handleLoadCategoryChange(next) {
    setLoadCategory(next);
    if (!selectedId) return;
    void (async () => {
      const { error } = await saveLoadsheet({ loadCategory: next });
      if (error) reportSaveError(error);
    })();
  }

  async function handleFetchLiveUsdCad() {
    if (!selectedId || fetchingFx) return;
    setFetchingFx(true);
    try {
      const rate = await fetchLiveUsdCadRate();
      setUsdCadRate(rate);
      await persistLive({ usdCadRate: rate });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not fetch USD/CAD rate.");
    } finally {
      setFetchingFx(false);
    }
  }

  async function handleInvoicedChange(checked) {
    if (!selectedId) return;
    setInvoiced(checked);
    if (scheduleLoadId) {
      const { data, error } = await persistScheduleLoad(supabase, {
        scheduleLoadId,
        payload: { invoiced: checked },
      });
      if (error) {
        if (/invoiced|column .* does not exist/i.test(error.message ?? "")) {
          alert(
            "Per-slot invoiced needs migration 20260524120000_schedule_loads_kms_invoiced. Apply migrations, then try again.",
          );
        } else {
          reportSaveError(error);
        }
        setInvoiced(!checked);
        return;
      }
      if (data) {
        onSchedulePatched?.(data);
      } else {
        onSchedulePatched?.({ id: scheduleLoadId, invoiced: checked });
      }
      return;
    }
    const { error } = await saveLoadsheet({
      invoiced: checked,
      includeInvoicedOnSchedule: false,
    });
    if (error) {
      if (/invoiced|column .* does not exist/i.test(error.message ?? "")) {
        alert(
          "Invoiced status needs the latest Supabase migration (loadsheets.invoiced). Apply migrations, then try again.",
        );
      } else {
        reportSaveError(error);
      }
      setInvoiced(!checked);
    }
  }

  async function handleCopy() {
    if (copying || !selectedId) return;
    const num = loadNumber.trim();
    if (!num) {
      alert("Load number is required to copy.");
      return;
    }
    const newNum = nextCopyLoadNumber(num, loadSheets);
    if (!newNum) {
      alert("Could not determine a copy load number.");
      return;
    }
    setCopying(true);
    const { data, error } = await supabase
      .from("loadsheets")
      .insert({
        load_number: newNum,
        origin: nullIfEmpty(origin),
        end_user: nullIfEmpty(endUser),
        mt: nullIfEmpty(mt),
        rate: nullIfEmpty(rate),
        fsc: nullIfEmpty(fsc),
        broker: nullIfEmpty(broker),
        kms: nullIfEmpty(kms),
        load_category: loadCategoryStorageValue(
          normalizeLoadCategory(loadCategory, false),
        ),
        usd_cad_rate: nullIfEmpty(usdCadRate),
        flat_rate: false,
        invoiced: false,
      })
      .select("id")
      .single();
    setCopying(false);
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
    setSelectedId(String(data.id));
    setLoadNumber(newNum);
    setInvoiced(false);
    await onSaved?.();
  }

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
    if (scheduleLoadId) {
      if (!(await confirm(saveChangesConfirmOptions("this schedule slot")))) {
        return;
      }
    }
    setSaving(true);
    liveSyncGenRef.current += 1;
    const { error } = await saveLoadsheet(
      scheduleLoadId ? { includeInvoicedOnSchedule: true } : {},
    );
    setSaving(false);
    if (error) {
      reportSaveError(error);
      return;
    }
    onClose();
  }

  async function handleRemoveFromSlot() {
    if (!scheduleLoadId) return;
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
        kms: null,
        invoiced: false,
        load_category: null,
        usd_cad_rate: null,
        field_text_colors: {},
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
          {scheduleLoadId
            ? "Edits this schedule slot only. The load sheet library template is not changed."
            : "Updates the saved template in your library."}
        </p>

        {scheduleLoadId && !readOnly ? (
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
            No load sheets yet. Use <strong>New load sheet</strong> in the
            bottom bar first.
          </p>
        ) : (
          <label className="mb-3 block text-sm font-medium">
            Load sheet
            <select
              className={selectClass}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
              disabled={readOnly}
            >
              <option value="">Select a load sheet…</option>
              {loadSheets.map((s) => {
                const label = String(s.load_number ?? "").trim() || s.id;
                return (
                  <option key={s.id} value={s.id}>
                    {s.invoiced ? `${label} (invoiced)` : label}
                  </option>
                );
              })}
            </select>
          </label>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {showFieldColors ? (
            <p className="rounded-md border border-green-950/15 bg-green-950/5 px-3 py-2 text-xs text-green-900/80">
              Use the color swatches to set text color on the schedule for this
              slot.
            </p>
          ) : null}
          <FieldWithTextColor
            label="Load number"
            required
            fieldKey="load_number"
            colors={fieldTextColors}
            onColorChange={setFieldColor}
            showColor={showFieldColors}
            disabled={fieldLocked()}
          >
            <input
              className={inputClass}
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              placeholder="e.g. 1042"
              required
              disabled={fieldLocked()}
              style={
                showFieldColors && fieldTextColors.load_number
                  ? { color: fieldTextColors.load_number }
                  : undefined
              }
            />
          </FieldWithTextColor>
          <FieldWithTextColor
            label="Origin"
            fieldKey="origin"
            colors={fieldTextColors}
            onColorChange={setFieldColor}
            showColor={showFieldColors}
            disabled={fieldLocked()}
          >
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin"
              disabled={fieldLocked()}
              style={
                showFieldColors && fieldTextColors.origin
                  ? { color: fieldTextColors.origin }
                  : undefined
              }
            />
          </FieldWithTextColor>
          <FieldWithTextColor
            label="End user"
            fieldKey="end_user"
            colors={fieldTextColors}
            onColorChange={setFieldColor}
            showColor={showFieldColors}
            disabled={fieldLocked()}
          >
            <input
              className={inputClass}
              value={endUser}
              onChange={(e) => setEndUser(e.target.value)}
              placeholder="End user"
              disabled={fieldLocked()}
              style={
                showFieldColors && fieldTextColors.end_user
                  ? { color: fieldTextColors.end_user }
                  : undefined
              }
            />
          </FieldWithTextColor>
          <label className="block text-sm font-medium">
            Load type
            <select
              className={selectClass}
              value={loadCategory}
              disabled={fieldLocked()}
              onChange={(e) => handleLoadCategoryChange(e.target.value)}
            >
              {loadCategory === "legacy_flat" ? (
                <option value="legacy_flat">Legacy flat (rate × FSC)</option>
              ) : null}
              {LOAD_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div
            className={`grid gap-3 ${fieldRules.showMt ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {fieldRules.showMt ? (
              <FieldWithTextColor
                label="MT"
                fieldKey="mt"
                colors={fieldTextColors}
                onColorChange={setFieldColor}
                showColor={showFieldColors}
                disabled={fieldLocked()}
              >
                <input
                  className={inputClass}
                  value={mt}
                  onChange={(e) => setMt(e.target.value)}
                  placeholder="MT"
                  disabled={fieldLocked()}
                  style={
                    showFieldColors && fieldTextColors.mt
                      ? { color: fieldTextColors.mt }
                      : undefined
                  }
                />
              </FieldWithTextColor>
            ) : null}
            <FieldWithTextColor
              label="Rate"
              fieldKey="rate"
              colors={fieldTextColors}
              onColorChange={setFieldColor}
              showColor={showFieldColors}
              disabled={fieldLocked()}
            >
              <input
                className={inputClass}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={
                  fieldRules.rateIsFlatTotal ? "Total amount (CAD)" : "Rate"
                }
                disabled={fieldLocked()}
                style={
                  showFieldColors && fieldTextColors.rate
                    ? { color: fieldTextColors.rate }
                    : undefined
                }
              />
            </FieldWithTextColor>
          </div>
          {fieldRules.showFsc ? (
            <FieldWithTextColor
              label="FSC"
              hint={
                loadCategory === "chicken"
                  ? "(556 × FSC + rate)"
                  : loadCategory === "cargill"
                    ? "(KMs × FSC + rate × MT)"
                    : loadCategory === "irm"
                      ? "(FSC is % — added onto rate × MT)"
                      : "(legacy flat: rate × FSC)"
              }
              fieldKey="fsc"
              colors={fieldTextColors}
              onColorChange={setFieldColor}
              showColor={showFieldColors}
              disabled={fieldLocked()}
            >
              <input
                className={inputClass}
                value={fsc}
                onChange={(e) => setFsc(e.target.value)}
                placeholder="e.g. 150"
                disabled={fieldLocked()}
                style={
                  showFieldColors && fieldTextColors.fsc
                    ? { color: fieldTextColors.fsc }
                    : undefined
                }
              />
            </FieldWithTextColor>
          ) : null}
          {fieldRules.showUsdCad ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                USD → CAD rate{" "}
                <span className="font-normal text-green-900/60">
                  (MT × rate = USD, then × this rate for CAD total)
                </span>
                <input
                  className={inputClass}
                  value={usdCadRate}
                  onChange={(e) => setUsdCadRate(e.target.value)}
                  placeholder="e.g. 1.38"
                  disabled={fieldLocked()}
                />
              </label>
              <button
                type="button"
                className="rounded-lg border border-green-950/30 bg-white px-3 py-1.5 text-xs font-semibold text-green-950 hover:bg-green-950/5 disabled:opacity-50"
                disabled={fieldLocked() || fetchingFx}
                onClick={() => void handleFetchLiveUsdCad()}
              >
                {fetchingFx ? "Fetching…" : "Use live USD/CAD rate"}
              </button>
              {usdTotalPreview ? (
                <p className="text-xs text-green-900/80">
                  USD subtotal:{" "}
                  <span className="font-semibold tabular-nums">
                    {usdTotalPreview}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}
          <label className="block text-sm font-medium">
            Total (CAD){" "}
            <span className="font-normal text-green-900/60">({totalHint})</span>
            <input
              className={`${inputClass} cursor-not-allowed bg-neutral-100 text-neutral-700`}
              readOnly
              value={loadTotalPreviewCad}
              placeholder="—"
              title={`${totalHint} — saved to the schedule as CAD.`}
            />
          </label>
          <FieldWithTextColor
            label="KMs"
            hint="(for revenue/km)"
            fieldKey="kms"
            colors={fieldTextColors}
            onColorChange={setFieldColor}
            showColor={showFieldColors}
            disabled={fieldLocked()}
          >
            <input
              className={inputClass}
              value={kms}
              onChange={(e) => setKms(e.target.value)}
              placeholder="e.g. 450"
              disabled={fieldLocked()}
              style={
                showFieldColors && fieldTextColors.kms
                  ? { color: fieldTextColors.kms }
                  : undefined
              }
            />
          </FieldWithTextColor>
          <label className="block text-sm font-medium">
            Revenue/km{" "}
            <span className="font-normal text-green-900/60">(total ÷ KMs)</span>
            <input
              className={`${inputClass} cursor-not-allowed bg-neutral-100 text-neutral-700`}
              readOnly
              value={revenuePerKmPreview}
              placeholder="—"
            />
          </label>
          <FieldWithTextColor
            label="Broker"
            hint="(optional)"
            fieldKey="broker"
            colors={fieldTextColors}
            onColorChange={setFieldColor}
            showColor={showFieldColors}
            disabled={fieldLocked()}
          >
            <input
              className={inputClass}
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder="Broker"
              disabled={fieldLocked()}
              style={
                showFieldColors && fieldTextColors.broker
                  ? { color: fieldTextColors.broker }
                  : undefined
              }
            />
          </FieldWithTextColor>
          {showFieldColors ? (
            <FieldWithTextColor
              label="Load notes"
              hint="(schedule notes column)"
              fieldKey="load_note"
              colors={fieldTextColors}
              onColorChange={setFieldColor}
              showColor
              disabled={fieldLocked()}
            >
              <p className="mt-1 text-xs font-normal text-green-900/70">
                Colors the load # / broker text in the green notes column on the
                schedule.
              </p>
            </FieldWithTextColor>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-green-950/30 text-green-950 focus:ring-green-950/30"
              checked={invoiced}
              disabled={fieldLocked()}
              onChange={(e) => void handleInvoicedChange(e.target.checked)}
            />
            Mark as completed
            <span className="font-normal text-green-900/60">
              (light green origin / end user on the schedule)
            </span>
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-green-950/15 pt-4">
            {!readOnly ? (
              <button
                type="button"
                className="rounded-lg border border-green-950/30 bg-white px-3 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/5 disabled:opacity-50"
                disabled={fieldLocked() || copying}
                onClick={() => void handleCopy()}
              >
                {copying ? "Copying…" : "Copy load sheet"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
                onClick={onClose}
              >
                {readOnly ? "Close" : "Cancel"}
              </button>
              {!readOnly ? (
                <ButtonDark
                  type="submit"
                  text={saving ? "Saving…" : "Done"}
                  disabled={!selectedId || loadSheets.length === 0}
                />
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
