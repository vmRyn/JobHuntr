import { useState } from "react";

const normalizeSkill = (value) => value.trim();

const SkillsInput = ({
  label,
  skills,
  onChange,
  placeholder = "Type a skill and press Enter",
  className = ""
}) => {
  const [draft, setDraft] = useState("");

  const addSkill = (value) => {
    const nextSkill = normalizeSkill(value);
    if (!nextSkill) return;

    const exists = skills.some((skill) => skill.toLowerCase() === nextSkill.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }

    onChange([...skills, nextSkill]);
    setDraft("");
  };

  const removeSkill = (skillToRemove) => {
    onChange(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addSkill(draft);
    }

    if (event.key === "Backspace" && !draft && skills.length) {
      onChange(skills.slice(0, -1));
    }
  };

  return (
    <label className={`block space-y-2 ${className}`}>
      {label && <span className="label-text">{label}</span>}
      <div className="space-y-3 rounded-3xl border border-white/12 bg-slate-950/45 p-3">
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-2 rounded-full border border-brand/35 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand"
            >
              {skill}
              <button
                type="button"
                className="text-brand/80 transition hover:text-brand"
                onClick={() => removeSkill(skill)}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          className="field-control"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addSkill(draft)}
          placeholder={placeholder}
        />
      </div>
    </label>
  );
};

export default SkillsInput;
