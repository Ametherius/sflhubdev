import { getMotiveData } from "@/lib/motiveAPI";
import { getData } from "@/lib/samsaraAPI";

export default async function Samsara() {
  const data = await getData();

  return (
    <div className="w-full p-3">
      {data.data.map((u) => (
        <div key={u.id}>
          {u.staticAssignedDriver ? (
            <div className="bg-white rounded-xl w-90 p-2 m-2">
              <div className="grid grid-cols-2 border-b-2 border-green-950">
                <div className="font-bold text-green-950 mb-1">
                  <h1>{u.staticAssignedDriver?.name}</h1>
                </div>
                <div className="text-green-950 flex justify-end">
                  <p>
                    <span className="font-bold">Unit: </span>
                    {u.name}
                  </p>
                </div>
              </div>
              <div className="flex text-green-950 mt-6 mb-0 p-1">
                <p className="m-1 text-sm">
                  <span className="font-bold text-gray-600 text-sm">
                    Plate:{" "}
                  </span>
                  {u.licensePlate}
                </p>

                <p className="m-1">
                  <span className="font-bold text-sm text-gray-600">VIN: </span>
                  {u.vin}
                </p>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
      ))}

      <div className="bg-white rounded-xl text-center text-green-950 w-90 p-5 m-2">
        These are just test results from Samsara API, a lot more information is
        available, and potential for assigning drivers in this app to go
        directly to Samsara and the schedule Assigned drivers to be directly
        from Samsara
      </div>
    </div>
  );
}
