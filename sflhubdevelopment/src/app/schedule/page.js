"use client";

import { useEffect, useState } from "react";
import Header from "../components/header";
import { useUnits } from "@/hooks/useUnits";
import ButtonDark from "../components/buttonDark";
import BtnRed from "../components/btnRed";
import BtnWhite from "../components/btnWhite";
import { FaTruck } from "react-icons/fa";
import { FaUser } from "react-icons/fa";
import { useDrivers } from "@/hooks/useDrivers";

function DriverCard({ name, phone, user, pass, pin, division }) {
  return (
    <div className="p-3 border-2 m-3 shadow-lg rounded lg w-80 bg-gray-500">
      <div className="mb-3 bg-gray-900 border-2 p-2">
        <h3 className="text-center text-white font-bold p-3">{name}</h3>
      </div>
      <div className="grid grid-cols-2 border">
        <div className="p-3 border">
          <p className="text-center">{phone}</p>
        </div>
        <div className="p-3 border">
          <p className="text-center">{division}</p>
        </div>
      </div>
    </div>
  );
}

const UnitCard = function ({ unit, petro, petroPin, ufa, ufaPin }) {
  return (
    <div className="p-3 border-2 m-3 shadow-lg rounded-lg w-80 bg-gray-500">
      <div className="mb-3 bg-gray-900 border-2 p-2">
        <h3 className="text-white text-center font-bold p-3">Unit: {unit}</h3>
      </div>
      <div className="grid grid-cols-2 border bg-gray-900">
        <div className="p-3 border">
          <span>Petro: {petro}</span>
        </div>
        <div className="p-3 border">
          <p>Petro Pin: {petroPin}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 border bg-gray-900">
        <div className="p-3 border">
          <p>UFA: {ufa}</p>
        </div>
        <div className="p-3 border">
          <p>UFA Pin: {ufaPin}</p>
        </div>
      </div>
      <div className="flex justify-center">
        <ButtonDark text="Edit Info" />
      </div>
    </div>
  );
};
export default function Schedule() {
  const [drivers] = useDrivers();
  const [units] = useUnits();
  const [unitsShowing, setUnitsShowing] = useState(false);
  const [driversShowing, setDriversShowing] = useState(false);

  function toggleUnitMenu() {
    setUnitsShowing(!unitsShowing);
  }

  function toggleDriverMenu() {
    setDriversShowing(!driversShowing);
  }

  console.log(units);
  return (
    <div className="w-full relative">
      <Header />
      <div className={`my-8 text-white text-center text-3xl font-bold`}>
        <h2>Weekly Schedule</h2>
      </div>
      <div
        className={`w-96 bg-white overflow-y-scroll max-h-screen absolute top-0 right-0 mx-0 p-3 border-2 flex flex-wrap ${unitsShowing ? "" : "hidden"} justify-center`}
      >
        {units.map((u) => {
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
        className={`w-96 bg-white overflow-y-scroll max-h-screen absolute top-0 right-0 mx-0 p-3 border-2 flex flex-wrap ${driversShowing ? "" : "hidden"} justify-center`}
      >
        {drivers.map((d) => (
          <DriverCard
            key={d.id}
            name={d.name}
            phone={d.phone}
            user={d.user}
            pass={d.pass}
            pin={d.pin}
            division={d.division}
          />
        ))}
      </div>
      <div className="fixed bottom-0 left-0 flex">
        <BtnWhite text="Units" Icon={FaTruck} onClick={toggleUnitMenu} />
        <BtnWhite text="Drivers" Icon={FaUser} onClick={toggleDriverMenu} />
        {/* <SquareButton text="Units" type="button" /> */}
      </div>
    </div>
  );
}
