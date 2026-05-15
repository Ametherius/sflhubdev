export default function ButtonDark({ onClick, text, type, disabled = false }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="mx-2 mt-3 cursor-pointer rounded-full bg-green-950 px-3 py-2 text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
    >
      {text}
    </button>
  );
}