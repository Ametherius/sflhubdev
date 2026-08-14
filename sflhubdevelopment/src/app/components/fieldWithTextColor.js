"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Tailwind CSS default palette *-600 hex values for schedule text colors.
 * https://tailwindcss.com/docs/colors
 */
export const TAILWIND_600_COLORS = [
  { id: "slate", label: "Slate", hex: "#475569" },
  { id: "gray", label: "Gray", hex: "#4b5563" },
  { id: "zinc", label: "Zinc", hex: "#52525b" },
  { id: "neutral", label: "Neutral", hex: "#525252" },
  { id: "stone", label: "Stone", hex: "#57534e" },
  { id: "red", label: "Red", hex: "#dc2626" },
  { id: "orange", label: "Orange", hex: "#ea580c" },
  { id: "amber", label: "Amber", hex: "#d97706" },
  { id: "yellow", label: "Yellow", hex: "#ca8a04" },
  { id: "lime", label: "Lime", hex: "#65a30d" },
  { id: "green", label: "Green", hex: "#16a34a" },
  { id: "emerald", label: "Emerald", hex: "#059669" },
  { id: "teal", label: "Teal", hex: "#0d9488" },
  { id: "cyan", label: "Cyan", hex: "#0891b2" },
  { id: "sky", label: "Sky", hex: "#0284c7" },
  { id: "blue", label: "Blue", hex: "#2563eb" },
  { id: "indigo", label: "Indigo", hex: "#4f46e5" },
  { id: "violet", label: "Violet", hex: "#7c3aed" },
  { id: "purple", label: "Purple", hex: "#9333ea" },
  { id: "fuchsia", label: "Fuchsia", hex: "#c026d3" },
  { id: "pink", label: "Pink", hex: "#db2777" },
  { id: "rose", label: "Rose", hex: "#e11d48" },
];

const HEX_TO_600 = new Map(
  TAILWIND_600_COLORS.map((c) => [c.hex.toLowerCase(), c]),
);

export const SCHEDULE_TEXT_COLOR_FIELDS = [
  "load_number",
  "origin",
  "end_user",
  "mt",
  "rate",
  "fsc",
  "kms",
  "broker",
  "load_note",
];

export function normalizeHexColor(value) {
  const t = String(value ?? "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    const [, a, b, c] = t;
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return "";
}

/** Map any stored hex onto a Tailwind 600 option (exact match). */
export function resolveTailwind600(value) {
  const hex = normalizeHexColor(value);
  if (!hex) return "";
  if (HEX_TO_600.has(hex)) return hex;
  return "";
}

/** CSS color for schedule fields; empty means use default styling. */
export function scheduleFieldTextColor(colors, field) {
  if (!colors || typeof colors !== "object") return undefined;
  const hex = normalizeHexColor(colors[field]);
  return hex || undefined;
}

export function parseFieldTextColors(raw) {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parseFieldTextColors(parsed);
    } catch {
      return {};
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const key of SCHEDULE_TEXT_COLOR_FIELDS) {
    const hex = normalizeHexColor(raw[key]);
    if (hex) out[key] = hex;
  }
  return out;
}

function ColorSwatchPicker({
  label,
  value,
  disabled = false,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const selected = HEX_TO_600.get(value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(hex) {
    onChange?.(hex);
    setOpen(false);
  }

  return (
    <span ref={rootRef} className="relative flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label} text color on schedule`}
        title="Text color on schedule"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
        className="flex items-center gap-1.5 rounded border border-green-950/25 bg-white px-1.5 py-1 text-[11px] font-medium text-green-950 hover:bg-green-950/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className="inline-block size-4 shrink-0 rounded-sm border border-green-950/30"
          style={{
            backgroundColor: selected?.hex ?? "transparent",
            backgroundImage: selected
              ? undefined
              : "linear-gradient(135deg, #fff 46%, #ccc 46%, #ccc 54%, #fff 54%)",
          }}
          aria-hidden
        />
        <span>{selected?.label ?? "Default"}</span>
      </button>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} color`}
          className="absolute right-0 top-full z-30 mt-1 max-h-56 w-40 overflow-y-auto rounded-md border border-green-950/20 bg-white py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-green-950/5 ${
                !value ? "bg-green-950/10 font-semibold" : ""
              }`}
              onClick={() => pick("")}
            >
              <span
                className="inline-block size-4 shrink-0 rounded-sm border border-green-950/30"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #fff 46%, #ccc 46%, #ccc 54%, #fff 54%)",
                }}
                aria-hidden
              />
              <span>Default</span>
            </button>
          </li>
          {TAILWIND_600_COLORS.map((c) => {
            const active = value === c.hex;
            return (
              <li key={c.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-green-950/5 ${
                    active ? "bg-green-950/10 font-semibold" : ""
                  }`}
                  onClick={() => pick(c.hex)}
                >
                  <span
                    className="inline-block size-4 shrink-0 rounded-sm border border-green-950/30"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden
                  />
                  <span>{c.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {value ? (
        <button
          type="button"
          className="text-[10px] font-semibold text-green-900/70 underline hover:no-underline disabled:opacity-50"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange?.("");
          }}
        >
          Reset
        </button>
      ) : null}
    </span>
  );
}

/**
 * Label + optional Tailwind-600 color swatch picker + control.
 * Color only shown when editing a schedule slot (showColor).
 */
export function FieldWithTextColor({
  label,
  hint = null,
  required = false,
  fieldKey,
  colors,
  onColorChange,
  showColor = false,
  disabled = false,
  children,
}) {
  const color = resolveTailwind600(colors?.[fieldKey] ?? "");

  return (
    <label className="block text-sm font-medium">
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {label}
          {required ? <span className="text-red-700"> *</span> : null}
          {hint ? (
            <span className="font-normal text-green-900/60"> {hint}</span>
          ) : null}
        </span>
        {showColor ? (
          <ColorSwatchPicker
            label={label}
            value={color}
            disabled={disabled}
            onChange={(hex) => onColorChange?.(fieldKey, hex)}
          />
        ) : null}
      </span>
      {children}
    </label>
  );
}
