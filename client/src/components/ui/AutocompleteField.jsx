import { useEffect, useMemo, useState } from "react";

const AutocompleteField = ({
  label,
  value,
  onChange,
  placeholder,
  suggestions,
  name,
  required = false,
  minQueryLength = 1,
  className = ""
}) => {
  const [focused, setFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || "");

  useEffect(() => {
    setInternalValue(value || "");
  }, [value]);

  const matches = useMemo(() => {
    const query = internalValue.trim().toLowerCase();

    if (query.length < minQueryLength) {
      return [];
    }

    return suggestions
      .filter((suggestion) => suggestion.toLowerCase().includes(query))
      .slice(0, 6);
  }, [internalValue, minQueryLength, suggestions]);

  const handleSelect = (nextValue) => {
    setInternalValue(nextValue);
    onChange({ target: { name, value: nextValue } });
    setFocused(false);
  };

  return (
    <label className={`block space-y-2 ${className}`}>
      {label && <span className="label-text">{label}</span>}
      <div className="relative">
        <input
          className="field-control"
          name={name}
          required={required}
          placeholder={placeholder}
          value={internalValue}
          onChange={(event) => {
            setInternalValue(event.target.value);
            onChange(event);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => {
              setFocused(false);
            }, 120);
          }}
        />

        {focused && matches.length > 0 && (
          <div className="surface-popover absolute left-0 right-0 top-[calc(100%+0.45rem)] z-20 overflow-hidden">
            {matches.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="block w-full px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-brand/12"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
};

export default AutocompleteField;
