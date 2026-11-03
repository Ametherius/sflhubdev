"use client";

import { FaEye, FaEyeSlash, FaTimes } from "react-icons/fa";
import { FaCircleXmark, FaXmark } from "react-icons/fa6";

export default function BrokerPanel({
  title = "",
  brokers,
  onClose,
  onDelete,
  onHide,
  hiddenBrokerIds,
  canEdit,
  onUnhide,
}) {
  return (
    <div className="h-screen overflow-hidden bg-white w-98 fixed top-0 right-0 z-100 flex flex-col p-2">
      <div className="text-green-950 font-bold text-2xl text-center my-3">
        <h2>{title}</h2>
      </div>
      <div className="absolute top-0 left-0 m-4 text-green-950 text-2xl font-bold">
        <button
          type="button"
          className="cursor-pointer transition-all transform hover:scale-[1.3] hover:text-green-900 hover:shadow-md"
          onClick={onClose}
        >
          <FaTimes />
        </button>
      </div>
      <div className="overflow-y-scroll flex-1 min-h-0">
        {brokers.map((b) => {
          const isHidden = hiddenBrokerIds.has(String(b.id));
          return (
            <div
              className="border-2 border-green-950 rounded-lg bg-white p-3 my-3 shadow-md flex"
              key={b.id}
            >
              <div className="w-2/3 text-green-950 font-bold text-xl">
                <span>{b.name}</span>
              </div>

              {canEdit ? (
                <div className="w-1/3 flex flex-1 gap-3 items-center justify-center text-2xl">
                  <button
                    type="button"
                    onClick={() => void (isHidden ? onUnhide(b) : onHide(b))}
                    className="text-gray-700 transition-all transform hover:scale-[1.3] hover:text-gray-900 hover:shadow-2xl"
                  >
                    {isHidden ? <FaEye /> : <FaEyeSlash />}
                  </button>
                  <button
                    type="button"
                    className="text-red-700 transition-all transform hover:scale-[1.3] hover:text-red-600 hover:shadow-2xl"
                    onClick={() => void onDelete(b)}
                  >
                    <FaTimes />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
