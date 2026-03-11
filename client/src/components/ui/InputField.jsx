const InputField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  as = "input",
  rows = 4,
  className = ""
}) => (
  <label className={`block space-y-2 ${className}`}>
    {label && <span className="label-text">{label}</span>}

    {as === "textarea" ? (
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className="field-control min-h-[110px] resize-y"
      />
    ) : (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="field-control"
      />
    )}
  </label>
);

export default InputField;
