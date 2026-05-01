export default function DriverCard({
  name,
  phone,
  user,
  pass,
  pin,
  division,
  Icon,
}) {
  return (
    <div className="p-3 border-2 m-3 shadow-lg rounded-lg w-120 bg-gray-500">
      <div className="mb-3 bg-gray-900 border-2 p-2">
        <h3 className="text-center text-white font-bold p-3">{name}</h3>
      </div>
      <div className="grid grid-cols-2 border">
        <div className="p-2 border grid grid-cols-2 auto-cols-auto">
          <p className="text-center text-sm mr-2 my-auto">{phone}</p>
          <div className="flex justify-end">
            <button className="my-auto flex mr-1 text-3xl py-auto cursor-pointer hover:text-green-950">
              <Icon />
            </button>
          </div>
        </div>
        <div className="p-3 border grid grid-cols-2">
          <p className="text-center mr-4 my-auto">{division}</p>
          <div className="flex justify-end">
            <button className="my-auto flex ml-10 text-3xl py-auto cursor-pointer hover:text-green-950">
              <Icon />
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 border">
        <div className="p-3 border grid grid-cols-2">
          <p className="text-center my-auto mr-2">{user}</p>
          <div className="flex justify-end">
            <button className="my-auto flex ml-10 text-3xl py-auto cursor-pointer hover:text-green-950">
              <Icon />
            </button>
          </div>
        </div>
        <div className="p-3 border grid grid-cols-2">
          <p className="text-center my-auto mr-4">{pass}</p>
          <div className="flex justify-end">
            <button className="my-auto flex ml-10 text-3xl py-auto cursor-pointer hover:text-green-950">
              <Icon />
            </button>
          </div>
        </div>
      </div>
      <div className="p-3 border grid grid-cols-2">
        <p className="text-right my-auto mr-2">{pin}</p>
        <div className="flex justify-end">
          <button className="my-auto flex ml-10 text-3xl py-auto cursor-pointer hover:text-green-950">
            <Icon />
          </button>
        </div>
      </div>
    </div>
  );
}
