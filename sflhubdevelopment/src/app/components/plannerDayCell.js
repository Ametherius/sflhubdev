import { plannerSlotStatusClass } from "@/lib/plannerSlots";



export const plannerCellWidthClass = "w-[25rem] min-w-[25rem]";



export const plannerCellShellClass =

  "box-border flex h-8 w-full items-stretch rounded-md border border-green-950/25 text-sm shadow-sm";



export const plannerDayColumnClass = `flex shrink-0 flex-col ${plannerCellWidthClass}`;



export function PlannerAddSlotCell({ onClick, disabled = false }) {

  return (

    <button

      type="button"

      onClick={onClick}

      disabled={disabled}

      className={`${plannerCellShellClass} !items-center justify-center gap-1 border-dashed bg-green-950/5 px-2 text-green-950 transition hover:bg-green-950/10 disabled:cursor-not-allowed disabled:opacity-50`}

      aria-label="Add planner slot"

    >

      <span className="text-base font-bold leading-none">+</span>

      <span className="text-[10px] font-semibold bg-blue uppercase tracking-wide">

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

  const statusClass = plannerSlotStatusClass(slot, slotCols);

  const onDarkBg = /text-white/.test(statusClass);

  const subTextClass = onDarkBg ? "text-white/80" : "text-green-900/75";

  const unitLabel = unitNumber ? String(unitNumber).trim() : "";



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



      <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-hidden px-2 pl-7">

        <span className="min-w-0 truncate text-right font-medium">

          {origin || "—"}

        </span>

        <span className={`min-w-0 truncate text-right text-xs ${subTextClass}`}>

          {endUser || "End user —"}

        </span>

      </div>



      <div

        className={`flex w-14 shrink-0 items-center justify-center border-l px-1 text-xs font-bold tabular-nums ${

          onDarkBg ? "border-white/25" : "border-green-950/15"

        }`}

        title={unitLabel ? `Unit ${unitLabel}` : "No unit assigned"}

      >

        {unitLabel || "—"}

      </div>

    </div>

  );

}


