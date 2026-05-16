export default function BtnRed({ onClick, text, type }) {
  return (
    <button
      className="bg-red-800 py-1.5 font-bold px-3 m-1 rounded-full cursor-pointer"
      type={type}
      onClick={onClick}
    >
      {text}
    </button>
  );
}
