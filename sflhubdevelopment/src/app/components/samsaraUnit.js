import { BsSpeedometer2 } from "react-icons/bs";
import { FaLocationDot } from "react-icons/fa6";

export default function SamsaraUnit({
  driver,
  unit,
  location,
  lat,
  lon,
  vin,
  plate,
  odometer,
  speed,
  id,
}) {
  return (
    <div className="rounded-lg shadow-md border-2 border-green-950 m-2">
      <div className="flex p-1 border-b-2 border-green-950">
        <div className="min-w-44 flex items-center font-bold">
          <h1 className="text-green-950">{driver}</h1>
        </div>
        <div className="text-green-950 min-w-16 flex justify-center items-center font-bold">
          <span>{unit}</span>
        </div>
        <div className="text-white font-bold flex items-center my-auto bg-green-950 py-1 min-w-18 max-w-18 rounded-md">
          <div className="text-2xl ml-1">
            <BsSpeedometer2 />
          </div>
          <div className="flex items-center ml-3 py-auto">
            <span>{speed}</span>
          </div>
        </div>
      </div>
      <div className="p-1 flex items-center">
        <div className="text-green-950">
          <FaLocationDot />
        </div>
        <div className="text-green-950 text-xs font-bold">
          <span>{location}</span>
        </div>
      </div>
      <div className="flex items-center p-1">
        <div className="text-green-950 flex justify-center text-sm min-w-1/2">
          <span>
            <strong>Odometer</strong>: {odometer} KM
          </span>
        </div>
        <div className="text-green-950 text-sm flex justify-center min-w-1/2">
          <span>
            <strong>Plate</strong>: {plate}
          </span>
        </div>
      </div>
      <div className="flex justify-center items-center p-1">
        <div className="text-green-950 text-sm">
          <span>
            <strong>VIN</strong>: {vin}
          </span>
        </div>
      </div>
    </div>
  );
}
