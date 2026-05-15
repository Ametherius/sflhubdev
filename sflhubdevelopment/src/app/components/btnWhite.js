export default function BtnWhite({
  text,
  onClick,
  Icon,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="bg-white py-2 px-3 hover:bg-green-950 hover:border hover:text-white text-green-950 font-bold flex my-auto"
      {...rest}
    >
      <Icon className="mr-2 my-auto" />
      {text}
    </button>
  );
}
