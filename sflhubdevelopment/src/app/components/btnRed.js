export default function BtnRed({ onClick, text, type }) {
  return (
    <button
      className="bg-red-800 py-2 px-3 rounded-full mt-3 cursor-pointer"
      type={type}
    >
      {text}
    </button>
  );
}
