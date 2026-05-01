"use client";

import { useEffect, useState } from "react";
import Header from "../components/header";
import { useUnits } from "@/hooks/useUnits";
import BtnRed from "../components/btnRed";
import BtnWhite from "../components/btnWhite";
import { FaPlus, FaTruck } from "react-icons/fa";
import { FaUser } from "react-icons/fa";
import { useDrivers } from "@/hooks/useDrivers";
import { FaEdit } from "react-icons/fa";
import DriverCard from "../components/driverCard";
import UnitCard from "../components/unitCard";
import Modal from "../components/modal";
import FormSelect from "../components/formSelect";

export default function Schedule() {
  const [drivers] = useDrivers();
  const [units] = useUnits();
  const [unitsShowing, setUnitsShowing] = useState(false);
  const [driversShowing, setDriversShowing] = useState(false);
  const [searchResults, setSearchResults] = useState("");
  const [value, setValue] = useState("");

  const searchedDrivers = drivers.filter((d) => {
    return d.name.toLowerCase().includes(searchResults.toLowerCase());
  });

  const searchedUnits = units.filter((u) => {
    return String(u.unit).toLowerCase().includes(searchResults.toLowerCase());
  });
  console.log(drivers);

  function toggleUnitMenu() {
    if (driversShowing) setDriversShowing(false);
    setUnitsShowing(!unitsShowing);
  }

  function toggleDriverMenu() {
    if (unitsShowing) setUnitsShowing(false);
    setDriversShowing(!driversShowing);
  }

  return (
    <div className="w-full relative">
      <Header />
      <div className={`my-10 text-white text-center text-3xl font-bold`}>
        <h2>Weekly Schedule</h2>
      </div>
      <Modal>
        <form className="flex">
          <FormSelect />
          <FormSelect />
        </form>
      </Modal>
      <div
        className={`w-96 bg-white overflow-y-scroll max-h-screen absolute top-0 right-0 mx-0 p-3 border-2 flex flex-wrap ${unitsShowing ? "" : "hidden"} justify-center`}
      >
        <div>
          <input
            type="search"
            value={searchResults}
            placeholder="Search Units..."
            onChange={(e) => setSearchResults(e.target.value)}
            className="bg-gray-700 p-4 w-80 text-white rounded-lg"
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
        <div>
          <input
            type="search"
            value={searchResults}
            placeholder="Search Drivers..."
            onChange={(e) => setSearchResults(e.target.value)}
            className="bg-gray-700 p-4 w-80 text-white rounded-lg"
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
        <BtnWhite Icon={FaPlus} text="Assign Unit" />
      </div>
    </div>
  );
}
