export default function ButtonDark({
  onClick,
  text,
  type = "button",
  disabled = false,
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="mx-2 cursor-pointer rounded-full bg-green-950 px-3 py-1.5 hover:text-green-950 hover:bg-white hover:border hover:border-green-950 text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
      {...(typeof onClick === "function" ? { onClick } : {})}
    >
      {text}
    </button>
  );
}
