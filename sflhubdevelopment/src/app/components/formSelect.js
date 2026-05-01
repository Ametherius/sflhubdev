export default function FormSelect({
  label,
  value,
  onChange,
  options = [],
  required = true,
}) {
  return (
    <div className="w-fit p-2">
      <label className="mb-2 block text-green-950">{label}</label>
      <select
        className="block rounded-md text-black placeholder:text-white bg-white p-3"
        value={value}
        onChange={onChange}
      >
        {options.map((option, index) => (
          <option
            key={`${option?.value ?? option?.name ?? "option"}-${index}`}
            value={option?.value ?? ""}
          >
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}
