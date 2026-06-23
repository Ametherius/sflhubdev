"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Searchable pick list — selected option stays visible while filtering so
 * driver/unit can be changed without losing the current choice.
 */
export default function SearchableSelect({
  open = true,
  label,
  placeholder = "Search…",
  emptyMessage = "No matches.",
  options = [],
  value = "",
  onChange,
  getOptionValue = (option) => String(option?.id ?? ""),
  getOptionLabel = (option) =>
    String(option?.name ?? option?.unit ?? option?.label ?? ""),
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedKey = value != null ? String(value) : "";
    if (!q) return options;

    return options.filter((option) => {
      const key = getOptionValue(option);
      if (selectedKey && key === selectedKey) return true;
      return getOptionLabel(option).toLowerCase().includes(q);
    });
  }, [options, query, value, getOptionLabel, getOptionValue]);

  const selectedOption = useMemo(
    () => options.find((o) => getOptionValue(o) === String(value)),
    [options, value, getOptionValue],
  );

  return (
    <div className="min-w-0 flex-1 p-2">
      <label className="mb-2 block text-sm font-medium text-green-950">
        {label}
      </label>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="mb-2 block w-full rounded-md border-2 border-green-950 bg-white p-2.5 text-sm text-black placeholder:text-green-950/50"
        autoComplete="off"
      />
      {selectedOption ? (
        <p className="mb-2 truncate text-xs text-green-900/80">
          Selected:{" "}
          <span className="font-semibold text-green-950">
            {getOptionLabel(selectedOption)}
          </span>
        </p>
      ) : (
        <p className="mb-2 text-xs text-green-900/60">None selected</p>
      )}
      <ul
        className="max-h-40 overflow-y-auto rounded-md border-2 border-green-950/25 bg-white"
        role="listbox"
        aria-label={label}
      >
        {filteredOptions.length === 0 ? (
          <li className="px-3 py-2 text-sm text-green-900/70">{emptyMessage}</li>
        ) : (
          filteredOptions.map((option) => {
            const key = getOptionValue(option);
            const selected = String(value) === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "bg-green-950 font-semibold text-white"
                      : "text-green-950 hover:bg-green-950/10"
                  }`}
                  onClick={() => onChange(key)}
                >
                  {getOptionLabel(option)}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
