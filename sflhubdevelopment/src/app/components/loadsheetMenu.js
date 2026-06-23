"use client";
import { FaCopy, FaEdit, FaTimes } from "react-icons/fa";
import BtnRed from "./btnRed";
import ButtonDark from "./buttonDark";
import BtnWhiteRounded from "./btnWhiteRound";

export default function LoadsheetMenu({
  loadsheets,
  readOnly = false,
  onEdit,
  onDelete,
  onCopy,
}) {
  const showActions =
    !readOnly &&
    (typeof onEdit === "function" ||
      typeof onDelete === "function" ||
      typeof onCopy === "function");

  return (
    <div className="mt-10 w-full">
      {loadsheets.map((loadsheet) => (
        <div
          key={loadsheet.id}
          className="flex bg-gray-900 rounded-lg w-full p-1 py-auto mb-2 h-20"
        >
          <div className="bg-gray-900 border flex justify-center h-full items-center rounded-l-lg p-2 my-auto w-40">
            <p className="text-white">{loadsheet.load_number}</p>
          </div>
          {showActions ? (
            <div className="bg-gray-900 border rounded-r-lg p-2 w-full flex my-auto h-full justify-center items-center gap-2">
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
            <div className="bg-gray-900 border rounded-r-lg p-2 w-full flex my-auto h-full items-center justify-center">
              <p className="text-xs text-white/70">View only</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
