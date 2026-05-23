export default function BtnWhiteRounded({ text, type, onClick }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="py-1.5 font-bold px-3 m-1 rounded-full cursor-pointer bg-white text-green-950 hover:text-white hover:bg-green-950"
    >
      {text}
    </button>
  );
}
