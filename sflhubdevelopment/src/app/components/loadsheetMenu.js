"use client";
import { FaCopy, FaEdit, FaTimes } from "react-icons/fa";
import BtnRed from "./btnRed";
import ButtonDark from "./buttonDark";
import BtnWhiteRounded from "./btnWhiteRound";
import { useState } from "react";

export default function LoadsheetMenu({
  loadsheets,
  readOnly = false,
  onEdit,
  onDelete,
  onCopy,
}) {
  const [query, setQuery] = useState("");
  const searchLoadsheets = loadsheets.filter((l) => {
    return String(l.broker).toLowerCase().includes(String(query.toLowerCase()));
  });

  const showActions =
    !readOnly &&
    (typeof onEdit === "function" ||
      typeof onDelete === "function" ||
      typeof onCopy === "function");

  return (
    <div className="mt-10 w-full flex flex-col">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border-2 border-green-950 p-2 text-green-950 rounded-md mb-3"
        placeholder="Search Loadsheets..."
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
