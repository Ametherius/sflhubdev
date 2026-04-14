export default function BtnWhite({ text, onClick, Icon }) {
  return (
    <button
      onClick={onClick}
      className="bg-white py-2 px-3 hover:bg-green-950 hover:border hover:text-white text-green-950 font-bold flex my-auto"
    >
      <Icon className="mr-2 my-auto" />
      {text}
    </button>
  );
}
