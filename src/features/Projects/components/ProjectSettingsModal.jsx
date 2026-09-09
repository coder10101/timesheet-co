import { useState, useEffect } from "react";
import { Settings2, X, Check } from "lucide-react";
import { PROJECT_PRESETS } from "../../../constants/projectPresets";

export function ProjectSettingsModal({
  isOpen,
  onClose,
  config = {},
  onSaveConfig,
}) {
  const [settingsPreset, setSettingsPreset] = useState(
    config.preset || "architecture",
  );
  const [settingsLeadLabel, setSettingsLeadLabel] = useState(
    config.leadLabel || "Architect",
  );
  const [settingsSubLeadLabel, setSettingsSubLeadLabel] = useState(
    config.subLeadLabel || "Sub-Architect",
  );
  const [settingsWorkLabel, setSettingsWorkLabel] = useState(
    config.workLabel || "Project Work",
  );
  const [settingsStageLabel, setSettingsStageLabel] = useState(
    config.stageLabel || "Current Stage",
  );
  const [settingsTypeLabel, setSettingsTypeLabel] = useState(
    config.typeLabel || "Project Type",
  );
  const [settingsEnabled, setSettingsEnabled] = useState(
    config.enabled !== false,
  );
  const [settingsAllowEmployeeEdit, setSettingsAllowEmployeeEdit] = useState(
    config.allowEmployeeEdit !== false,
  );
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettingsPreset(config.preset || "architecture");
      setSettingsLeadLabel(config.leadLabel || "Architect");
      setSettingsSubLeadLabel(config.subLeadLabel || "Sub-Architect");
      setSettingsWorkLabel(config.workLabel || "Project Work");
      setSettingsStageLabel(config.stageLabel || "Current Stage");
      setSettingsTypeLabel(config.typeLabel || "Project Type");
      setSettingsEnabled(config.enabled !== false);
      setSettingsAllowEmployeeEdit(config.allowEmployeeEdit !== false);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handlePresetSelect = (presetKey) => {
    setSettingsPreset(presetKey);
    const p = PROJECT_PRESETS[presetKey];
    if (p) {
      setSettingsLeadLabel(p.leadLabel);
      setSettingsSubLeadLabel(p.subLeadLabel);
      setSettingsWorkLabel(p.workLabel);
      setSettingsStageLabel(p.stageLabel);
      setSettingsTypeLabel(p.typeLabel);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const selectedPreset =
        PROJECT_PRESETS[settingsPreset] || PROJECT_PRESETS.architecture;
      const newConfig = {
        preset: settingsPreset,
        enabled: settingsEnabled,
        allowEmployeeEdit: settingsAllowEmployeeEdit,
        leadLabel: settingsLeadLabel || selectedPreset.leadLabel,
        subLeadLabel: settingsSubLeadLabel || selectedPreset.subLeadLabel,
        workLabel: settingsWorkLabel || selectedPreset.workLabel,
        stageLabel: settingsStageLabel || selectedPreset.stageLabel,
        typeLabel: settingsTypeLabel || selectedPreset.typeLabel,
        stages: selectedPreset.defaultStages,
        workCategories: selectedPreset.defaultWorkCategories,
        types: selectedPreset.defaultTypes,
      };

      if (onSaveConfig) {
        await onSaveConfig(newConfig);
      }
      onClose();
    } catch (err) {
      alert(err.message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl space-y-5 my-auto fade-in">
        {/* HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Project Workspace Settings
              </h3>
              <p className="text-xs text-slate-500">
                Adapt field terminology for your organization's domain.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PERMISSIONS & CONTROLS */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Allow Employee Editing
                  </span>
                  {settingsAllowEmployeeEdit ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Enabled
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                      Read-Only
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Allow employees to update{" "}
                  <strong>{settingsStageLabel || "Current Stage"}</strong> and{" "}
                  <strong>Deadline</strong> directly from their dashboard.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settingsAllowEmployeeEdit}
                onClick={() => setSettingsAllowEmployeeEdit((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settingsAllowEmployeeEdit ? "bg-primary" : "bg-slate-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settingsAllowEmployeeEdit
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900">
                    Enable Projects Module
                  </span>
                  {settingsEnabled ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Active
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Activate project and milestone tracking for this organization.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settingsEnabled}
                onClick={() => setSettingsEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settingsEnabled ? "bg-primary" : "bg-slate-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settingsEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* TEMPLATE PRESET SELECTION */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 block">
              Select Industry Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.values(PROJECT_PRESETS).map((p) => (
                <div
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    settingsPreset === p.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      {p.name}
                    </span>
                    {settingsPreset === p.id && (
                      <Check size={12} className="text-primary font-bold" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* TERMINOLOGY CUSTOMIZATION */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-sm font-semibold text-slate-800 block">
              Customize Field Labels
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600 block">
                  Architect / Lead Label
                </span>
                <input
                  type="text"
                  value={settingsLeadLabel}
                  onChange={(e) => setSettingsLeadLabel(e.target.value)}
                  className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600 block">
                  Sub Architect / Team Label
                </span>
                <input
                  type="text"
                  value={settingsSubLeadLabel}
                  onChange={(e) => setSettingsSubLeadLabel(e.target.value)}
                  className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600 block">
                  Project Work / Category Label
                </span>
                <input
                  type="text"
                  value={settingsWorkLabel}
                  onChange={(e) => setSettingsWorkLabel(e.target.value)}
                  className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600 block">
                  Current Stage Label
                </span>
                <input
                  type="text"
                  value={settingsStageLabel}
                  onChange={(e) => setSettingsStageLabel(e.target.value)}
                  className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-xs font-medium text-slate-600 block">
                  Project Type Label
                </span>
                <input
                  type="text"
                  value={settingsTypeLabel}
                  onChange={(e) => setSettingsTypeLabel(e.target.value)}
                  className="w-full h-9 px-3 text-xs sm:text-sm font-normal text-slate-700 bg-white border border-slate-300 rounded-xl outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2 text-xs font-semibold bg-primary text-white rounded-xl shadow-xs disabled:opacity-50 cursor-pointer hover:bg-primary/95"
            >
              {savingSettings ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
