"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import {
  DEFAULT_LOAD_CATEGORY,
  LOAD_CATEGORIES,
  computeUsGrainUsdTotal,
  fetchLiveUsdCadRate,
  fieldRulesForCategory,
  loadCategoryStorageValue,
  normalizeLoadCategory,
  totalFormulaHint,
} from "@/lib/loadCategory";
import {
  computeLoadTotalDisplay,
  formatLoadTotalCad,
  formatUsdTotal,
} from "@/lib/loadTotal";
import { createClient } from "@/lib/supabase/client";

function nullIfEmpty(s) {
  const t = String(s ?? "").trim();
  return t.length ? t : null;
}

export default function NewLoadsheetModal({ open, onClose, onCreated }) {
  const supabase = useMemo(() => createClient(), []);
  const [broker, setBroker] = useState("");
  const [loadNumber, setLoadNumber] = useState("");
  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [mt, setMt] = useState("");
  const [rate, setRate] = useState("");
  const [fsc, setFsc] = useState("");
  const [kms, setKms] = useState("");
  const [loadCategory, setLoadCategory] = useState(DEFAULT_LOAD_CATEGORY);
  const [usdCadRate, setUsdCadRate] = useState("");
  const [fetchingFx, setFetchingFx] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBroker("");
    setLoadNumber("");
    setOrigin("");
    setEndUser("");
    setMt("");
    setRate("");
    setFsc("");
    setKms("");
    setLoadCategory(DEFAULT_LOAD_CATEGORY);
    setUsdCadRate("");
  }, [open]);

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

  async function handleFetchLiveUsdCad() {
    if (fetchingFx) return;
    setFetchingFx(true);
    try {
      setUsdCadRate(await fetchLiveUsdCadRate());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not fetch USD/CAD rate.");
    } finally {
      setFetchingFx(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const num = loadNumber.trim();
    if (!num) {
      alert("Load number is required.");
      return;
    }
    const cat = normalizeLoadCategory(loadCategory, false);
    setSaving(true);
    const { error } = await supabase.from("loadsheets").insert({
      load_number: num,
      broker: nullIfEmpty(broker),
      origin: nullIfEmpty(origin),
      end_user: nullIfEmpty(endUser),
      mt: nullIfEmpty(mt),
      rate: nullIfEmpty(rate),
      fsc: nullIfEmpty(fsc),
      kms: nullIfEmpty(kms),
      load_category: loadCategoryStorageValue(cat),
      usd_cad_rate: nullIfEmpty(usdCadRate),
      flat_rate: false,
    });
    setSaving(false);
    if (error) {
      if (/does not exist|schema cache|PGRST205/i.test(error.message ?? "")) {
        alert(
          "The loadsheets table is not available yet. Apply the latest Supabase migration, then try again.",
        );
      } else if (/load_category|usd_cad_rate|kms|column .* does not exist/i.test(
        error.message ?? "",
      )) {
        alert(
          "Load type / KMs / FX need the latest Supabase migrations. Apply migrations, then try again.",
        );
      } else {
        alert(error.message);
      }
      return;
    }
    await onCreated?.();
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
        aria-labelledby="new-loadsheet-title"
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
        <h2 id="new-loadsheet-title" className="mb-1 text-xl font-bold">
          New load sheet
        </h2>
        <p className="mb-4 text-sm text-green-900/80">
          Save a reusable load. Totals update as you type. On the schedule, use
          the day <strong>+</strong> button to copy into a unit&apos;s row.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="block text-sm font-medium">
            Load type
            <select
              className={selectClass}
              value={loadCategory}
              onChange={(e) => setLoadCategory(e.target.value)}
            >
              {LOAD_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Broker <span className="font-normal text-green-900/60">(optional)</span>
            <input
              className={inputClass}
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder="Broker"
            />
          </label>
          <label className="block text-sm font-medium">
            Load number <span className="text-red-700">*</span>
            <input
              className={inputClass}
              value={loadNumber}
              onChange={(e) => setLoadNumber(e.target.value)}
              placeholder="e.g. 1042"
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Origin
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin"
            />
          </label>
          <label className="block text-sm font-medium">
            End user
            <input
              className={inputClass}
              value={endUser}
              onChange={(e) => setEndUser(e.target.value)}
              placeholder="End user"
            />
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
                  fieldRules.rateIsFlatTotal
                    ? "Total amount (CAD)"
                    : "Rate"
                }
              />
            </label>
          </div>
          {fieldRules.showFsc ? (
            <label className="block text-sm font-medium">
              FSC{" "}
              <span className="font-normal text-green-900/60">
                {loadCategory === "cargill"
                  ? "(KMs × FSC + rate × MT)"
                  : loadCategory === "irm"
                    ? "(FSC is % — added onto rate × MT)"
                    : "(556 × FSC + rate)"}
              </span>
              <input
                className={inputClass}
                value={fsc}
                onChange={(e) => setFsc(e.target.value)}
                placeholder="Fuel surcharge"
              />
            </label>
          ) : null}
          {fieldRules.showUsdCad ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                USD → CAD rate{" "}
                <span className="font-normal text-green-900/60">
                  (MT × rate = USD, then × this rate)
                </span>
                <input
                  className={inputClass}
                  value={usdCadRate}
                  onChange={(e) => setUsdCadRate(e.target.value)}
                  placeholder="e.g. 1.38"
                />
              </label>
              <button
                type="button"
                className="rounded-lg border border-green-950/30 bg-white px-3 py-1.5 text-xs font-semibold text-green-950 hover:bg-green-950/5 disabled:opacity-50"
                disabled={fetchingFx}
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
            />
          </label>
          <label className="block text-sm font-medium">
            KMs <span className="font-normal text-green-900/60">(optional)</span>
            <input
              className={inputClass}
              value={kms}
              onChange={(e) => setKms(e.target.value)}
              placeholder="e.g. 450"
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
            <ButtonDark type="submit" text={saving ? "Saving…" : "Save load sheet"} />
          </div>
        </form>
      </div>
    </div>
  );
}
