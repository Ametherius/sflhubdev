import { FaPlus } from "react-icons/fa";

export default function AddButton({ onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-green-950 h-fit p-3 rounded-md transition-all transform hover:bg-green-800 hover:scale-[1.2]"
    >
      <FaPlus />
    </div>
  );
}
