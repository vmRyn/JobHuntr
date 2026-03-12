import { useId } from "react";

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
}) => {
  const generatedId = useId();
  const fieldId = name || generatedId;

  return (
    <label htmlFor={fieldId} className={`block space-y-2 ${className}`}>
      {label && <span className="label-text">{label}</span>}

      {as === "textarea" ? (
        <textarea
          id={fieldId}
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
          id={fieldId}
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
};

export default InputField;
