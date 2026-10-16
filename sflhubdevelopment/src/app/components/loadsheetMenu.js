"use client";
import { FaCopy, FaEdit, FaTimes } from "react-icons/fa";
import BtnRed from "./btnRed";
import ButtonDark from "./buttonDark";
import BtnWhiteRounded from "./btnWhiteRound";
import { useEffect, useState } from "react";
import { parseISODateLocal } from "@/lib/weekDates";

const ALL_WEEKS = "";

export default function LoadsheetMenu({
  loadsheets,
  readOnly = false,
  onEdit,
  onDelete,
  onCopy,
  weeks = [],
  weekStart = null,
}) {
  const [query, setQuery] = useState("");
  const [endUserQuery, setEndUserQuery] = useState("");
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    String(weekStart ?? "").slice(0, 10),
  );

  useEffect(() => {
    const next = String(weekStart ?? "").slice(0, 10);
    setSelectedWeekStart((prev) => (prev === ALL_WEEKS ? prev : next));
  }, [weekStart]);

  const searchLoadsheets = loadsheets.filter((l) => {
    const originMatch = String(l.origin ?? "")
      .toLowerCase()
      .includes(query.toLowerCase());
    const endUserMatch = String(l.end_user ?? "")
      .toLowerCase()
      .includes(endUserQuery.toLowerCase());
    const sheetWeek = String(l.week_start ?? "").slice(0, 10);
    const weekMatch =
      !selectedWeekStart || sheetWeek === selectedWeekStart;
    return originMatch && endUserMatch && weekMatch;
  });

  const showActions =
    !readOnly &&
    (typeof onEdit === "function" ||
      typeof onDelete === "function" ||
      typeof onCopy === "function");

  return (
    <div className="mt-10 w-full flex flex-col">
      <select
        value={selectedWeekStart}
        onChange={(e) => setSelectedWeekStart(e.target.value)}
        className="border-2 border-green-950 p-2 text-green-950 rounded-md mb-3"
      >
        <option value={ALL_WEEKS}>All loadsheets</option>
        {weeks.map((w) => {
          const value = String(w.week_start_date).slice(0, 10);
          return (
            <option key={w.id} value={value}>
              Week of{" "}
              {parseISODateLocal(w.week_start_date).toLocaleDateString(
                undefined,
                {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                },
              )}
            </option>
          );
        })}
      </select>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border-2 border-green-950 p-2 text-green-950 rounded-md mb-3"
        placeholder="Search Origin..."
      />
      <input
        type="search"
        placeholder="Search End User..."
        value={endUserQuery}
        onChange={(e) => setEndUserQuery(e.target.value)}
        className="border-2 border-green-950 p-2 text-green-950 rounded-md mb-3"
      />
      {searchLoadsheets.map((loadsheet) => (
        <div
          key={loadsheet.id}
          className="flex flex-col bg-gray-900 rounded-lg w-full p-1 py-auto mb-2"
        >
          <div className="bg-gray-900 border rounded-t-md flex justify-center h-full w-full items-center  p-2 my-auto">
            <p className="text-white">{loadsheet.broker}</p>
          </div>
          <div className="flex flex-1 w-full">
            <div className="flex flex-col border border-t-0 p-2 w-1/2">
              <span className="text-center underline">Origin</span>
              <span className="text-center">{loadsheet.origin}</span>
            </div>
            <div className="flex flex-col border border-t-0 border-l-0 p-2 w-1/2">
              <span className="text-center underline">End User</span>
              <span className="text-center">{loadsheet.end_user}</span>
            </div>
          </div>
          <div>
            {showActions ? (
              <div className="bg-gray-900 p-2 border border-t-0 rounded-b-md w-full flex my-auto h-full justify-center items-center gap-2">
                {typeof onDelete === "function" ? (
                  <BtnRed
                    text={<FaTimes />}
                    type="button"
                    onClick={() => onDelete?.(loadsheet)}
                  />
                ) : null}
                {typeof onEdit === "function" ? (
                  <ButtonDark
                    text={<FaEdit />}
                    type="button"
                    onClick={() => onEdit?.(loadsheet)}
                  />
                ) : null}
                {typeof onCopy === "function" ? (
                  <BtnWhiteRounded
                    text={<FaCopy />}
                    type="button"
                    onClick={() => onCopy?.(loadsheet)}
                  />
                ) : null}
              </div>
            ) : (
              <div className="bg-gray-900  p-2 w-full flex my-auto h-full items-center justify-center">
                <p className="text-xs text-white/70">View only</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
