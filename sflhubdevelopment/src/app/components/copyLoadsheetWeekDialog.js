"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { parseISODateLocal } from "@/lib/weekDates";
import ButtonDark from "./buttonDark";

function weekValue(week) {
  return String(week?.week_start_date ?? "").slice(0, 10);
}

export function formatWeekOptionLabel(weekStartDate) {
  const day = parseISODateLocal(weekStartDate);
  if (Number.isNaN(day.getTime())) return "Week";
  return `Week of ${day.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function initialWeekValue(weeks, initialWeekStart) {
  const known = (weeks ?? []).map(weekValue).filter(Boolean);
  const preferred = String(initialWeekStart ?? "").slice(0, 10);
  if (preferred && known.includes(preferred)) return preferred;
  return known[0] ?? "";
}

/**
 * Asks which schedule week a loadsheet copy should be saved into.
 */
export default function CopyLoadsheetWeekDialog({
  open,
  weeks = [],
  initialWeekStart = "",
  summary = "",
  copying = false,
  onCancel,
  onConfirm,
}) {
  const [mounted, setMounted] = useState(false);
  const [weekStart, setWeekStart] = useState(() =>
    initialWeekValue(weeks, initialWeekStart),
  );
  const seededWhileOpen = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      seededWhileOpen.current = false;
      return;
    }
    if (seededWhileOpen.current) return;
    seededWhileOpen.current = true;
    setWeekStart(initialWeekValue(weeks, initialWeekStart));
  }, [open, initialWeekStart, weeks]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(ev) {
      if (ev.key === "Escape" && !copying) {
        ev.preventDefault();
        onCancel?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, copying, onCancel]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={() => {
        if (!copying) onCancel?.();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-loadsheet-week-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id="copy-loadsheet-week-title" className="mb-2 text-lg font-bold">
          Copy load sheet
        </h2>
        {summary ? (
          <p className="mb-2 text-sm font-medium text-green-950">{summary}</p>
        ) : null}
        <p className="mb-4 text-sm leading-relaxed text-green-900/85">
          Choose the week this copy is saved to.
        </p>
        <label className="mb-6 block text-sm font-medium">
          Week
          <select
            className="mt-1 w-full rounded-lg border-2 border-green-950 bg-white p-2 text-sm text-green-950 outline-none"
            value={weekStart}
            disabled={copying || weeks.length === 0}
            onChange={(e) => setWeekStart(e.target.value)}
          >
            {weeks.length === 0 ? (
              <option value="">No weeks available</option>
            ) : (
              weeks.map((w) => {
                const value = weekValue(w);
                return (
                  <option key={w.id ?? value} value={value}>
                    {formatWeekOptionLabel(w.week_start_date)}
                  </option>
                );
              })
            )}
          </select>
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10 disabled:opacity-50"
            disabled={copying}
            onClick={onCancel}
          >
            Cancel
          </button>
          <ButtonDark
            type="button"
            text={copying ? "Copying…" : "Copy"}
            disabled={copying || !weekStart}
            onClick={() => onConfirm?.(weekStart)}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
