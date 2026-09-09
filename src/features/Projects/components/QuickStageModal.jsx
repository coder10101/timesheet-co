import React, { useState, useEffect, useMemo } from "react";
import { TRACK_STAGES, calculateOverallProgress, STATUS_OPTIONS } from "../../../constants/projectPresets";
import { StageSelectDropdown } from "./StageSelectDropdown";
import { X, Check, AlertCircle, Layers, Sliders, CheckCircle2 } from "lucide-react";

export function QuickStageModal({ isOpen, onClose, project, onSave, saving, isAdmin = false }) {
  const [hasDesign, setHasDesign] = useState(true);
  const [hasSite, setHasSite] = useState(true);

  const [designStage, setDesignStage] = useState("");
  const [designProgress, setDesignProgress] = useState(0);

  const [siteStage, setSiteStage] = useState("");
  const [siteProgress, setSiteProgress] = useState(0);

  const [customStage, setCustomStage] = useState("");
  const [status, setStatus] = useState("Active");
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      const hasD = project.has_design !== false && project.hasDesign !== false;
      const hasS = project.has_site !== false && project.hasSite !== false;
      setHasDesign(hasD);
      setHasSite(hasS);

      setDesignStage(project.design_stage || "");
      setDesignProgress(Number(project.design_progress) || 0);

      setSiteStage(project.site_stage || "");
      setSiteProgress(Number(project.site_progress) || 0);

      setCustomStage(project.current_stage || "");
      setStatus(project.status || "Active");
      setError("");
    }
  }, [project, isOpen]);

  // Live composite progress calculation
  const compositeProgress = useMemo(() => {
    return calculateOverallProgress({
      designProgress,
      siteProgress,
      hasDesign,
      hasSite,
    });
  }, [designProgress, siteProgress, hasDesign, hasSite]);

  if (!isOpen || !project) return null;

  const handleToggleDesign = (val) => {
    if (!val && !hasSite) return; // Prevent disabling both tracks
    setHasDesign(val);
  };

  const handleToggleSite = (val) => {
    if (!val && !hasDesign) return; // Prevent disabling both tracks
    setHasSite(val);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setError("");

      let compositeStage = "";
      if (hasDesign && hasSite && designStage && siteStage) {
        compositeStage = `🎨 ${designStage} + 🏗️ ${siteStage}`;
      } else if (hasDesign && designStage) {
        compositeStage = `🎨 ${designStage}`;
      } else if (hasSite && siteStage) {
        compositeStage = `🏗️ ${siteStage}`;
      } else {
        compositeStage = customStage;
      }

      const savePayload = {
        id: project.id,
        currentStage: compositeStage,
        designStage: hasDesign ? designStage : "",
        designProgress: hasDesign ? designProgress : 0,
        siteStage: hasSite ? siteStage : "",
        siteProgress: hasSite ? siteProgress : 0,
        hasDesign,
        hasSite,
        has_design: hasDesign,
        has_site: hasSite,
        progress: compositeProgress,
      };

      // Only administrators can modify overall project status
      if (isAdmin) {
        savePayload.status = compositeProgress >= 100 ? "Completed" : status;
      }

      await onSave(savePayload);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update project stage");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary">
                {isAdmin ? "Update Project Stage & Progress" : "Update Project Stage"}
              </h3>
              <p className="text-xs text-text-muted truncate max-w-[280px]">
                {project.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="quick-stage-form" onSubmit={handleSave} className="p-6 space-y-5 flex-1 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Track Toggles */}
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
              Active Project Tracks
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleToggleDesign(!hasDesign)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  hasDesign
                    ? "bg-[#63537E]/10 border-[#63537E]/30 text-[#514366] shadow-xs"
                    : "bg-surface-muted/50 border-border text-text-muted hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🎨</span>
                  <div>
                    <div className="text-xs font-bold">Design Track</div>
                    <div className="text-[11px] opacity-75">Drawings & 3D</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    hasDesign ? "bg-[#63537E] border-[#63537E] text-white" : "border-border bg-white"
                  }`}
                >
                  {hasDesign && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleToggleSite(!hasSite)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  hasSite
                    ? "bg-teal-50/80 border-teal-300 text-teal-950 shadow-xs"
                    : "bg-surface-muted/50 border-border text-text-muted hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🏗️</span>
                  <div>
                    <div className="text-xs font-bold">Site Track</div>
                    <div className="text-[11px] opacity-75">Site Execution</div>
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    hasSite ? "bg-teal-700 border-teal-700 text-white" : "border-border bg-white"
                  }`}
                >
                  {hasSite && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* Design Track Controls */}
          {hasDesign && (
            <div className="p-4 rounded-xl border border-[#63537E]/20 bg-[#63537E]/5 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#514366] flex items-center gap-1.5">
                  <span>🎨</span> Design Track
                </span>
                <span className="text-xs font-bold text-[#63537E] font-mono">{designProgress}%</span>
              </div>

              <StageSelectDropdown
                track="design"
                value={designStage}
                onChange={setDesignStage}
                stages={TRACK_STAGES.design}
                placeholder="Select milestone..."
              />

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                  <span>Progress</span>
                  <span className="font-mono font-bold text-[#63537E]">{designProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={designProgress}
                  onChange={(e) => setDesignProgress(Number(e.target.value))}
                  className="w-full h-2 bg-[#63537E]/20 rounded-lg appearance-none cursor-pointer accent-[#63537E]"
                />
              </div>
            </div>
          )}

          {/* Site Track Controls */}
          {hasSite && (
            <div className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <span>🏗️</span> Site Track
                </span>
                <span className="text-xs font-bold text-teal-800 font-mono">{siteProgress}%</span>
              </div>

              <StageSelectDropdown
                track="site"
                value={siteStage}
                onChange={setSiteStage}
                stages={TRACK_STAGES.site}
                placeholder="Select milestone..."
              />

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-medium text-text-muted">
                  <span>Progress</span>
                  <span className="font-mono font-bold text-teal-800">{siteProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={siteProgress}
                  onChange={(e) => setSiteProgress(Number(e.target.value))}
                  className="w-full h-2 bg-teal-200/70 rounded-lg appearance-none cursor-pointer accent-teal-700"
                />
              </div>
            </div>
          )}

          {/* Overall Composite Progress Summary Card */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-secondary flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-primary" /> Overall Project Progress
              </span>
              <span className="font-extrabold text-sm text-primary">{compositeProgress}%</span>
            </div>
            <div className="w-full bg-border-light h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${compositeProgress}%` }}
              />
            </div>
            <div className="text-[11px] text-text-muted flex justify-between">
              <span>
                {hasDesign && hasSite
                  ? `Average of Design (${designProgress}%) + Site (${siteProgress}%)`
                  : hasDesign
                    ? `Design Only (${designProgress}%)`
                    : `Site Only (${siteProgress}%)`}
              </span>
              {compositeProgress >= 100 && (
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready for Handover
                </span>
              )}
            </div>
          </div>

          {/* Status Picker - Only visible to Admins */}
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Project Status
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STATUS_OPTIONS.map((st) => {
                  const isSelected = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-center cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-white text-text-secondary border-border hover:bg-surface-muted"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        {/* Fixed Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-border bg-surface-subtle/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="quick-stage-form"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 shadow-xs transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Progress</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
