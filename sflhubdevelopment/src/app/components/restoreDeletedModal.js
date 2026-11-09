"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import Modal from "./modal";
import ButtonDark from "./buttonDark";
import { createClient } from "@/lib/supabase/client";
import { parseISODateLocal } from "@/lib/weekDates";
import { useConfirm } from "@/context/confirmContext";
import { restoreDeletedConfirmOptions } from "@/lib/confirmEdit";

function weekLabel(iso) {
  if (!iso) return "an unknown week";
  return parseISODateLocal(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function deletedLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function rowKey(row) {
  return `${row.week_id}|${row.driver_name}|${row.unit_label ?? ""}`;
}

export default function RestoreDeletedModal({ onClose, onRestored }) {
  const confirm = useConfirm();
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [restoringKey, setRestoringKey] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestRef.current;
    const handle = setTimeout(() => {
      void (async () => {
        setLoading(true);
        const { data, error: searchError } = await supabase.rpc(
          "search_schedule_delete_archive",
          { p_query: query },
        );
        if (requestId !== requestRef.current) return;
        setLoading(false);
        if (searchError) {
          setResults([]);
          setError(searchError.message || "Could not search deleted rows.");
          return;
        }
        setError("");
        setResults(data ?? []);
      })();
    }, 250);
    return () => clearTimeout(handle);
  }, [query, supabase]);

  async function handleRestore(row) {
    const key = rowKey(row);
    const label = weekLabel(row.week_start_date);
    if (
      !(await confirm(
        restoreDeletedConfirmOptions(row.driver_name, row.unit_label, label),
      ))
    ) {
      return;
    }

    setRestoringKey(key);
    setError("");
    const { data, error: restoreError } = await supabase.rpc(
      "restore_schedule_archive_for_driver",
      {
        p_week_id: row.week_id,
        p_driver_name: row.driver_name,
      },
    );
    setRestoringKey(null);

    if (restoreError) {
      setError(restoreError.message || "Could not restore that delete.");
      return;
    }
    if (!data) {
      setError("That delete was already restored.");
      setResults((current) => current.filter((item) => rowKey(item) !== key));
      return;
    }

    setResults((current) => current.filter((item) => rowKey(item) !== key));
    await onRestored?.(row.week_id);
  }

  return (
    <Modal className="fixed bottom-0 right-0 z-50 max-w-xl rounded-lg p-6">
      <button
        type="button"
        className="absolute top-0 right-0 m-3 cursor-pointer text-2xl text-green-950"
        onClick={onClose}
      >
        <FaTimes />
      </button>
      <div className="flex flex-col gap-3 pr-8">
        <h3 className="text-lg font-bold text-green-950">Undo a delete</h3>
        <p className="text-sm text-green-900/80">
          Search deleted drivers or units. Restore puts that week’s assignment
          and loads back on the schedule.
        </p>
        <input
          type="search"
          value={query}
          autoFocus
          placeholder="Driver or unit…"
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-xl border border-green-950/20 p-2 text-green-950 placeholder:text-green-950/50"
        />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading && results.length === 0 ? (
            <p className="text-sm text-green-900/70">Searching…</p>
          ) : null}
          {!loading && results.length === 0 && !error ? (
            <p className="text-sm text-green-900/70">
              {query.trim()
                ? "No deleted assignments match."
                : "Nothing is waiting to be restored."}
            </p>
          ) : null}
          {results.map((row) => {
            const key = rowKey(row);
            const when = deletedLabel(row.deleted_at);
            const loads =
              Number(row.load_count) > 0
                ? `${row.load_count} load${Number(row.load_count) === 1 ? "" : "s"}`
                : "No filled loads";
            return (
              <div
                key={key}
                className="flex items-start justify-between gap-3 rounded-lg border border-green-950/15 p-3"
              >
                <div className="min-w-0 text-sm text-green-950">
                  <p className="font-semibold">{row.driver_name}</p>
                  <p>
                    {row.unit_label ? `Unit ${row.unit_label} · ` : ""}
                    Week of {weekLabel(row.week_start_date)}
                  </p>
                  <p className="text-green-900/75">
                    {when ? `Deleted ${when} · ` : ""}
                    {loads}
                    {row.load_numbers ? ` (${row.load_numbers})` : ""}
                  </p>
                </div>
                <ButtonDark
                  text={restoringKey === key ? "Restoring…" : "Restore"}
                  disabled={restoringKey != null}
                  onClick={() => void handleRestore(row)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
