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
import { useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa";
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

  async function refreshSlots() {
    const { data, error } = await supabase.from("planner_slots").select("*");
    if (!error && data) {
      setSlots(data);
    }
  }

  async function refreshBrokers() {
    const { data, error } = await supabase
      .from("brokers")
      .select("id, name")
      .order("name");
    if (!error && data) {
      setBrokers(data);
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
  }) {
    if (!editSlotTarget?.id || !plannerSchemaReady) return;
    setSavingSlotEdit(true);
    try {
      const patch = buildPlannerSlotUpdate(
        { origin, endUser, unitNumber, dispatched, unloaded, completed },
        slotCols,
      );
      const { data, error } = await supabase
        .from("planner_slots")
        .update(patch)
        .eq("id", editSlotTarget.id)
        .select()
        .single();

      if (error) {
        if (/schema cache|could not find the/i.test(error.message ?? "")) {
          alert(
            "Planner status columns may be missing. Run supabase/migrations/20260630130000_planner_slots_status_fields.sql in the Supabase SQL editor, then refresh.",
          );
        } else {
          alert(error.message);
        }
        return;
      }

      if (data) {
        setSlots((prev) => prev.map((s) => (s.id === data.id ? data : s)));
      }
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

  return (
    <div className="h-full w-full p-5">
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
        {brokers.map((b) => {
          const slotsForBroker = slotsForWeek.filter(
            (s) => String(readSlotBrokerId(s, slotCols)) === String(b.id),
          );
          return (
            <PlannerRow key={b.id}>
              <div className="sticky left-0 z-10 flex w-60 shrink-0 items-center self-stretch border-b-2 border-r-2 border-green-950 bg-white p-3 text-xl font-bold uppercase text-green-950">
                {b.name}
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
