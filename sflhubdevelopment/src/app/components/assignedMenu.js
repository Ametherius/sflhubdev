import { useState } from "react";
import AssignedCard from "./assignedCard";

export default function AssignedMenu({ assigned }) {
  const sortAssigned = [...assigned].sort((a, b) => {
    const unitA = a.unit?.unit;
    const unitB = b.unit?.unit;
    const numA = Number(unitA);
    const numB = Number(unitB);

    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return numA - numB;
    }
    return 0;
  });
  const [value, setValue] = useState("");
  const assignedUnits = sortAssigned.filter((u) => {
    return u.driver?.name?.toLowerCase().includes(value.toLowerCase());
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <div className="shrink-0 bg-white px-3 pb-3 pt-12">
        <h2 className="mb-4 text-center text-3xl font-bold text-green-950">
          Assigned Units
        </h2>
        <div className="flex justify-center">
          <input
            type="search"
            value={value}
            className="mb-1 w-full max-w-sm border-2 border-green-950 p-3 text-green-950"
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search Assigned Units (By Name)"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto border-t-2 border-green-950 bg-white px-3 pb-6 pt-3">
        {assignedUnits.map((a) => {
          const driver = a.driver;
          const unit = a.unit;
          if (!driver || !unit) return null;
          return (
            <div
              key={a.id}
              className="mb-4 overflow-hidden rounded-lg border-2 border-green-950 last:mb-0"
            >
              <AssignedCard
                listItem
                name={driver.name}
                phone={driver.phone}
                pin={driver.pin}
                user={driver.user}
                pass={driver.pass}
                division={driver.division}
                unit={unit.unit}
                petro={unit.petro}
                petroPIN={unit.petroPIN}
                ufa={unit.ufa}
                ufaPIN={unit.ufaPIN}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
