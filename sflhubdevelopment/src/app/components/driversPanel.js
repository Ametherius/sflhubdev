import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import DriverCard from "./driverCard";

export default function DriversPanel({
  canEdit,
  onClose,
  onEdit,
  onDelete,
  drivers,
}) {
  const [searchDrivers, setSearchDrivers] = useState("");

  const searchedResults = drivers.filter((d) => {
    return d.name.toLowerCase().includes(searchDrivers.toLowerCase());
  });
  return (
    <div className="w-98 bg-white flex flex-col overflow-hidden h-screen z-50 fixed top-0 right-0 mx-0 p-3">
      <div className="absolute left-0 top-0 text-green-950 text-2xl p-2">
        <button type="button" onClick={onClose} className="cursor-pointer">
          <FaTimes />
        </button>
      </div>
      <div className="flex justify-center">
        <h2 className="text-center text-green-950 text-2xl font-bold">
          Drivers List
        </h2>
      </div>
      <div className="flex justify-center my-2">
        <input
          type="search"
          value={searchDrivers}
          placeholder="Search Drivers..."
          onChange={(e) => setSearchDrivers(e.target.value)}
          className="border-2 border-green-950 text-green-950 p-2 rounded-md w-full"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {searchedResults.map((d) => (
          <DriverCard
            driver={d}
            key={d.id}
            onEdit={canEdit ? onEdit : undefined}
            onDelete={canEdit ? () => onDelete(d.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
