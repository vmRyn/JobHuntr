import { useId } from "react";

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  className = ""
}) => {
  const generatedId = useId();
  const fieldId = name || generatedId;

  return (
    <label htmlFor={fieldId} className={`block space-y-2 ${className}`}>
      {label && <span className="label-text">{label}</span>}
      <select
        id={fieldId}
        className="field-control"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option key={option} value={option}>
                {option}
              </option>
            );
          }

          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </label>
  );
};

export default SelectField;
