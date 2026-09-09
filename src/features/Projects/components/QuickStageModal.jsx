import React, { useState, useEffect, useMemo } from "react";
import { TRACK_STAGES, calculateOverallProgress, STATUS_OPTIONS } from "../../../constants/projectPresets";
import { X, Check, AlertCircle, Layers, Sliders, CheckCircle2 } from "lucide-react";

export function QuickStageModal({ isOpen, onClose, project, onSave, saving }) {
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

      await onSave({
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
        status: compositeProgress >= 100 ? "Completed" : status,
      });

      onClose();
    } catch (err) {
      setError(err.message || "Failed to update project stage");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-border w-full max-w-lg overflow-hidden animate-scale-up my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary">Update Project Stage & Progress</h3>
              <p className="text-xs text-text-muted truncate max-w-[280px]">
                {project.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
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
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  hasDesign
                    ? "bg-rose-50/70 border-rose-300 text-rose-900 shadow-sm"
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
                    hasDesign ? "bg-rose-600 border-rose-600 text-white" : "border-border bg-white"
                  }`}
                >
                  {hasDesign && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleToggleSite(!hasSite)}
                className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  hasSite
                    ? "bg-amber-50/70 border-amber-300 text-amber-900 shadow-sm"
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
                    hasSite ? "bg-amber-600 border-amber-600 text-white" : "border-border bg-white"
                  }`}
                >
                  {hasSite && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* Design Track Controls */}
          {hasDesign && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <span>🎨</span> Design Stage
                </span>
                <span className="text-xs font-bold text-rose-700">{designProgress}%</span>
              </div>
              <select
                value={designStage}
                onChange={(e) => setDesignStage(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-rose-200 bg-white px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="">Select design milestone...</option>
                {TRACK_STAGES.design.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={designProgress}
                  onChange={(e) => setDesignProgress(Number(e.target.value))}
                  className="w-full h-2 bg-rose-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
              </div>
            </div>
          )}

          {/* Site Track Controls */}
          {hasSite && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span>🏗️</span> Site Stage
                </span>
                <span className="text-xs font-bold text-amber-800">{siteProgress}%</span>
              </div>
              <select
                value={siteStage}
                onChange={(e) => setSiteStage(e.target.value)}
                className="w-full text-xs font-medium rounded-lg border border-amber-200 bg-white px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select site milestone...</option>
                {TRACK_STAGES.site.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={siteProgress}
                  onChange={(e) => setSiteProgress(Number(e.target.value))}
                  className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
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

          {/* Status Picker */}
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
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all text-center ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white text-text-secondary border-border hover:bg-surface-muted"
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-text-secondary hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 shadow-sm transition-all"
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
        </form>
      </div>
    </div>
  );
}
