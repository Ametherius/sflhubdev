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
  buildScheduleLoadPayload,
  nextCopyLoadNumber,
} from "@/lib/loadsheetCopy";
import { createClient } from "@/lib/supabase/client";
import { persistScheduleLoad } from "@/lib/scheduleLoadsPersist";

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
  onSaved,
  /** Called after syncing this slot's schedule_loads row (refresh week loads) */
  onScheduleUpdated,
  /** Merge saved row into week loads immediately (before refetch) */
  onSchedulePatched,
  /** Called after unlinking schedule row from loadsheet (refresh week loads) */
  onScheduleUnlinked,
}) {
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
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const liveSyncReadyRef = useRef(false);
  const liveSyncGenRef = useRef(0);
  const lastHydratedSheetIdRef = useRef(null);

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
        flatRate: false,
      }),
    [mt, rate, fsc, loadCategory, usdCadRate],
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
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate form when sheet selection changes */
    if (!open) {
      lastHydratedSheetIdRef.current = null;
      return;
    }
    if (!selected) {
      lastHydratedSheetIdRef.current = null;
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
      return;
    }
    if (lastHydratedSheetIdRef.current === selectedId) return;
    lastHydratedSheetIdRef.current = selectedId;

    liveSyncReadyRef.current = false;
    setLoadNumber(
      selected.load_number != null ? String(selected.load_number) : "",
    );
    setOrigin(selected.origin != null ? String(selected.origin) : "");
    setEndUser(selected.end_user != null ? String(selected.end_user) : "");
    setMt(selected.mt != null ? String(selected.mt) : "");
    setRate(selected.rate != null ? String(selected.rate) : "");
    setFsc(selected.fsc != null ? String(selected.fsc) : "");
    setBroker(selected.broker != null ? String(selected.broker) : "");
    setKms(selected.kms != null ? String(selected.kms) : "");
    setLoadCategory(loadCategoryFromStorage(selected.load_category));
    if (Boolean(selected.flat_rate) && !selected.load_category) {
      setLoadCategory("legacy_flat");
    }
    setUsdCadRate(
      selected.usd_cad_rate != null ? String(selected.usd_cad_rate) : "",
    );
    setInvoiced(Boolean(selected.invoiced));
    queueMicrotask(() => {
      liveSyncReadyRef.current = true;
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, selected, selectedId]);

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

      const { error } = await supabase
        .from("loadsheets")
        .update({
          load_number: values.loadNumber,
          origin: nullIfEmpty(values.origin),
          end_user: nullIfEmpty(values.endUser),
          mt: nullIfEmpty(values.mt),
          rate: nullIfEmpty(values.rate),
          fsc: nullIfEmpty(values.fsc),
          broker: nullIfEmpty(values.broker),
          kms: nullIfEmpty(values.kms),
          load_category: categoryStored,
          usd_cad_rate: nullIfEmpty(values.usdCadRate),
          flat_rate: cat === "legacy_flat",
          invoiced: values.invoiced,
        })
        .eq("id", selectedId);

      if (error) {
        return { error };
      }

      await onSaved?.();

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
        }
        await onScheduleUpdated?.();
      }

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
      scheduleLoadId,
      supabase,
      onSaved,
      onScheduleUpdated,
      onSchedulePatched,
    ],
  );

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
      const { error } = await saveLoadsheet(overrides);
      if (error) {
        reportSaveError(error);
      }
    },
    [selectedId, saveLoadsheet],
  );

  useEffect(() => {
    if (!open || !selectedId || !liveSyncReadyRef.current) return;

    const gen = ++liveSyncGenRef.current;
    const timer = setTimeout(() => {
      if (gen !== liveSyncGenRef.current) return;
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
    persistLive,
  ]);

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
    const { error } = await saveLoadsheet({ invoiced: checked });
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
    setSaving(true);
    liveSyncGenRef.current += 1;
    const { error } = await saveLoadsheet();
    setSaving(false);
    if (error) {
      reportSaveError(error);
      return;
    }
    onClose();
  }

  async function handleRemoveFromSlot() {
    if (!scheduleLoadId) return;
    if (
      !confirm(
        "Remove the load from this slot? All copied load details (origin, metrics, notes, load sheet link) will be cleared.",
      )
    ) {
      return;
    }
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
          Updates the saved template in your library.
          {scheduleLoadId
            ? " This slot on the schedule updates immediately with the same fields."
            : " Open from a schedule slot’s Sheet button to push changes into that cell."}
        </p>

        {scheduleLoadId ? (
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
          <label className="block text-sm font-medium">
            Load number <span className="text-red-700">*</span>
            <input
              className={inputClass}
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              placeholder="e.g. 1042"
              required
              disabled={!selectedId}
            />
          </label>
          <label className="block text-sm font-medium">
            Origin
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin"
              disabled={!selectedId}
            />
          </label>
          <label className="block text-sm font-medium">
            End user
            <input
              className={inputClass}
              value={endUser}
              onChange={(e) => setEndUser(e.target.value)}
              placeholder="End user"
              disabled={!selectedId}
            />
          </label>
          <label className="block text-sm font-medium">
            Load type
            <select
              className={selectClass}
              value={loadCategory}
              disabled={!selectedId}
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
              <label className="block text-sm font-medium">
                MT
                <input
                  className={inputClass}
                  value={mt}
                  onChange={(e) => setMt(e.target.value)}
                  placeholder="MT"
                  disabled={!selectedId}
                />
              </label>
            ) : null}
            <label className="block text-sm font-medium">
              Rate
              <input
                className={inputClass}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder={
                  fieldRules.rateIsFlatTotal ? "Total amount (CAD)" : "Rate"
                }
                disabled={!selectedId}
              />
            </label>
          </div>
          {fieldRules.showFsc ? (
            <label className="block text-sm font-medium">
              FSC{" "}
              <span className="font-normal text-green-900/60">
                {loadCategory === "chicken"
                  ? "(556 × FSC + rate)"
                  : "(legacy flat: rate × FSC)"}
              </span>
              <input
                className={inputClass}
                value={fsc}
                onChange={(e) => setFsc(e.target.value)}
                placeholder="e.g. 150"
                disabled={!selectedId}
              />
            </label>
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
                  disabled={!selectedId}
                />
              </label>
              <button
                type="button"
                className="rounded-lg border border-green-950/30 bg-white px-3 py-1.5 text-xs font-semibold text-green-950 hover:bg-green-950/5 disabled:opacity-50"
                disabled={!selectedId || fetchingFx}
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
          <label className="block text-sm font-medium">
            KMs{" "}
            <span className="font-normal text-green-900/60">(for revenue/km)</span>
            <input
              className={inputClass}
              value={kms}
              onChange={(e) => setKms(e.target.value)}
              placeholder="e.g. 450"
              disabled={!selectedId}
            />
          </label>
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
          <label className="block text-sm font-medium">
            Broker{" "}
            <span className="font-normal text-green-900/60">(optional)</span>
            <input
              className={inputClass}
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder="Broker"
              disabled={!selectedId}
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-green-950/30 text-green-950 focus:ring-green-950/30"
              checked={invoiced}
              disabled={!selectedId}
              onChange={(e) => void handleInvoicedChange(e.target.checked)}
            />
            Mark as completed
            <span className="font-normal text-green-900/60">
              (light green origin / end user on the schedule)
            </span>
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-green-950/15 pt-4">
            <button
              type="button"
              className="rounded-lg border border-green-950/30 bg-white px-3 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/5 disabled:opacity-50"
              disabled={!selectedId || copying}
              onClick={() => void handleCopy()}
            >
              {copying ? "Copying…" : "Copy load sheet"}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
                onClick={onClose}
              >
                Cancel
              </button>
              <ButtonDark
                type="submit"
                text={saving ? "Saving…" : "Done"}
                disabled={!selectedId || loadSheets.length === 0}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
