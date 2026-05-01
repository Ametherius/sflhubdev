import ButtonDark from "./buttonDark";

export default function UnitCard({ unit, petro, petroPin, ufa, ufaPin }) {
  return (
    <div className="p-3 border-2 m-3 shadow-lg rounded-lg w-80 bg-gray-500">
      <div className="mb-3 bg-gray-900 border-2 p-2">
        <h3 className="text-white text-center font-bold p-3">Unit: {unit}</h3>
      </div>
      <div className="grid grid-cols-2 border bg-gray-900">
        <div className="p-3 border">
          <span>Petro: {petro}</span>
        </div>
        <div className="p-3 border">
          <p>Petro Pin: {petroPin}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 border bg-gray-900">
        <div className="p-3 border">
          <p>UFA: {ufa}</p>
        </div>
        <div className="p-3 border">
          <p>UFA Pin: {ufaPin}</p>
        </div>
      </div>
      <div className="flex justify-center">
        <ButtonDark text="Edit Info" />
      </div>
    </div>
  );
}
