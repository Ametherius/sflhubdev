"use client";

import { useMemo, useState } from "react";
import Header from "../components/header";
import { useUnits } from "@/hooks/useUnits";
import BtnRed from "../components/btnRed";
import BtnWhite from "../components/btnWhite";
import { FaPlus, FaTimes, FaTruck } from "react-icons/fa";
import { FaUser } from "react-icons/fa";
import { useDrivers } from "@/hooks/useDrivers";
import { FaEdit } from "react-icons/fa";
import DriverCard from "../components/driverCard";
import UnitCard from "../components/unitCard";
import AssignedCard from "../components/assignedCard";
import Modal from "../components/modal";
import FormSelect from "../components/formSelect";
import ButtonDark from "../components/buttonDark";
import { useAssigned } from "@/hooks/useAssigned";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export default function Schedule() {
  const [drivers] = useDrivers();
  const [units] = useUnits();
  const [activeUser] = useUser();
  const [assigned, refreshAssigned] = useAssigned();
  const [unitsShowing, setUnitsShowing] = useState(false);
  const [driversShowing, setDriversShowing] = useState(false);
  const [searchDrivers, setSearchDrivers] = useState("");
  const [searchUnits, setSearchUnits] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");
  const [assignModal, setAssignModal] = useState(false);
  const [driverValue, setDriverValue] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const supabase = createClient();

  const assignedUnits = useMemo(() => {
    return assigned
      .filter((row) => row.driver && row.unit)
      .map((row) => ({
        assignedID: row.id,
        name: row.driver.name,
        pin: row.driver.pin,
        user: row.driver.user,
        pass: row.driver.pass,
        division: row.driver.division,
        phone: row.driver.phone,
        unit: row.unit.unit,
        petro: row.unit.petro,
        petroPIN: row.unit.petroPIN,
        ufa: row.unit.ufa,
        ufaPIN: row.unit.ufaPIN,
      }));
  }, [assigned]);

  async function handleDelete(id) {
    const { error } = await supabase.from("in_use_units").delete().eq("id", id);

    if (error) {
      console.error(error.message);
    }
    await refreshAssigned();
  }

  const searchedDrivers = drivers.filter((d) => {
    return d.name.toLowerCase().includes(searchDrivers.toLowerCase());
  });

  const searchedUnits = units.filter((u) => {
    return String(u.unit).toLowerCase().includes(searchUnits.toLowerCase());
  });

  const searchedAssigned = assignedUnits.filter((a) => {
    return a.division.includes(searchAssigned);
  });

  function toggleUnitMenu() {
    if (driversShowing) setDriversShowing(false);
    setUnitsShowing(!unitsShowing);
  }

  function toggleDriverMenu() {
    if (unitsShowing) setUnitsShowing(false);
    setDriversShowing(!driversShowing);
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
    <div className="w-full relative">
      <Header />
      <div className={`my-10 text-white text-center text-3xl font-bold`}>
        <h2>Weekly Schedule</h2>
      </div>
      <Modal
        className={`fixed p-6 rounded-lg bottom-0 right-0 ${assignModal ? "" : "hidden"}`}
      >
        <button
          type="button"
          className="text-green-950 text-2xl absolute top-0 right-0 m-3 cursor-pointer"
          onClick={() => setAssignModal(false)}
        >
          <FaTimes />
        </button>
        <form className="flex flex-col">
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
        </form>
      </Modal>
      <div
        className={`w-96 bg-white overflow-y-scroll max-h-screen absolute top-0 right-0 mx-0 p-3 border-2 flex flex-wrap ${unitsShowing ? "" : "hidden"} justify-center`}
      >
        <button
          type="button"
          className="text-green-950 absolute top-0 right-0 m-3 text-2xl cursor-pointer"
          onClick={() => setUnitsShowing(false)}
        >
          <FaTimes />
        </button>
        <div>
          <input
            type="search"
            value={searchUnits}
            placeholder="Search Units..."
            onChange={(e) => setSearchUnits(e.target.value)}
            className="bg-gray-700 p-4 w-80 mt-8 text-white rounded-lg"
          />
        </div>
        {searchedUnits.map((u) => {
          return (
            <UnitCard
              key={u.id}
              unit={u.unit}
              petro={u.petro}
              petroPin={u.petroPIN}
              ufa={u.ufa}
              ufaPin={u.ufaPIN}
            />
          );
        })}
      </div>
      <div
        className={`w-130 bg-white overflow-y-scroll max-h-screen absolute top-0 right-0 mx-0 p-3 border-2 flex flex-wrap ${driversShowing ? "" : "hidden"} justify-center`}
      >
        <button
          type="button"
          className="text-green-950 absolute top-0 right-0 m-3 text-2xl cursor-pointer"
          onClick={() => setDriversShowing(false)}
        >
          <FaTimes />
        </button>
        <div>
          <input
            type="search"
            value={searchDrivers}
            placeholder="Search Drivers..."
            onChange={(e) => setSearchDrivers(e.target.value)}
            className="bg-gray-700 p-4 w-80 mt-8 text-white rounded-lg"
          />
        </div>
        {searchedDrivers.map((d) => (
          <DriverCard
            key={d.id}
            name={d.name}
            phone={d.phone}
            user={d.user}
            pass={d.pass}
            pin={d.pin}
            division={d.division}
            Icon={FaEdit}
          />
        ))}
      </div>
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 flex">
        <BtnWhite text="Units" Icon={FaTruck} onClick={toggleUnitMenu} />
        <BtnWhite text="Drivers" Icon={FaUser} onClick={toggleDriverMenu} />
        <BtnWhite
          Icon={FaPlus}
          text="Assign Unit"
          onClick={() => setAssignModal(!assignModal)}
        />
      </div>
      <div className="w-screen mx-6 overflow-y-scroll">
        <input
          type="search"
          value={searchAssigned}
          placeholder="Search By Division"
          onChange={(e) => setSearchAssigned(e.target.value)}
          className="bg-white placeholder:text-green-950 p-2 rounded-xl ml-16 mb-4 text-green-950"
        />
        {searchedAssigned.map((a) => (
          <AssignedCard
            key={a.assignedID}
            name={a.name}
            phone={a.phone}
            pin={a.pin}
            user={a.user}
            pass={a.pass}
            division={a.division}
            unit={a.unit}
            petro={a.petro}
            petroPIN={a.petroPIN}
            ufa={a.ufa}
            ufaPIN={a.ufaPIN}
            onDelete={() => handleDelete(a.assignedID)}
          />
        ))}
      </div>
    </div>
  );
}
