"use client";

import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import UnitCard from "./unitCard";

export default function UnitsPanel({
  units,
  onClose,
  onEdit,
  onDelete,
  canEdit,
}) {
  const [searchUnits, setSearchUnits] = useState("");
  const searchResults = units.filter((u) => {
    return String(u.unit)
      .toLowerCase()
      .includes(String(searchUnits).toLowerCase());
  });
  return (
    <div className="w-98 h-screen bg-white flex flex-col overflow-hidden fixed top-0 right-0 z-50 p-3">
      <div className="absolute top-0 left-0 p-2">
        <button
          type="button"
          onClick={onClose}
          className="text-2xl font-bold text-green-950 cursor-pointer"
        >
          <FaTimes />
        </button>
      </div>
      <div className="text-center text-green-950 text-2xl font-bold my-2">
        <h2>Units List</h2>
      </div>
      <div className="flex justify-center">
        <input
          type="search"
          className="rounded-md border-2 border-green-950 p-2 text-green-950 w-full mx-5"
          placeholder="Search Units..."
          value={searchUnits}
          onChange={(e) => setSearchUnits(e.target.value)}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-scroll">
        {searchResults.map((u) => (
          <UnitCard
            key={u.id}
            unit={u}
            onEdit={canEdit ? onEdit : undefined}
            onDelete={canEdit ? () => onDelete(u.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
