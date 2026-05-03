export default function FormSelect({
  label,
  value,
  onChange,
  options = [],
  required = true,
  placeholder = "Select…",
}) {
  const optionIds = options.map((option, index) =>
    `${option?.id ?? option?.value ?? option?.name ?? option?.unit ?? "option"}-${index}`,
  );

  return (
    <div className="w-fit p-2">
      <label className="mb-2 block text-green-950">{label}</label>
      <select
        className="block rounded-md border-2 border-green-950 text-black placeholder:text-white bg-white p-3"
        value={value}
        onChange={onChange}
        required={required}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((option, index) => (
          <option
            key={optionIds[index]}
            value={String(
              option?.value ?? option?.id ?? option?.name ?? option?.unit ?? "",
            )}
          >
            {option.name ?? option.unit}
          </option>
        ))}
      </select>
    </div>
  );
}
