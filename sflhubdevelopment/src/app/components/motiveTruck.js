"use client";

export default function MotiveTruck({
  key,
  unit,
  firstName,
  lastName,
  vin,
  plate,
  odometer,
  trailer,
}) {
  const colStyle = "p-1 m-1 grid grid-cols-2";
  const labelStyle = "text-gray-700 font-bold text-sm block";
  const spanStyle = "font-normal block text-end";
  return (
    <div
      key={key}
      className="bg-white border border-gray-400 border-l-0 border-r-0 p-2"
    >
      <div className="p-1 m-1 grid grid-cols-2 border-b border-gray-400">
        <div className="text-green-950 flex justify-start font-bold">
          <h6>{`${firstName} ${lastName.slice(0, 1)}.`}</h6>
        </div>
        <div className="text-green-950 flex justify-end font-bold">
          <h6>{unit}</h6>
        </div>
      </div>
      <div className={colStyle}>
        <div className="flex justify-start">
          <p className={labelStyle}>
            VIN: {""}
            <span className={spanStyle}>{vin}</span>
          </p>
        </div>
        <div className="flex justify-end">
          <p className={labelStyle}>
            Plate: {""}
            <span className={spanStyle}>{plate}</span>
          </p>
        </div>
      </div>
      <div className={colStyle}>
        <div className="flex justify-start">
          <p className={labelStyle}>
            Odometer: {""}
            <span className={spanStyle}>{odometer}</span>
          </p>
        </div>
        <div className="flex justify-end">
          <p className={labelStyle}>
            Trailer: {""}
            <span className={spanStyle}>
              {trailer === "None" ? "" : trailer.slice(0, 3)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
