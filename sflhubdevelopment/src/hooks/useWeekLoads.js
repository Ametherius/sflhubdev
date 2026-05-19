"use client";

import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePostgresRealtime } from "./usePostgresRealtime";

const LOAD_SELECT_MODERN =
  "id, week_id, load_date, load_slot_id, in_use_unit_id, load_note, origin, end_user, mt, rate, load_total, loadsheet_id, load_number, fsc";
const LOAD_SELECT_MODERN_NO_LOADSHEET =
  "id, week_id, load_date, load_slot_id, in_use_unit_id, load_note, origin, end_user, mt, rate, fsc, load_total";
const LOAD_SELECT_MODERN_NO_FSC =
  "id, week_id, load_date, load_slot_id, in_use_unit_id, load_note, origin, end_user, mt, rate, load_total, loadsheet_id, load_number";
const LOAD_SELECT_MODERN_NO_DETAIL =
  "id, week_id, load_date, load_slot_id, in_use_unit_id, load_note";
const LOAD_SELECT_MODERN_NO_NOTE =
  "id, week_id, load_date, load_slot_id, in_use_unit_id";
const LOAD_SELECT_MODERN_NO_UNIT = "id, week_id, load_date, load_slot_id";
const LOAD_SELECT_LEGACY = "id, week_id, load_date, slot_index";

function isMissingLoadSlotIdColumn(message) {
  return /load_slot_id|column .* does not exist/i.test(message ?? "");
}

function isMissingSortOrderColumn(message) {
  return /\bsort_order\b/i.test(message ?? "") && /does not exist/i.test(message ?? "");
}

/** Merge load_slots by load_slot_id (post-migration schema). */
function mergeLoadSlotsById(loadRows, slotRows) {
  const slotMap = new Map();
  for (const s of slotRows ?? []) {
    slotMap.set(s.id, s);
  }
  return (loadRows ?? []).map((row) => ({
    ...row,
    load_slots: slotMap.get(row.load_slot_id) ?? null,
  }));
}

/** Merge load_slots by slot_index ↔ sort_order, or by row order when sort_order is absent. */
function mergeLoadSlotsBySlotIndex(loadRows, slotRows) {
  const slots = slotRows ?? [];
  const allHaveSort =
    slots.length > 0 &&
    slots.every((s) => Number.isFinite(Number(s.sort_order)));
  const byKey = new Map();
  if (allHaveSort) {
    for (const s of slots) {
      byKey.set(Number(s.sort_order), s);
    }
  } else {
    [...slots]
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .forEach((s, i) => {
        byKey.set(i, s);
      });
  }
  return (loadRows ?? []).map((row) => {
    const slot = byKey.get(Number(row.slot_index));
    return {
      ...row,
      load_slot_id: slot?.id ?? null,
      load_slots: slot ?? null,
    };
  });
}

/**
 * @returns {[Array, () => Promise<void>, { ready: boolean, legacySlotIndex: boolean }]}
 */
export function useWeekLoads(weekId) {
  const [loads, setLoads] = useState([]);
  const [ready, setReady] = useState(false);
  const [legacySlotIndex, setLegacySlotIndex] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const refreshLoads = useCallback(async () => {
    if (!weekId) {
      setLoads([]);
      setReady(true);
      setLegacySlotIndex(false);
      return;
    }
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setReady(true);
      return;
    }

    let modern = await supabase
      .from("schedule_loads")
      .select(LOAD_SELECT_MODERN)
      .eq("week_id", weekId)
      .order("load_date", { ascending: true })
      .order("load_slot_id", { ascending: true });

    if (
      modern.error &&
      /loadsheet_id|load_number/i.test(modern.error.message ?? "") &&
      /does not exist/i.test(modern.error.message ?? "")
    ) {
      modern = await supabase
        .from("schedule_loads")
        .select(LOAD_SELECT_MODERN_NO_LOADSHEET)
        .eq("week_id", weekId)
        .order("load_date", { ascending: true })
        .order("load_slot_id", { ascending: true });
    }

    if (
      modern.error &&
      /\bfsc\b/i.test(modern.error.message ?? "") &&
      /does not exist/i.test(modern.error.message ?? "")
    ) {
      modern = await supabase
        .from("schedule_loads")
        .select(LOAD_SELECT_MODERN_NO_FSC)
        .eq("week_id", weekId)
        .order("load_date", { ascending: true })
        .order("load_slot_id", { ascending: true });
    }

    if (
      modern.error &&
      /"(origin|end_user|mt|rate|load_total)"/i.test(modern.error.message ?? "") &&
      /does not exist/i.test(modern.error.message ?? "")
    ) {
      modern = await supabase
        .from("schedule_loads")
        .select(LOAD_SELECT_MODERN_NO_DETAIL)
        .eq("week_id", weekId)
        .order("load_date", { ascending: true })
        .order("load_slot_id", { ascending: true });
    }

    if (
      modern.error &&
      /\bload_note\b/i.test(modern.error.message ?? "") &&
      /does not exist/i.test(modern.error.message ?? "")
    ) {
      modern = await supabase
        .from("schedule_loads")
        .select(LOAD_SELECT_MODERN_NO_NOTE)
        .eq("week_id", weekId)
        .order("load_date", { ascending: true })
        .order("load_slot_id", { ascending: true });
    }

    if (
      modern.error &&
      /\bin_use_unit_id\b/i.test(modern.error.message ?? "") &&
      /does not exist/i.test(modern.error.message ?? "")
    ) {
      modern = await supabase
        .from("schedule_loads")
        .select(LOAD_SELECT_MODERN_NO_UNIT)
        .eq("week_id", weekId)
        .order("load_date", { ascending: true })
        .order("load_slot_id", { ascending: true });
    }

    if (!modern.error) {
      setLegacySlotIndex(false);
      const list = modern.data ?? [];
      const ids = [...new Set(list.map((r) => r.load_slot_id).filter(Boolean))];

      if (ids.length === 0) {
        setLoads(list);
        setReady(true);
        return;
      }

      let slotsRes = await supabase
        .from("load_slots")
        .select("id, sort_order, name, label")
        .in("id", ids);
      if (slotsRes.error) {
        if (isMissingSortOrderColumn(slotsRes.error.message)) {
          slotsRes = await supabase.from("load_slots").select("id").in("id", ids);
        } else if (/does not exist/i.test(slotsRes.error.message ?? "")) {
          slotsRes = await supabase.from("load_slots").select("id, sort_order").in("id", ids);
          if (
            slotsRes.error &&
            isMissingSortOrderColumn(slotsRes.error.message)
          ) {
            slotsRes = await supabase.from("load_slots").select("id").in("id", ids);
          }
        }
      }
      const { data: slots, error: slotErr } = slotsRes;

      if (slotErr) {
        console.error(slotErr.message);
        setLoads(list.map((r) => ({ ...r, load_slots: null })));
        setReady(true);
        return;
      }

      setLoads(mergeLoadSlotsById(list, slots));
      setReady(true);
      return;
    }

    if (!isMissingLoadSlotIdColumn(modern.error.message)) {
      console.error(modern.error.message);
      setReady(true);
      return;
    }

    const legacy = await supabase
      .from("schedule_loads")
      .select(LOAD_SELECT_LEGACY)
      .eq("week_id", weekId)
      .order("load_date", { ascending: true })
      .order("slot_index", { ascending: true });

    if (legacy.error) {
      console.error(legacy.error.message);
      setLoads([]);
      setLegacySlotIndex(true);
      setReady(true);
      return;
    }

    setLegacySlotIndex(true);
    const list = legacy.data ?? [];
    let slotsRes = await supabase
      .from("load_slots")
      .select("id, sort_order, name, label")
      .order("sort_order", { ascending: true });
    if (slotsRes.error && isMissingSortOrderColumn(slotsRes.error.message)) {
      slotsRes = await supabase
        .from("load_slots")
        .select("id, name, label")
        .order("id", { ascending: true });
    }
    if (slotsRes.error && /does not exist/i.test(slotsRes.error.message ?? "")) {
      slotsRes = await supabase
        .from("load_slots")
        .select("id")
        .order("id", { ascending: true });
    }
    const { data: allSlots, error: slotErr } = slotsRes;

    if (slotErr) {
      console.error(slotErr.message);
      setLoads(list.map((r) => ({ ...r, load_slots: null, load_slot_id: null })));
      setReady(true);
      return;
    }

    setLoads(mergeLoadSlotsBySlotIndex(list, allSlots));
    setReady(true);
  }, [supabase, weekId]);

  const loadsFilter = weekId ? `week_id=eq.${weekId}` : undefined;

  useEffect(() => {
    queueMicrotask(() => {
      void refreshLoads();
    });
  }, [refreshLoads]);

  usePostgresRealtime(
    supabase,
    weekId ? "schedule_loads" : null,
    loadsFilter,
    refreshLoads,
  );
  // Slot label/metadata lives on load_slots; schedule_loads rows do not change when slots are renamed.
  usePostgresRealtime(
    supabase,
    weekId ? "load_slots" : null,
    undefined,
    refreshLoads,
  );

  const mergeScheduleLoad = useCallback((row) => {
    if (!row?.id) return;
    setLoads((prev) => {
      const id = String(row.id);
      const idx = prev.findIndex((l) => String(l.id) === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...row };
        return next;
      }
      return [...prev, row];
    });
  }, []);

  const meta = useMemo(
    () => ({ ready, legacySlotIndex }),
    [ready, legacySlotIndex],
  );

  return [loads, refreshLoads, meta, mergeScheduleLoad];
}
