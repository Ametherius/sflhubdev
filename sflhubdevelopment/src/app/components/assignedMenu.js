export default function AssignedMenu({ assigned }) {
  return (
    <div className="flex flex-col mt-10">
      <h2 className="text-green-950 text-center font-bold text-3xl mb-4">
        Assigned Units
      </h2>{" "}
      {assigned.map((a) => (
        <div
          key={a.assignedID}
          className="bg-gray-900 p-1 m-2 grid grid-cols-3"
        >
          <p className="p-2 text-center border">{a.driver.name}</p>
          <p className="p-2 text-center border">{a.unit.unit}</p>
          <p className="p-2 text-center border">{a.driver.phone}</p>
        </div>
      ))}
    </div>
  );
}
