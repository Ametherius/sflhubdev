"use client";

import { useEffect, useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import ButtonDark from "./buttonDark";

export default function NewPlannerSlotModal({
  open,
  onClose,
  brokers = [],
  initialBrokerId = "",
  dayTitle = "",
  bulk = false,
  saving = false,
  onSubmit,
}) {
  const [brokerId, setBrokerId] = useState("");
  const [origin, setOrigin] = useState("");
  const [endUser, setEndUser] = useState("");
  const [slotCount, setSlotCount] = useState(2);

  useEffect(() => {
    if (!open) return;
    setBrokerId(initialBrokerId ? String(initialBrokerId) : "");
    setOrigin("");
    setEndUser("");
    setSlotCount(2);
  }, [open, initialBrokerId]);

  const brokerOptions = useMemo(
    () =>
      [...brokers].sort((a, b) =>
        String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
          sensitivity: "base",
        }),
      ),
    [brokers],
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!brokerId) {
      alert("Select a broker.");
      return;
    }
    const count = bulk ? Math.max(1, Math.min(50, Number(slotCount) || 1)) : 1;
    await onSubmit?.({
      brokerId,
      origin: origin.trim(),
      endUser: endUser.trim(),
      slotCount: count,
    });
  }

  if (!open) return null;

  const inputClass =
    "mt-1 w-full rounded-lg border border-green-950/25 bg-white px-3 py-2 text-sm text-green-950 outline-none focus:border-green-950/50";
  const selectClass =
    "mt-1 w-full rounded-lg border border-green-950/25 bg-white px-3 py-2 text-sm text-green-950 outline-none focus:border-green-950/50";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 text-green-950 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-planner-slot-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 text-2xl text-green-950 hover:opacity-70"
          onClick={onClose}
          aria-label="Close"
        >
          <FaTimes />
        </button>
        <h2 id="new-planner-slot-title" className="mb-1 text-xl font-bold">
          {bulk ? "Add multiple slots" : "New planner slot"}
        </h2>
        {dayTitle ? (
          <p className="mb-4 text-sm text-green-900/80">{dayTitle}</p>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {bulk ? (
            <label className="block text-sm font-medium">
              Number of slots
              <input
                type="number"
                min={1}
                max={50}
                className={inputClass}
                value={slotCount}
                onChange={(e) => setSlotCount(e.target.value)}
                required
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            Broker
            <select
              className={selectClass}
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
              required
            >
              <option value="">Select broker…</option>
              {brokerOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Origin
            <input
              className={inputClass}
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="Origin"
            />
          </label>
          <label className="block text-sm font-medium">
            End user
            <input
              className={inputClass}
              value={endUser}
              onChange={(e) => setEndUser(e.target.value)}
              placeholder="End user"
            />
          </label>
          <div className="mt-2 flex justify-end gap-2 border-t border-green-950/15 pt-4">
            <button
              type="button"
              className="rounded-full px-4 py-2 text-sm font-semibold text-green-950 hover:bg-green-950/10"
              onClick={onClose}
            >
              Cancel
            </button>
            <ButtonDark
              type="submit"
              text={
                saving
                  ? "Saving…"
                  : bulk
                    ? "Add slots"
                    : "Add slot"
              }
            />
          </div>
        </form>
      </div>
    </div>
  );
}
