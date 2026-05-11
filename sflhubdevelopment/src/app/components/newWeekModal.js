"use client";

import { useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";
import { toISODate, weekDayLabels } from "@/lib/weekDates";

function calendarCells(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1, 12, 0, 0, 0);
  const startPad = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ kind: "pad", date: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      kind: "day",
      date: new Date(viewYear, viewMonth, d, 12, 0, 0, 0),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ kind: "pad", date: null });
  }
  return cells;
}

export default function NewWeekModal({ open, onClose, onCreate }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [saving, setSaving] = useState(false);

  const cells = useMemo(
    () => calendarCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const rangePreview = selectedDate
    ? weekDayLabels(toISODate(selectedDate))
    : [];

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  async function handleCreate() {
    if (!selectedDate || saving) return;
    setSaving(true);
    const iso = toISODate(selectedDate);
    const result = await onCreate(iso);
    setSaving(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-week-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 text-2xl text-green-950 hover:opacity-70"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>
        <h2 id="new-week-title" className="mb-1 text-xl font-bold">
          New schedule week
        </h2>
        <p className="mb-4 text-sm text-green-900/80">
          Pick the week start date. The week is created empty; for each unit on the
          board, the app fills seven days with three load slots per day (from your
          first three <code className="text-green-950">load_slots</code> rows).
        </p>

        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="rounded-full p-2 hover:bg-green-950/10"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            <FaChevronLeft />
          </button>
          <span className="font-semibold">{monthLabel}</span>
          <button
            type="button"
            className="rounded-full p-2 hover:bg-green-950/10"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <FaChevronRight />
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-green-900/70">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (cell.kind === "pad" || !cell.date) {
              return <div key={`pad-${idx}`} className="aspect-square" />;
            }
            const iso = toISODate(cell.date);
            const isSelected =
              selectedDate && toISODate(selectedDate) === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-green-950 text-white"
                    : "hover:bg-green-950/15"
                }`}
              >
                {cell.date.getDate()}
              </button>
            );
          })}
        </div>

        {rangePreview.length > 0 && (
          <div className="mb-4 rounded-lg border border-green-950/20 bg-green-950/5 p-3 text-xs text-green-900">
            <div className="mb-1 font-semibold">Week range</div>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {rangePreview.map((d) => (
                <span key={d.iso}>{d.label}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
            onClick={onClose}
          >
            Cancel
          </button>
          <ButtonDark
            type="button"
            text={saving ? "Creating…" : "Create week"}
            onClick={handleCreate}
          />
        </div>
      </div>
    </div>
  );
}
