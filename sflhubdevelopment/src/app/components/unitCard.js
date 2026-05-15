import ButtonDark from "./buttonDark";

export default function UnitCard({ unit: unitRow, onEdit }) {
  if (!unitRow) return null;
  const { unit, petro, petroPIN, ufa, ufaPIN } = unitRow;

  return (
    <div className="m-3 w-80 rounded-lg border-2 bg-gray-500 p-3 shadow-lg">
      <div className="mb-3 border-2 bg-gray-900 p-2">
        <h3 className="p-3 text-center font-bold text-white">Unit: {unit}</h3>
      </div>
      <div className="grid grid-cols-2 border bg-gray-900">
        <div className="border p-3">
          <span className="text-white">Petro: {petro}</span>
        </div>
        <div className="border p-3">
          <p className="text-white">Petro Pin: {petroPIN}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 border bg-gray-900">
        <div className="border p-3">
          <p className="text-white">UFA: {ufa}</p>
        </div>
        <div className="border p-3">
          <p className="text-white">UFA Pin: {ufaPIN}</p>
        </div>
      </div>
      <div className="flex justify-center">
        {typeof onEdit === "function" ? (
          <ButtonDark
            type="button"
            text="Edit info"
            onClick={() => onEdit(unitRow)}
          />
        ) : null}
      </div>
    </div>
  );
}
