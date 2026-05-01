export default function FormInput({ label, value, onChange, type }) {
  return (
    <div className="w-fit p-2">
      <label className="block mb-2">{label}</label>
      <input
        value={value}
        onChange={onChange}
        type={type}
        className="bg-white block rounded-lg text-green-950 p-2 border-2 border-green-950"
      />
    </div>
  );
}
