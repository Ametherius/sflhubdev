"use client";
import { FaCopy, FaEdit, FaTimes } from "react-icons/fa";
import BtnRed from "./btnRed";
import ButtonDark from "./buttonDark";
import BtnWhiteRounded from "./btnWhiteRound";

export default function LoadsheetMenu({
  loadsheets,
  onEdit,
  onDelete,
  onCopy,
}) {
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
          <div className="bg-gray-900 border rounded-r-lg p-2 w-full flex my-auto h-full justify-center items-center gap-2">
            <BtnRed
              text={<FaTimes />}
              type="button"
              onClick={() => onDelete?.(loadsheet)}
            />
            <ButtonDark
              text={<FaEdit />}
              type="button"
              onClick={() => onEdit?.(loadsheet)}
            />
            <BtnWhiteRounded
              text={<FaCopy />}
              type="button"
              onClick={() => onCopy?.(loadsheet)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
