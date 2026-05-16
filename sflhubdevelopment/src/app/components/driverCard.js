import BtnRed from "./btnRed";

export default function DriverCard({ driver, onEdit, onDelete }) {
  if (!driver) return null;
  const { name, phone, user, pass, pin, division } = driver;

  return (
    <div className="m-3 w-120 rounded-lg border-2 bg-gray-500 p-3 shadow-lg">
      <div className="mb-3 border-2 bg-gray-900 p-2">
        <h3 className="p-3 text-center font-bold text-white">{name}</h3>
      </div>
      <div className="grid grid-cols-2 border">
        <div className="border p-2">
          <p className="text-center text-sm text-white">{phone}</p>
        </div>
        <div className="border p-2">
          <p className="text-center text-sm text-white">{division}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 border">
        <div className="border p-3">
          <p className="text-center text-sm text-white">{user}</p>
        </div>
        <div className="border p-3">
          <p className="text-center text-sm text-white">{pass}</p>
        </div>
      </div>
      <div className="border p-3">
        <p className="text-center text-sm text-white">{pin}</p>
      </div>
      {typeof onEdit === "function" ? (
        <div className="mt-3 flex justify-center items-center">
          <button
            type="button"
            className="rounded-full border border-white/30 bg-green-950 h-fit px-4 py-2 my-auto text-sm font-semibold text-white hover:bg-gray-800"
            onClick={() => onEdit(driver)}
          >
            Edit info
          </button>
          <BtnRed text="Delete Driver" onClick={onDelete} type="button" />
        </div>
      ) : null}
    </div>
  );
}
