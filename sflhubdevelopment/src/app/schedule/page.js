"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../components/header";
import { useUnits } from "@/hooks/useUnits";
import BtnWhite from "../components/btnWhite";
import {
  FaCalendar,
  FaList,
  FaPlus,
  FaTimes,
  FaTruck,
  FaUser,
} from "react-icons/fa";
import { useDrivers } from "@/hooks/useDrivers";
import DriverCard from "../components/driverCard";
import UnitCard from "../components/unitCard";
import Modal from "../components/modal";
import FormSelect from "../components/formSelect";
import ButtonDark from "../components/buttonDark";
import EditDriverModal from "../components/editDriverModal";
import EditUnitModal from "../components/editUnitModal";
import NewDriverModal from "../components/newDriverModal";
import NewUnitModal from "../components/newUnitModal";
import { useAssigned } from "@/hooks/useAssigned";
import { useScheduleWeeks } from "@/hooks/useScheduleWeeks";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import NewWeekModal from "../components/newWeekModal";
import NewLoadsheetModal from "../components/newLoadsheetModal";
import EditLoadsheetModal from "../components/editLoadsheetModal";
import { insertLoadsheetCopy } from "@/lib/loadsheetCopy";
import { useWeekLoads } from "@/hooks/useWeekLoads";
import { useWeekAssignments } from "@/hooks/useWeekAssignments";
import {
  loadBelongsToAssignment,
  resolveVacateTarget,
} from "@/lib/scheduleAssignmentDisplay";
import { useLoadSlots } from "@/hooks/useLoadSlots";
import { useLoadSheets } from "@/hooks/useLoadSheets";
import ScheduleRow from "../components/scheduleRow";
import { isScheduleWeekFkError } from "@/lib/scheduleLoadsPersist";
import AssignedMenu from "../components/assignedMenu";
import LoadsheetMenu from "../components/loadsheetMenu";
import CattleLoadsheet from "../components/cattleLoadsheet";
import {
  resolveDefaultScheduleWeekId,
  weekAcceptsNewAssignments,
  weekIsComplete,
} from "@/lib/weekDates";
import { useConfirm } from "@/context/confirmContext";
import {
  deleteDriverConfirmOptions,
  deleteLoadsheetConfirmOptions,
  vacateEmptyScheduleConfirmOptions,
  vacateUnitConfirmOptions,
} from "@/lib/confirmEdit";

export default function Schedule() {
  const confirm = useConfirm();
  const [drivers, refreshDrivers] = useDrivers();
  const [units, refreshUnits] = useUnits();
  const [activeUser] = useUser();
  const [assigned, refreshAssigned] = useAssigned();
  const [weeks, refreshWeeks, createWeek] = useScheduleWeeks();
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [newWeekModalKey, setNewWeekModalKey] = useState(0);
  const resolvedWeekId = useMemo(
    () => resolveDefaultScheduleWeekId(weeks, selectedWeekId),
    [weeks, selectedWeekId],
  );
  const [newWeekModalOpen, setNewWeekModalOpen] = useState(false);
  const [newLoadsheetModalOpen, setNewLoadsheetModalOpen] = useState(false);
  const [assignedMenu, setAssignedMenu] = useState(false);
  const [unitsShowing, setUnitsShowing] = useState(false);
  const [driversShowing, setDriversShowing] = useState(false);
  const [searchDrivers, setSearchDrivers] = useState("");
  const [searchUnits, setSearchUnits] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");
  const [assignModal, setAssignModal] = useState(false);
  const [driverValue, setDriverValue] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [editDriver, setEditDriver] = useState(null);
  const [editUnit, setEditUnit] = useState(null);
  const [newDriverModalOpen, setNewDriverModalOpen] = useState(false);
  const [newUnitModalOpen, setNewUnitModalOpen] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const [loads, refreshLoads, , mergeScheduleLoad] =
    useWeekLoads(resolvedWeekId);
  const [loadSlots] = useLoadSlots();
  const [loadSheets, refreshLoadSheets] = useLoadSheets();
  const [searchByName, setSearchByName] = useState("");
  const [loadsheetMenu, setLoadsheetMenu] = useState(false);
  const [editLoadsheetId, setEditLoadsheetId] = useState(null);
  const [copyingLoadsheetId, setCopyingLoadsheetId] = useState(null);

  async function handleDeleteLoadsheet(sheet) {
    if (!sheet?.id) return;
    const label = String(sheet.load_number ?? "").trim() || "this loadsheet";
    if (!(await confirm(deleteLoadsheetConfirmOptions(label)))) return;
    const { error } = await supabase
      .from("loadsheets")
      .delete()
      .eq("id", sheet.id);
    if (error) {
      alert(error.message);
      return;
    }
    if (editLoadsheetId === sheet.id) setEditLoadsheetId(null);
    await refreshLoadSheets();
  }

  function handleEditLoadsheet(sheet) {
    if (!sheet?.id) return;
    setEditLoadsheetId(sheet.id);
  }

  async function handleCopyLoadsheet(sheet) {
    if (!sheet?.id || copyingLoadsheetId) return;
    setCopyingLoadsheetId(sheet.id);
    const { error } = await insertLoadsheetCopy(supabase, sheet, loadSheets);
    setCopyingLoadsheetId(null);
    if (error) {
      if (/does not exist|schema cache|PGRST205/i.test(error.message ?? "")) {
        alert(
          "The loadsheets table is not available. Apply migrations, then try again.",
        );
      } else {
        alert(error.message);
      }
      return;
    }
    await refreshLoadSheets();
  }

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.id === resolvedWeekId) ?? null,
    [weeks, resolvedWeekId],
  );

  const [weekDisplayRows, refreshSnapshots] = useWeekAssignments(
    resolvedWeekId,
    assigned,
    selectedWeek?.week_start_date ?? null,
  );

  const scheduleRowsForDisplay = useMemo(() => {
    let rows = weekDisplayRows ?? [];
    const divisionQ = searchAssigned.trim().toLowerCase();
    if (divisionQ) {
      rows = rows.filter((r) =>
        (r.driver?.division ?? "").toLowerCase().includes(divisionQ),
      );
    }
    const nameQ = searchByName.trim().toLowerCase();
    if (nameQ) {
      rows = rows.filter((r) =>
        (r.driver?.name ?? "").toLowerCase().includes(nameQ),
      );
    }
    return rows;
  }, [weekDisplayRows, searchAssigned, searchByName]);

  const assignableUnits = useMemo(
    () =>
      (weekDisplayRows ?? [])
        .filter((r) => r.inUseUnitId != null && !r.isArchived)
        .map((r) => ({
          inUseUnitId: r.inUseUnitId,
          label: `${r.driver?.name ?? "Driver"} · ${r.unit?.unit ?? "Unit"}`,
          division: r.driver?.division ?? "",
        })),
    [weekDisplayRows],
  );

  const assignmentIdsKey = useMemo(
    () =>
      assigned
        .filter((row) => row.driver && row.unit)
        .map((row) => String(row.id))
        .sort()
        .join(","),
    [assigned],
  );

  useEffect(() => {
    if (!resolvedWeekId || !assignmentIdsKey) return;
    if (
      !weekAcceptsNewAssignments(selectedWeek?.week_start_date ?? null)
    ) {
      return;
    }
    void (async () => {
      const { error } = await supabase.rpc("ensure_schedule_loads_for_week", {
        p_week_id: resolvedWeekId,
      });
      if (error) {
        if (
          /load_slot_id|in_use_unit_id|column .* does not exist|function .* does not exist/i.test(
            error.message,
          )
        ) {
          return;
        }
        if (isScheduleWeekFkError(error.message)) {
          setSelectedWeekId(null);
          await refreshWeeks();
          console.error(error.message);
          return;
        }
        console.error(error.message);
      }
      await refreshLoads();
    })();
  }, [
    resolvedWeekId,
    assignmentIdsKey,
    selectedWeek?.week_start_date,
    supabase,
    refreshLoads,
  ]);

  function vacateHandlerForRow(row) {
    const target = resolveVacateTarget(
      row,
      loads,
      assigned,
      resolvedWeekId,
    );
    if (!target) return undefined;
    const weekStart = selectedWeek?.week_start_date ?? null;
    if (target.type === "live" && !target.scheduleOnly) {
      return () => void handleVacateUnit(target.inUseUnitId, weekStart);
    }
    return () => void handleVacateEmptySchedule(target, weekStart);
  }

  async function handleVacateEmptySchedule(target, weekStartISO = null) {
    if (!target?.weekId) return;
    const viewingPastWeek = weekIsComplete(weekStartISO);
    if (!(await confirm(vacateEmptyScheduleConfirmOptions({ viewingPastWeek })))) {
      return;
    }

    if (target.type === "live") {
      const unitId = target.inUseUnitId;
      const { error: loadsErr } = await supabase
        .from("schedule_loads")
        .delete()
        .eq("week_id", target.weekId)
        .eq("in_use_unit_id", unitId);
      if (loadsErr) {
        alert(loadsErr.message);
        return;
      }

      const { error: assignErr } = await supabase
        .from("schedule_assignments")
        .delete()
        .eq("week_id", target.weekId)
        .eq("in_use_unit_id", unitId);
      if (assignErr && !/does not exist/i.test(assignErr.message ?? "")) {
        alert(assignErr.message);
        return;
      }

      const { error: unitErr } = await supabase
        .from("in_use_units")
        .delete()
        .eq("id", unitId);
      if (unitErr) {
        alert(unitErr.message);
        return;
      }

      await refreshAssigned();
      await refreshSnapshots();
      await refreshLoads();
      return;
    }

    const assignmentId = target.scheduleAssignmentId;
    const { error: loadsErr } = await supabase
      .from("schedule_loads")
      .delete()
      .eq("schedule_assignment_id", assignmentId);
    if (loadsErr) {
      alert(loadsErr.message);
      return;
    }

    const { error: assignErr } = await supabase
      .from("schedule_assignments")
      .delete()
      .eq("id", assignmentId);
    if (assignErr) {
      alert(assignErr.message);
      return;
    }

    await refreshSnapshots();
    await refreshLoads();
  }

  async function handleVacateUnit(inUseUnitId, weekStartISO = null) {
    if (inUseUnitId == null) return;
    const viewingPastWeek = weekIsComplete(weekStartISO);
    if (!(await confirm(vacateUnitConfirmOptions({ viewingPastWeek })))) {
      return;
    }

    const { error } = await supabase
      .from("in_use_units")
      .delete()
      .eq("id", inUseUnitId);

    if (error) {
      alert(error.message);
      console.error(error.message);
      return;
    }
    await refreshAssigned();
    await refreshSnapshots();
    await refreshLoads();
  }

  async function handleDeleteDriver(id) {
    if (!(await confirm(deleteDriverConfirmOptions()))) return;
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    await refreshDrivers();
    await refreshAssigned();
    await refreshLoads();
  }

  const searchedDrivers = drivers.filter((d) => {
    return d.name.toLowerCase().includes(searchDrivers.toLowerCase());
  });

  const searchedUnits = units.filter((u) => {
    return String(u.unit).toLowerCase().includes(searchUnits.toLowerCase());
  });

  const sortedDrivers = [...drivers].sort((a, b) => {
    const driverA = (a.name ?? "").trim();
    const driverB = (b.name ?? "").trim();
    return driverA.localeCompare(driverB, undefined, { sensitivity: "base" });
  });

  const sortedUnits = [...units].sort((a, b) => {
    const unitA = a.unit;
    const unitB = b.unit;
    const numA = Number(unitA);
    const numB = Number(unitB);

    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return numA - numB;
    }
  });

  async function handleCreateWeek(weekStartISO) {
    const { error, weekId } = await createWeek(weekStartISO);
    if (weekId) setSelectedWeekId(weekId);
    return { error };
  }

  function toggleUnitMenu() {
    if (driversShowing) setDriversShowing(false);
    if (assignedMenu) setAssignedMenu(false);
    setUnitsShowing(!unitsShowing);
  }

  function toggleLoadsheets() {
    if (unitsShowing) setUnitsShowing(false);
    if (driversShowing) setDriversShowing(false);
    if (assignedMenu) setAssignedMenu(false);
    setLoadsheetMenu(!loadsheetMenu);
  }

  function toggleDriverMenu() {
    if (unitsShowing) setUnitsShowing(false);
    if (assignedMenu) setAssignedMenu(false);
    setDriversShowing(!driversShowing);
  }

  function toggleAssignedMenu() {
    if (unitsShowing) setUnitsShowing(false);
    if (driversShowing) setDriversShowing(false);
    setAssignedMenu(!assignedMenu);
  }

  async function createAssigned() {
    if (!activeUser) return;
    if (!driverValue.trim() || !unitValue.trim()) {
      alert("Please select both a driver and a unit.");
      return;
    }

    const selectedDriver = drivers.find(
      (d) => String(d.id) === String(driverValue),
    );
    if (!selectedDriver) {
      alert("Driver Not Found");
      return;
    }
    const selectedDriverID = selectedDriver.id;

    const selectedUnit = units.find((u) => String(u.id) === String(unitValue));
    if (!selectedUnit) {
      alert("Unit Not Found");
      return;
    }
    const selectedUnitID = selectedUnit.id;

    const { error } = await supabase.from("in_use_units").insert({
      driverid: selectedDriverID,
      unitid: selectedUnitID,
    });

    if (error) {
      console.error(error.message);
      return;
    }
    await refreshAssigned();
    setDriverValue("");
    setUnitValue("");
    setAssignModal(false);
  }
  return (
    <div className="flex h-dvh min-h-0 w-full max-w-full flex-col overflow-hidden">
      <div className="shrink-0">
        <Header />
      </div>
      <div className="shrink-0 py-6 text-center text-3xl font-bold text-white">
        <h2>Weekly Schedule</h2>
      </div>

      <NewWeekModal
        key={newWeekModalKey}
        open={newWeekModalOpen}
        onClose={() => setNewWeekModalOpen(false)}
        onCreate={handleCreateWeek}
      />

      <div className="mb-4 flex w-full min-w-0 shrink-0 flex-wrap items-center gap-3 px-4 text-white">
        <label className="flex items-center gap-2 text-sm font-medium">
          <span className="text-white/80">Active week</span>
          <select
            className="rounded-lg border border-white/20 bg-neutral-800 px-3 py-2 text-white"
            value={resolvedWeekId ?? ""}
            onChange={(e) => setSelectedWeekId(e.target.value || null)}
          >
            {weeks.length === 0 ? (
              <option value="">No weeks yet</option>
            ) : (
              weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Week of{" "}
                  {new Date(`${w.week_start_date}T12:00:00`).toLocaleDateString(
                    undefined,
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      <Modal
        className={`fixed p-6 z-50 rounded-lg bottom-0 right-0 ${assignModal ? "" : "hidden"}`}
      >
        <button
          type="button"
          className="text-green-950 text-2xl absolute top-0 right-0 m-3 cursor-pointer"
          onClick={() => setAssignModal(false)}
        >
          <FaTimes />
        </button>
        <div className="flex flex-col">
          <div className="flex">
            <FormSelect
              label="Select Driver"
              placeholder="Select a driver…"
              options={sortedDrivers}
              value={driverValue}
              onChange={(e) => setDriverValue(e.target.value)}
            />
            <FormSelect
              label="Select Unit"
              placeholder="Select a unit…"
              options={sortedUnits}
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
            />
          </div>
          <ButtonDark
            text="Assign Unit"
            type="button"
            onClick={createAssigned}
          />
        </div>
      </Modal>
      <div
        className={`w-96 bg-white overflow-y-scroll max-h-screen z-50 fixed top-0 right-0 mx-0 p-3 border-2 flex flex-wrap ${unitsShowing ? "" : "hidden"} justify-center`}
      >
        <button
          type="button"
          className="text-green-950 absolute top-0 right-0 m-3 text-2xl cursor-pointer"
          onClick={() => setUnitsShowing(false)}
        >
          <FaTimes />
        </button>
        <div className="mt-8 flex w-80 items-center gap-2">
          <button
            type="button"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-950 text-xl text-white shadow-md hover:bg-green-900"
            onClick={() => setNewUnitModalOpen(true)}
            aria-label="Add unit"
            title="Add unit"
          >
            <FaPlus />
          </button>
          <input
            type="search"
            value={searchUnits}
            placeholder="Search Units..."
            onChange={(e) => setSearchUnits(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-gray-700 p-4 text-white"
          />
        </div>
        {searchedUnits.map((u) => {
          return (
            <UnitCard
              key={u.id}
              unit={u}
              onEdit={(unitRow) => setEditUnit(unitRow)}
            />
          );
        })}
      </div>
      <div
        className={`w-130 bg-white overflow-y-scroll max-h-screen fixed top-0 right-0 z-50 flex flex-wrap ${assignedMenu ? "" : "hidden"} justify-center`}
      >
        <button
          type="button"
          className="text-green-950 absolute top-0 right-0 m-3 text-2xl cursor-pointer"
          onClick={() => setAssignedMenu(false)}
        >
          <FaTimes />
        </button>
        <AssignedMenu assigned={assigned} />
      </div>
      <div
        className={`w-130 bg-white overflow-y-scroll max-h-screen fixed top-0 right-0 mx-0 p-3 z-50 border-2 flex flex-wrap ${driversShowing ? "" : "hidden"} justify-center`}
      >
        <button
          type="button"
          className="text-green-950 absolute top-0 right-0 m-3 text-2xl cursor-pointer"
          onClick={() => setDriversShowing(false)}
        >
          <FaTimes />
        </button>
        <div className="mt-8 flex w-80 items-center gap-2">
          <button
            type="button"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-950 text-xl text-white shadow-md hover:bg-green-900"
            onClick={() => setNewDriverModalOpen(true)}
            aria-label="Add driver"
            title="Add driver"
          >
            <FaPlus />
          </button>
          <input
            type="search"
            value={searchDrivers}
            placeholder="Search Drivers..."
            onChange={(e) => setSearchDrivers(e.target.value)}
            className="min-w-0 flex-1 rounded-lg bg-gray-700 p-4 text-white z-10"
          />
        </div>
        {searchedDrivers.map((d) => (
          <DriverCard
            key={d.id}
            driver={d}
            onEdit={(drv) => setEditDriver(drv)}
            onDelete={() => handleDeleteDriver(d.id)}
          />
        ))}
      </div>
      <div className="fixed z-10 bottom-0 left-1/2 transform -translate-x-1/2 flex w-full justify-center">
        <BtnWhite text="Loadsheets" Icon={FaList} onClick={toggleLoadsheets} />
        <BtnWhite text="Units" Icon={FaTruck} onClick={toggleUnitMenu} />
        <BtnWhite text="Drivers" Icon={FaUser} onClick={toggleDriverMenu} />
        <BtnWhite
          Icon={FaPlus}
          text="Assign Unit"
          onClick={() => setAssignModal(!assignModal)}
        />
        <BtnWhite
          Icon={FaCalendar}
          text="New week"
          onClick={() => {
            setNewWeekModalKey((k) => k + 1);
            setNewWeekModalOpen(true);
          }}
        />
        <BtnWhite
          Icon={FaPlus}
          text="New load sheet"
          onClick={() => setNewLoadsheetModalOpen(true)}
        />
        <BtnWhite
          Icon={FaTruck}
          text="Assigned Units"
          onClick={toggleAssignedMenu}
        />
      </div>
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-28">
          <div className="flex flex-row flex-1 fixed top-30 right-10 min-h-0 max-h-12">
            <input
              type="search"
              value={searchAssigned}
              placeholder="Search By Division"
              onChange={(e) => setSearchAssigned(e.target.value)}
              className="mb-4 w-full max-w-md rounded-xl py-6 bg-white p-2 text-green-950 placeholder:text-green-950"
            />
            <input
              type="search"
              value={searchByName}
              placeholder="Search By Name"
              onChange={(e) => setSearchByName(e.target.value)}
              className="bg-white rounded-xl max-w-md placeholder:text-green-950 p-2 ml-2 text-green-950"
            />
          </div>
          {scheduleRowsForDisplay.map((row) => (
            <ScheduleRow
              key={row.scheduleAssignmentId ?? row.id}
              assignment={row}
              weekStartISO={selectedWeek?.week_start_date ?? null}
              weekId={resolvedWeekId}
              loads={loads.filter((l) => loadBelongsToAssignment(l, row))}
              allWeekLoads={loads}
              assignableUnits={assignableUnits}
              loadSlots={loadSlots}
              loadSheets={loadSheets}
              onDelete={vacateHandlerForRow(row)}
              onLoadsUpdated={refreshLoads}
              onLoadPatched={mergeScheduleLoad}
              onLoadSheetsUpdated={refreshLoadSheets}
            />
          ))}
        </div>
      </main>

      <NewLoadsheetModal
        open={newLoadsheetModalOpen}
        onClose={() => setNewLoadsheetModalOpen(false)}
        onCreated={refreshLoadSheets}
      />
      <EditLoadsheetModal
        open={editLoadsheetId != null}
        initialLoadsheetId={editLoadsheetId}
        loadSheets={loadSheets}
        onClose={() => setEditLoadsheetId(null)}
        onSaved={refreshLoadSheets}
      />
      <EditDriverModal
        open={editDriver != null}
        driver={editDriver}
        onClose={() => setEditDriver(null)}
        onSaved={async () => {
          await refreshDrivers();
          await refreshAssigned();
        }}
      />
      <EditUnitModal
        open={editUnit != null}
        unit={editUnit}
        onClose={() => setEditUnit(null)}
        onSaved={async () => {
          await refreshUnits();
          await refreshAssigned();
        }}
      />
      <NewDriverModal
        open={newDriverModalOpen}
        onClose={() => setNewDriverModalOpen(false)}
        onCreated={refreshDrivers}
      />
      <NewUnitModal
        open={newUnitModalOpen}
        onClose={() => setNewUnitModalOpen(false)}
        onCreated={refreshUnits}
      />
      <div
        className={`w-96 bg-white overflow-y-scroll max-h-full z-50 fixed top-0 right-0 mx-0 p-3 border-2 flex flex-wrap ${loadsheetMenu ? "" : "hidden"} justify-center`}
      >
        <h2 className="text-green-950 font-bold text-2xl text-center">
          Loadsheets
        </h2>
        <div className="fixed top-0 right-0 m-3 mr-4 text-2xl text-green-950 cursor-pointer ">
          <button
            className="text-green-950 text-3xl"
            onClick={() => setLoadsheetMenu(false)}
          >
            <FaTimes />
          </button>
        </div>
        <LoadsheetMenu
          loadsheets={loadSheets}
          onEdit={handleEditLoadsheet}
          onDelete={handleDeleteLoadsheet}
          onCopy={handleCopyLoadsheet}
        />
      </div>
    </div>
  );
}
