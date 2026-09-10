import React, { useState, useEffect } from "react";

/**
 * Reusable stage selector supporting:
 * 1. Preset list selection (<select>)
 * 2. "+ Add new / Custom" mode toggle (<input type="text">)
 * 3. Auto-detection of existing custom stage values
 * 4. Architectural theme styling (Plum for Design, Blueprint Teal for Site)
 */
export function StageSelectDropdown({
  label,
  icon,
  value,
  onChange,
  stages = [],
  track = "design", // "design" | "site"
  disabled = false,
  placeholder = "Select milestone...",
  hideLabel = false,
}) {
  const isCustomInitially = Boolean(value && !stages.includes(value));
  const [isCustom, setIsCustom] = useState(isCustomInitially);

  // If external value changes to something not in the presets list, switch to custom mode
  useEffect(() => {
    if (value && !stages.includes(value)) {
      setIsCustom(true);
    }
  }, [value, stages]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__custom__") {
      setIsCustom(true);
    } else {
      onChange(val);
    }
  };

  const handleToggleMode = () => {
    if (isCustom) {
      setIsCustom(false);
      // If current value is not in presets, default to first preset if available
      if (!stages.includes(value)) {
        onChange(stages[0] || "");
      }
    } else {
      setIsCustom(true);
    }
  };

  const isDesign = track === "design";
  const theme = isDesign
    ? {
        labelColor: "text-[#514366]",
        ringColor: "focus:ring-[#63537E]/20 focus:border-[#63537E]",
        btnColor: "text-[#63537E] hover:text-[#514366]",
      }
    : {
        labelColor: "text-teal-900",
        ringColor: "focus:ring-teal-500/20 focus:border-teal-600",
        btnColor: "text-teal-700 hover:text-teal-900",
      };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        {label ? (
          <label className={`text-xs font-bold flex items-center gap-1.5 ${theme.labelColor}`}>
            {icon && <span>{icon}</span>}
            <span>{label}</span>
          </label>
        ) : hideLabel ? null : (
          <span className="text-[11px] font-medium text-text-muted">
            Stage Milestone:
          </span>
        )}
        <button
          type="button"
          onClick={handleToggleMode}
          disabled={disabled}
          className={`text-[11px] font-semibold underline underline-offset-2 transition-colors cursor-pointer ml-auto ${theme.btnColor}`}
        >
          {isCustom ? "Select from list" : "+ Add custom stage"}
        </button>
      </div>

      {isCustom ? (
        <div className="relative">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter custom milestone..."
            disabled={disabled}
            className={`w-full text-xs font-medium rounded-lg border border-border bg-white px-3 py-2 text-text-primary transition-all focus:outline-none focus:ring-2 ${theme.ringColor}`}
          />
        </div>
      ) : (
        <select
          value={stages.includes(value) ? value : ""}
          onChange={handleSelectChange}
          disabled={disabled}
          className={`w-full text-xs font-medium rounded-lg border border-border bg-white px-3 py-2 text-text-primary transition-all focus:outline-none focus:ring-2 cursor-pointer ${theme.ringColor}`}
        >
          <option value="">{placeholder}</option>
          {stages.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
          <option value="__custom__">+ Add Custom Stage...</option>
        </select>
      )}
    </div>
  );
}
