export default function SquareButton({ text, Icon, type, style, onClick }) {
  return (
    <button
      className="flex my-auto bg-white text-green-950 font-bold px-4 py-3 shadow-md hover:bg-green-950 hover:text-white transition-all hover:scale-110"
      type={type}
      onClick={onClick}
    >
      <Icon className="my-auto mr-2" />
      {text}
    </button>
  );
}
