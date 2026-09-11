import {
  CalendarDays,
  Clock,
  Briefcase,
  Layers,
  AlertTriangle,
} from "lucide-react";
import {
  formatProjectDateNepali,
  calculateOverallProgress,
  getStageDefaultProgress,
} from "../../../../constants/projectPresets";

export function ProjectSnapshotCard({
  project,
  config = {},
  urgency,
  totalHours = 0,
  uniqueContributors = 0,
  designArchitects = [],
  siteArchitects = [],
  canEdit = false,
  onOpenEdit,
}) {
  if (!project) return null;

  const stageLabel = config.stageLabel || "Stage";
  const hasD =
    project.has_design !== false &&
    project.hasDesign !== false &&
    Boolean(
      project.design_stage ||
      project.lead_architect_role === "Design" ||
      project.lead_architect_role === "Both" ||
      Number(project.design_progress) > 0,
    );

  const hasS =
    project.has_site !== false &&
    project.hasSite !== false &&
    Boolean(
      project.site_stage ||
      project.lead_architect_role === "Site" ||
      project.lead_architect_role === "Both" ||
      Number(project.site_progress) > 0,
    );

  const overallProgress =
    hasD || hasS
      ? calculateOverallProgress({
          designProgress: project.design_progress,
          siteProgress: project.site_progress,
          hasDesign: hasD,
          hasSite: hasS,
          manualProgress: project.progress,
        })
      : project.progress !== undefined && project.progress !== null
        ? Number(project.progress)
        : getStageDefaultProgress(project.current_stage, project.status);

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* 4 KPI METRIC TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Tile 1: Stage & Progress (Balanced & Sleek) */}
        <div
          onClick={() => canEdit && onOpenEdit && onOpenEdit()}
          className={`bg-slate-50/70 border border-slate-200/70 rounded-2xl p-3 sm:p-3.5 transition-all ${
            canEdit ? "hover:border-slate-300 cursor-pointer" : ""
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
              {stageLabel} & Progress
            </span>
            <Layers size={14} className="text-slate-400" />
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span
              className="text-xs sm:text-sm font-semibold text-slate-900 truncate"
              title={project.current_stage || "Not Started"}
            >
              {project.current_stage || "Not Started"}
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-200/60 px-1.5 py-0.5 rounded shrink-0">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {(project.payment_remaining ||
            project.payment_status === "Payment Remaining") && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200/80 truncate">
              <span>💳</span>
              <span className="truncate">
                Payment Due
                {project.payment_remaining
                  ? `: ₨ ${project.payment_remaining}`
                  : ""}
              </span>
            </div>
          )}
        </div>

        {/* Tile 2: Start Date */}
        <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-3 sm:p-3.5">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider">
              Start Date (BS)
            </span>
            <CalendarDays size={14} className="text-slate-400" />
          </div>
          <div className="mt-1">
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              {formatProjectDateNepali(project.start_date)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Kickoff & initiation
            </p>
          </div>
        </div>

        {/* Tile 3: Target Deadline */}
        <div
          className={`rounded-2xl p-3 sm:p-3.5 border transition-all ${
            urgency?.type === "urgent"
              ? "bg-amber-50/60 border-amber-200/80"
              : urgency?.type === "delayed"
                ? "bg-rose-50/60 border-rose-200/80"
                : "bg-slate-50/70 border-slate-200/70"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${
                urgency?.type === "urgent"
                  ? "text-amber-800"
                  : urgency?.type === "delayed"
                    ? "text-rose-800"
                    : "text-slate-500"
              }`}
            >
              Deadline (BS)
            </span>
            {urgency?.type === "urgent" || urgency?.type === "delayed" ? (
              <AlertTriangle
                size={14}
                className={
                  urgency.type === "urgent"
                    ? "text-amber-600 animate-pulse"
                    : "text-rose-600"
                }
              />
            ) : (
              <Clock size={14} className="text-slate-400" />
            )}
          </div>
          <div className="mt-1">
            <p
              className={`text-xs sm:text-sm font-semibold ${
                urgency?.type === "urgent"
                  ? "text-amber-950"
                  : urgency?.type === "delayed"
                    ? "text-rose-950"
                    : "text-slate-900"
              }`}
            >
              {formatProjectDateNepali(project.end_date || project.deadline)}
            </p>
            <p
              className={`text-[10px] font-semibold mt-0.5 ${
                urgency?.type === "urgent"
                  ? "text-amber-700"
                  : urgency?.type === "delayed"
                    ? "text-rose-700"
                    : "text-slate-400"
              }`}
            >
              {urgency?.label || "On schedule"}
            </p>
          </div>
        </div>
      </div>

      {/* DUAL-TRACK EXECUTION STREAMS (DESIGN & SITE) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
        {/* 1. Design Track */}
        <div className="p-3.5 rounded-2xl bg-[#63537E]/5 border border-[#63537E]/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-[#514366]">
                🎨 Design Track
              </span>
              {project.design_stage && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#63537E]/10 text-[#514366] border border-[#63537E]/25 truncate max-w-[150px]">
                  {project.design_stage}
                </span>
              )}
            </div>
            <span className="text-xs font-mono font-bold text-[#514366]">
              {project.design_progress ?? 0}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-[#63537E]/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#63537E] rounded-full transition-all duration-300"
              style={{ width: `${project.design_progress ?? 0}%` }}
            />
          </div>

          {designArchitects.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-slate-500 flex-wrap">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Team:
              </span>
              {designArchitects.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border border-[#63537E]/20 text-[#514366]"
                >
                  <span>{a.name}</span>
                  {a.isLead && (
                    <span className="text-[8px] font-bold text-[#63537E] uppercase">
                      Lead
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2. Site Track */}
        <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-teal-900">
                🏗️ Site Track
              </span>
              {project.site_stage && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-900 border border-teal-200 truncate max-w-[150px]">
                  {project.site_stage}
                </span>
              )}
            </div>
            <span className="text-xs font-mono font-bold text-teal-800">
              {project.site_progress ?? 0}%
            </span>
          </div>

          <div className="w-full h-1.5 bg-teal-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-300"
              style={{ width: `${project.site_progress ?? 0}%` }}
            />
          </div>

          {siteArchitects.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5 text-[11px] text-slate-500 flex-wrap">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Team:
              </span>
              {siteArchitects.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white border border-teal-200 text-teal-900"
                >
                  <span>{a.name}</span>
                  {a.isLead && (
                    <span className="text-[8px] font-bold text-teal-700 uppercase">
                      Lead
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
