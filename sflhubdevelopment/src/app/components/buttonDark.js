export default function ButtonDark({ onClick, text, type }) {
  return (
    <button
      type={type}
      className="bg-green-950 mt-3 py-2 px-3 shadow-lg rounded-full cursor-pointer mx-2"
    >
      {text}
    </button>
  );
}
