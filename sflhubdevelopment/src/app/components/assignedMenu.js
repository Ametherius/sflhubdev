import { useState } from "react";

export default function AssignedMenu({ assigned }) {
  const sortAssigned = [...assigned].sort((a, b) => {
    const unitA = a.unit?.unit;
    const unitB = b.unit?.unit;
    const numA = Number(unitA);
    const numB = Number(unitB);

    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return numA - numB;
    }
  });
  const [value, setValue] = useState("");
  const assignedUnits = sortAssigned.filter((u) => {
    return u.driver.name.toLowerCase().includes(value.toLowerCase());
  });
  return (
    <div className="flex flex-col mt-10">
      <h2 className="text-green-950 text-center font-bold text-3xl mb-4">
        Assigned Units
      </h2>{" "}
      <div className="flex justify-center">
        <input
          type="search"
          value={value}
          className="border-2 border-green-950 p-3 text-green-950 w-80 mb-3"
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search Assigned Units (By Name)"
        />
      </div>
      {assignedUnits.map((a) => (
        <div key={a.id} className="bg-gray-900 p-1 m-2 grid grid-cols-3">
          <p className="p-2 text-center border">{a.driver.name}</p>
          <p className="p-2 text-center border">{a.unit.unit}</p>
          <p className="p-2 text-center border">{a.driver.phone}</p>
        </div>
      ))}
    </div>
  );
}
