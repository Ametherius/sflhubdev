"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  autoSelectFirst = false,
  selectOnNavigate = false,
  autoFocus = false,
  className = "min-w-0 flex-1 p-2",
  listClassName = "max-h-40",
}) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const selectedKey = value != null ? String(value) : "";
    if (!q) return options;

    return options.filter((option) => {
      const key = getOptionValue(option);
      if (!selectOnNavigate && selectedKey && key === selectedKey) return true;
      return getOptionLabel(option).toLowerCase().includes(q);
    });
  }, [options, query, value, getOptionLabel, getOptionValue, selectOnNavigate]);

  const selectedOption = useMemo(
    () => options.find((o) => getOptionValue(o) === String(value)),
    [options, value, getOptionValue],
  );

  useEffect(() => {
    if (!open || !autoSelectFirst || !options.length) return;
    const hasValue =
      value != null &&
      String(value) !== "" &&
      options.some((o) => getOptionValue(o) === String(value));
    if (hasValue) return;
    onChange?.(getOptionValue(options[0]));
  }, [open, autoSelectFirst, options, value, getOptionValue, onChange]);

  useEffect(() => {
    if (!filteredOptions.length) {
      setHighlightIndex(0);
      return;
    }
    const selectedIdx = filteredOptions.findIndex(
      (o) => getOptionValue(o) === String(value),
    );
    if (selectedIdx >= 0) {
      setHighlightIndex(selectedIdx);
      return;
    }
    setHighlightIndex(0);
    if (selectOnNavigate) {
      onChange?.(getOptionValue(filteredOptions[0]));
    }
  }, [filteredOptions, value, getOptionValue, selectOnNavigate, onChange]);

  useEffect(() => {
    itemRefs.current[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  function selectIndex(index) {
    if (!filteredOptions.length) return;
    const next =
      ((index % filteredOptions.length) + filteredOptions.length) %
      filteredOptions.length;
    setHighlightIndex(next);
    if (selectOnNavigate) {
      onChange?.(getOptionValue(filteredOptions[next]));
    }
  }

  function handleKeyDown(e) {
    if (!filteredOptions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectIndex(highlightIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectIndex(highlightIndex - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      selectIndex(filteredOptions.length - 1);
    } else if (e.key === "Enter") {
      const option = filteredOptions[highlightIndex];
      if (!option) return;
      e.preventDefault();
      onChange?.(getOptionValue(option));
    }
  }

  const activeOption = filteredOptions[highlightIndex];
  const activeId = activeOption
    ? `${listboxId}-option-${getOptionValue(activeOption)}`
    : undefined;

  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-green-950">
        {label}
      </label>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="mb-2 block w-full rounded-md border-2 border-green-950 bg-white p-2.5 text-sm text-black placeholder:text-green-950/50"
        autoComplete="off"
        autoFocus={autoFocus}
        role="combobox"
        aria-expanded="true"
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
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
        id={listboxId}
        className={`${listClassName} overflow-y-auto rounded-md border-2 border-green-950/25 bg-white`}
        role="listbox"
        aria-label={label}
      >
        {filteredOptions.length === 0 ? (
          <li className="px-3 py-2 text-sm text-green-900/70">{emptyMessage}</li>
        ) : (
          filteredOptions.map((option, index) => {
            const key = getOptionValue(option);
            const selected = String(value) === key;
            const highlighted = index === highlightIndex;
            return (
              <li key={key} id={`${listboxId}-option-${key}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    selected
                      ? "bg-green-950 font-semibold text-white"
                      : highlighted
                        ? "bg-green-950/15 font-medium text-green-950"
                        : "text-green-950 hover:bg-green-950/10"
                  }`}
                  onClick={() => onChange(key)}
                  onMouseEnter={() => setHighlightIndex(index)}
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
