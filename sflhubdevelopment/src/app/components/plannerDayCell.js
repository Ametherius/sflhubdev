import {
  plannerSlotStatusClass,
  readSlotRejected,
} from "@/lib/plannerSlots";

export const plannerCellWidthClass = "w-[25rem] min-w-[25rem]";
export const plannerUnitColumnClass = "w-14 min-w-14";

export const plannerCellShellClass =
  "box-border flex h-8 w-full items-stretch rounded-md border border-green-950/25 text-sm shadow-sm";

export const plannerDayColumnClass = `flex shrink-0 flex-col ${plannerCellWidthClass}`;

export function PlannerAddMultipleSlotCell({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${plannerCellShellClass} !items-center justify-center gap-0.5 border-dashed bg-green-950/5 text-green-950 transition hover:bg-green-950/10 disabled:cursor-not-allowed disabled:opacity-50`}
      aria-label="Add multiple planner slots"
    >
      <span className="text-sm font-bold leading-none">+</span>
      <span className="text-[9px] font-semibold uppercase leading-tight tracking-wide">
        Add Slots
      </span>
    </button>
  );
}

export function PlannerAddSlotCell({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${plannerCellShellClass} !items-center justify-center gap-1 border-dashed bg-green-950/5 text-green-950 transition hover:bg-green-950/10 disabled:cursor-not-allowed disabled:opacity-50`}
      aria-label="Add planner slot"
    >
      <span className="text-base font-bold leading-none">+</span>
      <span className="text-[10px] font-semibold uppercase tracking-wide">
        New slot
      </span>
    </button>
  );
}

export default function PlannerDayCell({
  slot,
  slotCols,
  canEdit = false,
  onSelect,
  onDelete,
  deleting = false,
}) {
  const origin = slotCols?.origin ? slot[slotCols.origin] : slot.origin;
  const endUser = slotCols?.endUser ? slot[slotCols.endUser] : slot.end_user;
  const unitNumber = slotCols?.unitNumber
    ? slot[slotCols.unitNumber]
    : slot.unit_number;
  const rejected = readSlotRejected(slot, slotCols);
  const statusClass = plannerSlotStatusClass(slot, slotCols);
  const onDarkBg = /text-white/.test(statusClass);
  const subTextClass = onDarkBg ? "text-white/80" : "text-green-900/75";
  const unitLabel = unitNumber ? String(unitNumber).trim() : "";
  const unitBorderClass = onDarkBg ? "border-white/25" : "border-green-950/15";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(slot)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(slot);
        }
      }}
      className={`${plannerCellShellClass} ${statusClass} relative min-w-0 cursor-pointer transition hover:brightness-95`}
    >
      {canEdit && onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(slot);
          }}
          disabled={deleting}
          className="absolute left-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded text-sm leading-none text-inherit/60 transition hover:bg-black/10 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Delete slot"
        >
          ×
        </button>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden bg-inherit px-2 pl-7">
        <span className="min-w-0 truncate text-center font-medium">
          {origin || "—"}
        </span>
        <span className={`min-w-0 truncate text-center text-xs ${subTextClass}`}>
          {endUser || "End user —"}
        </span>
      </div>

      {rejected ? (
        <div
          className={`flex shrink-0 items-center justify-center border-l bg-inherit px-2 text-[10px] font-bold uppercase tracking-wide ${unitBorderClass}`}
        >
          Rejected
        </div>
      ) : null}

      <div
        className={`flex ${plannerUnitColumnClass} shrink-0 items-center justify-center border-l bg-inherit px-1 text-xs font-bold tabular-nums ${unitBorderClass}`}
        title={unitLabel ? `Unit ${unitLabel}` : "No unit assigned"}
      >
        {unitLabel || "—"}
      </div>
    </div>
  );
}
