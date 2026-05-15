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
  /** When true, sits flush inside ScheduleRow (no outer margin / full-height column). */
  embedded = false,
}) {
  const shell = embedded
    ? "m-0 flex h-auto min-h-0 w-full min-w-[17rem] max-w-[22rem] shrink-0 flex-col rounded-none border-0 border-r border-green-950/25 bg-white p-5 shadow-none lg:h-full lg:min-h-0 lg:w-auto lg:max-w-[22rem]"
    : "m-1 ml-3 w-90 rounded-lg rounded-r-none bg-white p-5";

  return (
    <div className={shell}>
      <div className="grid grid-cols-2 border-b-2 border-green-950">
        <div className="flex justify-center text-xl font-bold text-green-950">
          <h1>{name}</h1>
        </div>
        <div className="flex justify-end text-xl font-bold text-green-950">
          <h1>Unit: {unit}</h1>
        </div>
      </div>
      <div className="flex justify-center py-2 text-green-950">
        <p>{division}</p>
      </div>
      <div className="grid grid-cols-2">
        <div className="flex justify-start p-2 text-green-950">
          <p>
            <strong>{phone}</strong>
          </p>
        </div>
        <div className="flex justify-start p-2 text-green-950">
          <p>{pin}</p>
        </div>
      </div>
      <div className="my-2 grid grid-cols-2">
        <div className="flex justify-start p-2 text-green-950">
          <p>
            <strong>User:</strong> {user}
          </p>
        </div>
        <div className="flex justify-start p-2 text-green-950">
          <p>
            <strong>Pass:</strong> {pass}
          </p>
        </div>
      </div>
      <div className="my-2 grid grid-cols-2">
        <div className="flex justify-start p-2 text-green-950">
          <p>
            <strong>Petro:</strong> {petro}
          </p>
        </div>
        <div className="flex justify-start p-2 text-green-950">
          <p>
            <strong>Petro PIN:</strong> {petroPIN}
          </p>
        </div>
      </div>
      <div className="my-2 grid grid-cols-2">
        <div className="flex justify-start p-2 text-green-950">
          <p>
            <strong>UFA:</strong> {ufa}
          </p>
        </div>
        <div className="flex justify-start p-2 text-green-950">
          <p>
            <strong>UFA Pin:</strong> {ufaPIN}
          </p>
        </div>
      </div>
      <div
        className={`flex justify-center ${embedded ? "mt-auto pt-4" : "mt-2"}`}
      >
        <ButtonDark onClick={onDelete} text="Vacate Unit" type="button" />
      </div>
    </div>
  );
}
