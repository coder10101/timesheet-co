import React from "react";
import { getDeadlineUrgency, formatProjectDateNepali, getInitials, getAssignedRoleBadgeText, getAssignedRoleBadgeClass } from "../../../constants/projectPresets";
import { Clock, Users } from "lucide-react";

/**
 * Reusable badge & progress component for dual-track architectural projects.
 */
export function ProjectTrackBadges({ project, compact = false }) {
  if (!project) return null;

  const hasDesign = project.has_design !== false && project.hasDesign !== false;
  const hasSite = project.has_site !== false && project.hasSite !== false;

  const dStage = project.design_stage;
  const dProg = Number(project.design_progress) || 0;

  const sStage = project.site_stage;
  const sProg = Number(project.site_progress) || 0;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {hasDesign && dStage && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
            <span>🎨</span>
            <span className="truncate max-w-[120px]">{dStage}</span>
            <span className="text-rose-500 font-bold ml-0.5">{dProg}%</span>
          </span>
        )}
        {hasSite && sStage && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
            <span>🏗️</span>
            <span className="truncate max-w-[120px]">{sStage}</span>
            <span className="text-amber-600 font-bold ml-0.5">{sProg}%</span>
          </span>
        )}
        {!dStage && !sStage && project.current_stage && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {project.current_stage}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {hasDesign && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-rose-50 text-rose-800 border border-rose-200">
            <span className="text-sm">🎨</span>
            <span>Design: <strong className="font-semibold">{dStage || "In Planning"}</strong> ({dProg}%)</span>
          </span>
        )}
        {hasSite && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium bg-amber-50 text-amber-900 border border-amber-200">
            <span className="text-sm">🏗️</span>
            <span>Site: <strong className="font-semibold">{sStage || "Not Started"}</strong> ({sProg}%)</span>
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Deadline Badge with urgency pulse and Nepali date formatting
 */
export function ProjectDeadlineBadge({ deadline, status, onClick }) {
  const urgency = getDeadlineUrgency(deadline, status);
  const formattedNepali = formatProjectDateNepali(deadline);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${urgency.badgeClass} ${
        onClick ? "hover:shadow-sm cursor-pointer" : "cursor-default"
      }`}
      title={deadline ? `Deadline: ${formattedNepali} (${urgency.label})` : "Click to set deadline"}
    >
      <Clock className="w-3.5 h-3.5 opacity-70" />
      <span>{deadline ? formattedNepali : "Set Deadline"}</span>
      {urgency.type !== "none" && urgency.type !== "completed" && (
        <span className="font-semibold opacity-90">· {urgency.label}</span>
      )}
    </button>
  );
}
