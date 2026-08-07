"use client";

const DEFAULT_PICKER = "#171717";

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

/** Value for <input type="color"> (always a valid #rrggbb). */
export function colorPickerValue(value) {
  return normalizeHexColor(value) || DEFAULT_PICKER;
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

/**
 * Label + optional color picker + control.
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
  const color = colors?.[fieldKey] ?? "";

  return (
    <label className="block text-sm font-medium">
      <span className="flex items-center justify-between gap-2">
        <span>
          {label}
          {required ? <span className="text-red-700"> *</span> : null}
          {hint ? (
            <span className="font-normal text-green-900/60"> {hint}</span>
          ) : null}
        </span>
        {showColor ? (
          <span className="flex shrink-0 items-center gap-1">
            <input
              type="color"
              value={colorPickerValue(color)}
              disabled={disabled}
              onChange={(e) => onColorChange?.(fieldKey, e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-green-950/25 bg-white p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              title="Text color on schedule"
              aria-label={`${label} text color on schedule`}
            />
            {color ? (
              <button
                type="button"
                className="text-[10px] font-semibold text-green-900/70 underline hover:no-underline disabled:opacity-50"
                disabled={disabled}
                onClick={() => onColorChange?.(fieldKey, "")}
              >
                Reset
              </button>
            ) : null}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
