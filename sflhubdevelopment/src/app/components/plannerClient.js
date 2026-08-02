"use client";

import { usePermissions } from "@/context/permissionsContext";
import { createClient } from "@/lib/supabase/client";
import {
  parseISODateLocal,
  resolveDefaultScheduleWeekId,
} from "@/lib/weekDates";
import {
  buildPlannerSlotInsert,
  buildPlannerSlotUpdate,
  plannerSlotColumns,
  plannerSlotSchemaErrorMessage,
  readSlotBrokerId,
  readSlotWeekId,
} from "@/lib/plannerSlots";
import { useEffect, useMemo, useState } from "react";
import { FaEye, FaEyeSlash, FaList, FaPlus, FaTimes } from "react-icons/fa";
import BtnWhite from "./btnWhite";
import EditPlannerSlotModal from "./editPlannerSlotModal";
import NewBrokerModal from "./newBrokerModal";
import NewPlannerSlotModal from "./newPlannerSlotModal";
import PlannerDayGrid from "./plannerDayGrid";
import PlannerRow from "./plannerRow";

function nextSortOrder(existingDaySlots, cols) {
  return (
    existingDaySlots.reduce(
      (max, slot) => Math.max(max, Number(slot[cols.sortOrder]) || 0),
      0,
    ) + 1
  );
}

export default function PlannerClient({
  slots: initialSlots,
  brokers: initialBrokers,
  weeks,
  slotColumns: slotColumnsProp = null,
  plannerSchemaReady = true,
  plannerSchemaMissing = [],
}) {
  const { canEdit } = usePermissions();
  const supabase = useMemo(() => createClient(), []);
  const [slots, setSlots] = useState(initialSlots ?? []);
  const [brokers, setBrokers] = useState(initialBrokers ?? []);
  const [selectedWeekId, setSelectedWeekId] = useState("");
  const [addBrokerOpen, setAddBrokerOpen] = useState(false);
  const [addSlotTarget, setAddSlotTarget] = useState(null);
  const [editSlotTarget, setEditSlotTarget] = useState(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [savingSlotEdit, setSavingSlotEdit] = useState(false);
  const [deletingSlotId, setDeletingSlotId] = useState(null);
  const [deletingBrokerId, setDeletingBrokerId] = useState(null);
  const [hiddenBrokerIds, setHiddenBrokerIds] = useState(() => new Set());
  const [togglingHideBrokerId, setTogglingHideBrokerId] = useState(null);
  const [division, setDivision] = useState("Canadian Grain");
  const [canOpen, setCanOpen] = useState(false);
  const [usOpen, setUsOpen] = useState(false);
  const [cattleOpen, setCattleOpen] = useState(false);

  const slotCols = useMemo(
    () =>
      slotColumnsProp ??
      plannerSlotColumns(slots[0] ?? initialSlots?.[0] ?? null),
    [slotColumnsProp, slots, initialSlots],
  );

  const resolveWeekId = useMemo(
    () => resolveDefaultScheduleWeekId(weeks, selectedWeekId),
    [weeks, selectedWeekId],
  );

  const activeWeek = useMemo(
    () => weeks.find((w) => w.id === resolveWeekId),
    [weeks, resolveWeekId],
  );

  const weekStartISO = activeWeek?.week_start_date ?? null;

  const slotsForWeek = useMemo(() => {
    if (!resolveWeekId) return [];
    return slots.filter(
      (s) => String(readSlotWeekId(s, slotCols)) === String(resolveWeekId),
    );
  }, [slots, resolveWeekId, slotCols]);

  const locale =
    typeof navigator !== "undefined" ? navigator.language : undefined;

  useEffect(() => {
    let cancelled = false;

    async function loadHides() {
      if (!resolveWeekId) {
        setHiddenBrokerIds(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("planner_week_broker_hides")
        .select("broker_id")
        .eq("week_id", resolveWeekId);

      if (cancelled) return;

      if (error) {
        if (
          !/planner_week_broker_hides|does not exist/i.test(error.message ?? "")
        ) {
          console.error(error);
        }
        setHiddenBrokerIds(new Set());
        return;
      }

      setHiddenBrokerIds(
        new Set((data ?? []).map((row) => String(row.broker_id))),
      );
    }

    void loadHides();
    return () => {
      cancelled = true;
    };
  }, [supabase, resolveWeekId]);

  async function refreshSlots() {
    const { data, error } = await supabase.from("planner_slots").select("*");
    if (!error && data) {
      setSlots(data);
    }
  }

  async function refreshBrokers() {
    const { data, error } = await supabase
      .from("brokers")
      .select("id, name, division")
      .order("name");
    if (!error && data) {
      setBrokers(data);
    }
  }

  async function handleDeleteBroker(broker) {
    if (!broker?.id || !canEdit) return;
    const label = String(broker.name ?? "this broker").trim() || "this broker";
    if (
      !confirm(`Delete ${label}? Their planner slots will also be removed.`)
    ) {
      return;
    }
    setDeletingBrokerId(broker.id);
    try {
      const { error } = await supabase
        .from("brokers")
        .delete()
        .eq("id", broker.id);

      if (error) {
        alert(error.message);
        return;
      }

      setBrokers((prev) => prev.filter((b) => b.id !== broker.id));
      setSlots((prev) =>
        prev.filter(
          (s) => String(readSlotBrokerId(s, slotCols)) !== String(broker.id),
        ),
      );
      setHiddenBrokerIds((prev) => {
        const next = new Set(prev);
        next.delete(String(broker.id));
        return next;
      });
    } finally {
      setDeletingBrokerId(null);
    }
  }

  async function handleHideBroker(broker) {
    if (!broker?.id || !canEdit || !resolveWeekId) return;
    setTogglingHideBrokerId(broker.id);
    try {
      const { error } = await supabase.from("planner_week_broker_hides").insert({
        week_id: resolveWeekId,
        broker_id: broker.id,
      });
      if (error) {
        alert(error.message);
        return;
      }
      setHiddenBrokerIds((prev) => new Set(prev).add(String(broker.id)));
    } finally {
      setTogglingHideBrokerId(null);
    }
  }

  async function handleUnhideBroker(broker) {
    if (!broker?.id || !canEdit || !resolveWeekId) return;
    setTogglingHideBrokerId(broker.id);
    try {
      const { error } = await supabase
        .from("planner_week_broker_hides")
        .delete()
        .eq("week_id", resolveWeekId)
        .eq("broker_id", broker.id);
      if (error) {
        alert(error.message);
        return;
      }
      setHiddenBrokerIds((prev) => {
        const next = new Set(prev);
        next.delete(String(broker.id));
        return next;
      });
    } finally {
      setTogglingHideBrokerId(null);
    }
  }

  async function handleDeleteSlot(slot) {
    if (!slot?.id || !plannerSchemaReady) return;
    setDeletingSlotId(slot.id);
    try {
      const { error } = await supabase
        .from("planner_slots")
        .delete()
        .eq("id", slot.id);

      if (error) {
        alert(error.message);
        return;
      }

      setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    } finally {
      setDeletingSlotId(null);
    }
  }

  async function handleUpdateSlot({
    origin,
    endUser,
    unitNumber,
    dispatched,
    unloaded,
    completed,
    rejected,
  }) {
    if (!editSlotTarget?.id || !plannerSchemaReady) return;
    setSavingSlotEdit(true);
    try {
      const patch = buildPlannerSlotUpdate(
        {
          origin,
          endUser,
          unitNumber,
          dispatched,
          unloaded,
          completed,
          rejected: Boolean(rejected),
        },
        slotCols,
      );
      // Always persist rejected explicitly (true when checked, false when not).
      patch[slotCols.rejected] = Boolean(rejected);

      const { data, error } = await supabase
        .from("planner_slots")
        .update(patch)
        .eq("id", editSlotTarget.id)
        .select()
        .single();

      if (error) {
        if (
          /schema cache|could not find the|rejected/i.test(error.message ?? "")
        ) {
          alert(
            "Planner rejected column may be missing. Run supabase/migrations/20260717160000_planner_slots_rejected.sql in the Supabase SQL editor (or npm run db:push), then refresh.",
          );
        } else {
          alert(error.message);
        }
        return;
      }

      const nextRow = data
        ? { ...data, ...patch }
        : { ...editSlotTarget, ...patch };
      setSlots((prev) =>
        prev.map((s) => (s.id === editSlotTarget.id ? nextRow : s)),
      );
      setEditSlotTarget(null);
    } finally {
      setSavingSlotEdit(false);
    }
  }

  async function handleCreateSlot({
    brokerId,
    origin,
    endUser,
    slotCount = 1,
  }) {
    if (!plannerSchemaReady) {
      alert(plannerSlotSchemaErrorMessage(plannerSchemaMissing));
      return;
    }
    if (!addSlotTarget?.weekId || !addSlotTarget?.planDate) return;
    setSavingSlot(true);
    try {
      const count = Math.max(1, Math.min(50, Number(slotCount) || 1));
      const startSort = nextSortOrder(
        addSlotTarget.existingDaySlots ?? [],
        slotCols,
      );
      const rows = Array.from({ length: count }, (_, index) =>
        buildPlannerSlotInsert(
          {
            brokerId,
            weekId: addSlotTarget.weekId,
            planDate: addSlotTarget.planDate,
            sortOrder: startSort + index,
            origin,
            endUser,
          },
          slotCols,
        ),
      );
      const { error } = await supabase.from("planner_slots").insert(rows);

      if (error) {
        if (/schema cache|could not find the/i.test(error.message ?? "")) {
          alert(plannerSlotSchemaErrorMessage(plannerSchemaMissing));
        } else {
          alert(error.message);
        }
        return;
      }

      await refreshSlots();
      setAddSlotTarget(null);
    } finally {
      setSavingSlot(false);
    }
  }

  const filteredBrokers = useMemo(
    () =>
      brokers.filter(
        (b) =>
          String(b.division ?? "")
            .trim()
            .toLowerCase() === String(division).trim().toLowerCase(),
      ),
    [brokers, division],
  );

  const visibleBrokers = useMemo(
    () =>
      filteredBrokers.filter((b) => !hiddenBrokerIds.has(String(b.id))),
    [filteredBrokers, hiddenBrokerIds],
  );

  const canGrainBrokers = useMemo(
    () =>
      brokers.filter(
        (b) =>
          String(b.division ?? "")
            .trim()
            .toLowerCase() === "canadian grain",
      ),
    [brokers],
  );

  const usGrainBrokers = useMemo(
    () =>
      brokers.filter(
        (b) =>
          String(b.division ?? "")
            .trim()
            .toLowerCase() === "us grain",
      ),
    [brokers],
  );

  const toggleCan = function () {
    if (usOpen) setUsOpen(false);
    if (cattleOpen) setCattleOpen(false);
    setCanOpen(!canOpen);
  };

  const toggleUs = function () {
    if (canOpen) setCanOpen(false);
    if (cattleOpen) setCattleOpen(false);
    setUsOpen(!usOpen);
  };

  const toggleCattle = function () {
    if (usOpen) setUsOpen(false);
    if (canOpen) setCanOpen(false);
    setCattleOpen(!cattleOpen);
  };

  const cattleBrokers = useMemo(
    () =>
      brokers.filter(
        (b) =>
          String(b.division ?? "")
            .trim()
            .toLowerCase() === "cattle",
      ),
    [brokers],
  );

  function renderBrokerListItem(b) {
    const isHidden = hiddenBrokerIds.has(String(b.id));
    return (
      <div
        className={`my-4 flex w-80 items-center justify-between gap-2 border-2 border-green-950 p-3 text-green-950 ${isHidden ? "opacity-60" : ""}`}
        key={b.id}
      >
        <span className="min-w-0 flex-1">
          {b.name}
          {isHidden ? (
            <span className="ml-2 text-xs font-semibold uppercase text-green-900/70">
              Hidden this week
            </span>
          ) : null}
        </span>
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="p-1 text-xl text-green-950 hover:opacity-70 disabled:opacity-50"
              aria-label={
                isHidden
                  ? `Show ${b.name} on planner this week`
                  : `Hide ${b.name} on planner this week`
              }
              disabled={
                !resolveWeekId || togglingHideBrokerId === b.id
              }
              onClick={() =>
                void (isHidden
                  ? handleUnhideBroker(b)
                  : handleHideBroker(b))
              }
            >
              {isHidden ? <FaEye /> : <FaEyeSlash />}
            </button>
            <button
              type="button"
              className="p-1 text-xl text-red-600 hover:text-red-800 disabled:opacity-50"
              aria-label={`Delete ${b.name}`}
              disabled={deletingBrokerId === b.id}
              onClick={() => void handleDeleteBroker(b)}
            >
              <FaTimes />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="h-full w-full p-5">
      <div className="flex fixed bottom-0 left-1/2 transform -translate-x-1/2">
        <BtnWhite
          Icon={FaList}
          text="Canadian Grain Brokers"
          type="button"
          onClick={toggleCan}
        />
        <BtnWhite
          Icon={FaList}
          text="US Grain Brokers"
          type="button"
          onClick={toggleUs}
        />
        <BtnWhite
          Icon={FaList}
          text="Cattle Brokers"
          type="button"
          onClick={toggleCattle}
        />
      </div>

      <div
        className={`fixed top-0 right-0 bg-white w-90 h-screen z-50 ${canOpen ? "" : "hidden"} overflow-y-scroll`}
      >
        <div className="p-3 text-2xl flex font-bold text-green-950">
          <button
            className="text-green-950 mr-2 cursor-pointer"
            type="button"
            onClick={() => setCanOpen(false)}
          >
            <FaTimes />
          </button>
          <h2>Canadian Grain Brokers</h2>
        </div>

        <div className="flex flex-col items-center">
          {canGrainBrokers.map(renderBrokerListItem)}
        </div>
      </div>
      <div
        className={`fixed top-0 right-0 bg-white w-90 h-screen z-50 ${usOpen ? "" : "hidden"} overflow-y-scroll`}
      >
        <div className="p-3 text-2xl flex font-bold text-green-950">
          <button
            className="text-green-950 mr-10 cursor-pointer"
            type="button"
            onClick={() => setUsOpen(false)}
          >
            <FaTimes />
          </button>
          <h2>US Grain Brokers</h2>
        </div>

        <div className="flex flex-col items-center">
          {usGrainBrokers.map(renderBrokerListItem)}
        </div>
      </div>
      <div
        className={`fixed top-0 right-0 bg-white w-90 h-screen z-50 ${cattleOpen ? "" : "hidden"} overflow-y-scroll`}
      >
        <div className="p-3 text-2xl flex font-bold text-green-950">
          <button
            className="text-green-950 mr-14 cursor-pointer"
            type="button"
            onClick={() => setCattleOpen(false)}
          >
            <FaTimes />
          </button>
          <h2>Cattle Brokers</h2>
        </div>

        <div className="flex flex-col items-center">
          {cattleBrokers.map(renderBrokerListItem)}
        </div>
      </div>
      <EditPlannerSlotModal
        open={editSlotTarget != null}
        onClose={() => setEditSlotTarget(null)}
        slot={editSlotTarget}
        slotCols={slotCols}
        canEdit={canEdit && plannerSchemaReady}
        saving={savingSlotEdit}
        onSubmit={handleUpdateSlot}
      />

      <NewBrokerModal
        open={addBrokerOpen}
        onClose={() => setAddBrokerOpen(false)}
        onCreated={refreshBrokers}
      />

      <NewPlannerSlotModal
        open={addSlotTarget != null}
        onClose={() => setAddSlotTarget(null)}
        brokers={brokers}
        initialBrokerId={addSlotTarget?.brokerId ?? ""}
        bulk={Boolean(addSlotTarget?.bulk)}
        dayTitle={
          addSlotTarget?.dayTitle ? `Day: ${addSlotTarget.dayTitle}` : ""
        }
        saving={savingSlot}
        onSubmit={handleCreateSlot}
      />

      {!plannerSchemaReady ? (
        <p className="mx-4 mb-4 rounded-lg border border-amber-400/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          Planner table is missing columns ({plannerSchemaMissing.join(", ")}).
          Run{" "}
          <span className="font-mono text-amber-50">
            supabase/migrations/20260630120000_planner_slots_schema.sql
          </span>{" "}
          in the Supabase SQL editor, then refresh this page.
        </p>
      ) : null}

      <div className="m-2 flex flex-wrap items-center gap-3 p-3">
        <select
          className="rounded-lg border-2 bg-[#171717] p-2 text-white"
          value={division}
          onChange={(e) => setDivision(e.target.value)}
        >
          <option className="text-green-950 bg-white" value="Canadian Grain">
            Canadian Grain
          </option>
          <option className="text-green-950 bg-white" value="US Grain">
            US Grain
          </option>
          <option className="text-green-950 bg-white" value="Cattle">
            Cattle
          </option>
        </select>
        <select
          value={resolveWeekId ?? ""}
          onChange={(e) => setSelectedWeekId(e.target.value || null)}
          className="rounded-lg border-2 bg-[#171717] p-2 text-white"
        >
          {weeks.length === 0 ? (
            <option value="">No weeks yet</option>
          ) : (
            weeks.map((w) => {
              const weekStart = parseISODateLocal(w.week_start_date);
              return (
                <option
                  key={w.id}
                  value={w.id}
                  className="bg-white text-green-950"
                >
                  Week of Sun{" "}
                  {new Intl.DateTimeFormat(locale, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }).format(weekStart)}
                </option>
              );
            })
          )}
        </select>
        {canEdit ? (
          <BtnWhite
            Icon={FaPlus}
            text="Add Broker"
            onClick={() => setAddBrokerOpen(true)}
          />
        ) : null}
      </div>
      <div className="mx-2 max-h-[calc(100dvh-14rem)] overflow-auto rounded-md border border-green-950/25 bg-white">
        {visibleBrokers.map((b) => {
          const slotsForBroker = slotsForWeek.filter(
            (s) => String(readSlotBrokerId(s, slotCols)) === String(b.id),
          );
          return (
            <PlannerRow key={b.id}>
              <div className="sticky left-0 z-10 flex w-60 shrink-0 items-center gap-2 self-stretch border-b-2 border-r-2 border-green-950 bg-white p-3 text-xl font-bold uppercase text-green-950">
                <span className="min-w-0 flex-1">{b.name}</span>
                {canEdit ? (
                  <button
                    type="button"
                    className="shrink-0 p-1 text-base text-green-950/70 hover:text-green-950 disabled:opacity-50"
                    aria-label={`Hide ${b.name} on planner this week`}
                    title="Hide for this week"
                    disabled={
                      !resolveWeekId || togglingHideBrokerId === b.id
                    }
                    onClick={() => void handleHideBroker(b)}
                  >
                    <FaEyeSlash />
                  </button>
                ) : null}
              </div>
              <PlannerDayGrid
                brokerId={b.id}
                weekId={resolveWeekId}
                weekStartISO={weekStartISO}
                slots={slotsForBroker}
                slotCols={slotCols}
                canEdit={canEdit && plannerSchemaReady}
                onRequestAddSlot={setAddSlotTarget}
                onRequestAddMultipleSlots={setAddSlotTarget}
                onSelectSlot={setEditSlotTarget}
                onDeleteSlot={
                  canEdit && plannerSchemaReady ? handleDeleteSlot : undefined
                }
                deletingSlotId={deletingSlotId}
              />
            </PlannerRow>
          );
        })}
      </div>
    </div>
  );
}
