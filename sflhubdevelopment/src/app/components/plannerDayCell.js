import {
  plannerSlotStatusClass,
  readSlotDriverName,
  readSlotRejected,
  readSlotUnitNumber,
} from "@/lib/plannerSlots";

export const plannerCellWidthClass = "w-[28rem] min-w-[28rem]";
export const plannerUnitColumnClass = "w-12 min-w-12";
export const plannerDriverColumnClass = "w-24 min-w-24";

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
        Add slot
      </span>
    </button>
  );
}

export function PlannerEmptyPresetCell({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${plannerCellShellClass} cursor-pointer border-dashed bg-white text-green-950/50 transition hover:bg-green-950/5 disabled:cursor-not-allowed disabled:opacity-50`}
      aria-label="Empty planner slot"
    >
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden px-2">
        <span className="min-w-0 truncate text-center font-medium">—</span>
        <span className="min-w-0 truncate text-center text-xs">End user —</span>
      </div>
      <div
        className={`flex ${plannerDriverColumnClass} shrink-0 items-center justify-center border-l border-green-950/15 px-1 text-[11px]`}
      >
        —
      </div>
      <div
        className={`flex ${plannerUnitColumnClass} shrink-0 items-center justify-center border-l border-green-950/15 px-1 text-xs`}
      >
        —
      </div>
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
  const unitLabel = readSlotUnitNumber(slot, slotCols);
  const driverLabel = readSlotDriverName(slot, slotCols);
  const rejected = readSlotRejected(slot, slotCols);
  const statusClass = plannerSlotStatusClass(slot, slotCols);
  const onDarkBg = /text-white/.test(statusClass);
  const subTextClass = onDarkBg ? "text-white/80" : "text-green-900/75";
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
        className={`flex ${plannerDriverColumnClass} shrink-0 items-center justify-center border-l bg-inherit px-1 text-[11px] font-semibold ${unitBorderClass}`}
        title={driverLabel ? `Driver ${driverLabel}` : "No driver"}
      >
        <span className="truncate">{driverLabel || "—"}</span>
      </div>

      <div
        className={`flex ${plannerUnitColumnClass} shrink-0 items-center justify-center border-l bg-inherit px-1 text-xs font-bold tabular-nums ${unitBorderClass}`}
        title={unitLabel ? `Unit ${unitLabel}` : "No unit assigned"}
      >
        {unitLabel || "—"}
      </div>
    </div>
  );
}
