"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../components/header";
import { useUnits } from "@/hooks/useUnits";
import BtnWhite from "../components/btnWhite";
import { FaCalendar, FaPlus, FaTimes, FaTruck, FaUser } from "react-icons/fa";
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
import { compareAssignedRows } from "@/lib/divisionSort";
import { useWeekLoads } from "@/hooks/useWeekLoads";
import { useLoadSlots } from "@/hooks/useLoadSlots";
import { useLoadSheets } from "@/hooks/useLoadSheets";
import ScheduleRow from "../components/scheduleRow";
import { isScheduleWeekFkError } from "@/lib/scheduleLoadsPersist";
import AssignedMenu from "../components/assignedMenu";

export default function Schedule() {
  const [drivers, refreshDrivers] = useDrivers();
  const [units, refreshUnits] = useUnits();
  const [activeUser] = useUser();
  const [assigned, refreshAssigned] = useAssigned();
  const [weeks, refreshWeeks, createWeek] = useScheduleWeeks();
  const [selectedWeekId, setSelectedWeekId] = useState(null);
  const [newWeekModalKey, setNewWeekModalKey] = useState(0);
  const resolvedWeekId = useMemo(() => {
    if (weeks.length === 0) return null;
    if (selectedWeekId && weeks.some((w) => w.id === selectedWeekId)) {
      return selectedWeekId;
    }
    return weeks[0].id;
  }, [weeks, selectedWeekId]);
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

  const assignedRowsForDisplay = useMemo(() => {
    let rows = assigned.filter((row) => row.driver && row.unit);
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
    return rows.sort(compareAssignedRows);
  }, [assigned, searchAssigned, searchByName]);

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.id === resolvedWeekId) ?? null,
    [weeks, resolvedWeekId],
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
  }, [resolvedWeekId, assignmentIdsKey, supabase, refreshLoads]);

  async function handleDelete(id) {
    const { error } = await supabase.from("in_use_units").delete().eq("id", id);

    if (error) {
      console.error(error.message);
    }
    await refreshAssigned();
  }

  async function handleDeleteDriver(id) {
    if (!confirm("Delete this driver from the database?")) return;
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    await refreshDrivers();
    await refreshAssigned();
  }

  const searchedDrivers = drivers.filter((d) => {
    return d.name.toLowerCase().includes(searchDrivers.toLowerCase());
  });

  const searchedUnits = units.filter((u) => {
    return String(u.unit).toLowerCase().includes(searchUnits.toLowerCase());
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
              options={drivers}
              value={driverValue}
              onChange={(e) => setDriverValue(e.target.value)}
            />
            <FormSelect
              label="Select Unit"
              placeholder="Select a unit…"
              options={units}
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
          {/* <input
            type="search"
            value={searchAssigned}
            placeholder="Search By Division"
            onChange={(e) => setSearchAssigned(e.target.value)}
            className="mb-4 w-full max-w-md rounded-xl bg-white p-2 text-green-950 placeholder:text-green-950"
          />
          <input
            type="search"
            value={searchByName}
            placeholder="Search By Name"
            onChange={(e) => setSearchByName(e.target.value)}
            className="bg-white rounded-xl max-w-md placeholder:text-green-950 p-2 ml-2 text-green-950"
          /> */}
          {assignedRowsForDisplay.map((row) => (
            <ScheduleRow
              key={row.id}
              assignment={row}
              weekStartISO={selectedWeek?.week_start_date ?? null}
              weekId={resolvedWeekId}
              loads={loads.filter(
                (l) => String(l.in_use_unit_id) === String(row.id),
              )}
              loadSlots={loadSlots}
              loadSheets={loadSheets}
              onDelete={() => handleDelete(row.id)}
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
    </div>
  );
}
