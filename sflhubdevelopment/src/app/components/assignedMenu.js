export default function AssignedMenu({ assigned }) {
  const sortAssigned = [...assigned].sort((a, b) => {
    const unitA = a.unit?.unit;
    const unitB = b.unit?.unit;
    const numA = Number(unitA);
    const numB = Number(unitB);

    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return numA - numB;
    }
  });

  console.log(sortAssigned);
  return (
    <div className="flex flex-col mt-10">
      <h2 className="text-green-950 text-center font-bold text-3xl mb-4">
        Assigned Units
      </h2>{" "}
      {sortAssigned.map((a) => (
        <div key={a.id} className="bg-gray-900 p-1 m-2 grid grid-cols-3">
          <p className="p-2 text-center border">{a.driver.name}</p>
          <p className="p-2 text-center border">{a.unit.unit}</p>
          <p className="p-2 text-center border">{a.driver.phone}</p>
        </div>
      ))}
    </div>
  );
}
