import ButtonDark from "./buttonDark";

export default function AssignedCard({
  name,
  user,
  pass,
  pin,
  phone,
  division,
  unit,
  petro,
  petroPIN,
  ufa,
  ufaPIN,
  onDelete,
}) {
  return (
    <div className="bg-white rounded-lg rounded-r-none p-5 m-1 ml-3 w-90">
      <div className="grid grid-cols-2 border-b-2 border-green-950">
        <div className="text-green-950 flex justify-center font-bold text-xl">
          <h1>{name}</h1>
        </div>
        <div className="text-green-950 flex justify-end font-bold text-xl">
          <h1>Unit: {unit}</h1>
        </div>
      </div>
      <div className="flex justify-center text-green-950 py-2">
        <p>{division}</p>
      </div>
      <div className="grid grid-cols-2">
        <div className="text-green-950 p-2 flex justify-start">
          <p>
            <strong>{phone}</strong>
          </p>
        </div>
        <div className="text-green-950 p-2 flex justify-start">
          <p>{pin}</p>
        </div>
      </div>
      <div className="grid grid-cols-2">
        <div className="text-green-950 p-2 flex justify-start">
          <p>
            <strong>User:</strong> {user}
          </p>
        </div>
        <div className="text-green-950 p-2 flex justify-start">
          <p>
            <strong>Pass:</strong> {pass}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2">
        <div className="text-green-950 p-2 flex justify-start">
          <p>
            <strong>Petro:</strong> {petro}
          </p>
        </div>
        <div className="text-green-950 p-2 flex justify-start">
          <p>
            <strong>Petro PIN:</strong> {petroPIN}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2">
        <div className="text-green-950 p-2 flex justify-start">
          <p>
            <strong>UFA:</strong> {ufa}
          </p>
        </div>
        <div className="text-green-950 p-2 flex justify-start">
          <p>
            <strong>UFA Pin:</strong> {ufaPIN}
          </p>
        </div>
      </div>
      <div className="flex justify-center">
        <ButtonDark onClick={onDelete} text="Delete Unit" type="button" />
      </div>
    </div>
  );
}
