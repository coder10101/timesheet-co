import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import {
  getProjectTypeBadgeClass,
  getAssignedRoleBadgeClass,
  getAssignedRoleBadgeText,
  calculateOverallProgress,
  getStageDefaultProgress,
} from "../../../constants/projectPresets";
import {
  ProjectTrackBadges,
  ProjectDeadlineBadge,
} from "./ProjectTrackBadges";
import { getLeadName, getSubArchitectsList } from "../utils/projectHelpers";

export function ProjectCardGrid({
  projects = [],
  projectStats,
  empMap,
  config = {},
  isAdmin = false,
  onOpenStage,
  onOpenDeadline,
  onOpenStatus,
  onEditProject,
  onDeleteProject,
}) {
  const leadLabel = config.leadLabel || "Architect";
  const subLeadLabel = config.subLeadLabel || "Team";
  const stageLabel = config.stageLabel || "Stage";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((p) => {
        const stats = projectStats?.get ? projectStats.get(p.id) : null;
        const currentStatus = stats?.status || p.status || "Active";
        const leadName = getLeadName(p, empMap);
        const subs = getSubArchitectsList(p, empMap, projectStats);

        const hasD = Boolean(
          p.design_stage ||
            p.lead_architect_role === "Design" ||
            p.lead_architect_role === "Both" ||
            Number(p.design_progress) > 0,
        );
        const hasS = Boolean(
          p.site_stage ||
            p.lead_architect_role === "Site" ||
            p.lead_architect_role === "Both" ||
            Number(p.site_progress) > 0,
        );
        const progressPct =
          hasD || hasS
            ? calculateOverallProgress({
                designProgress: p.design_progress,
                siteProgress: p.site_progress,
                hasDesign: hasD,
                hasSite: hasS,
                manualProgress: p.progress,
              })
            : p.progress !== undefined && p.progress !== null
              ? Number(p.progress)
              : getStageDefaultProgress(p.current_stage, p.status);

        return (
          <div
            key={p.id}
            className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* HEADER */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: p.color || "#63537E" }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      <Link
                        to={`/projects/${p.id}`}
                        className="hover:text-primary transition-colors"
                        title={`View ${p.name} details & logs`}
                      >
                        {p.name}
                      </Link>
                    </h3>
                    <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                      {p.project_work && (
                        <span className="text-[11px] text-slate-500 font-normal">
                          {p.project_work}
                        </span>
                      )}
                      {p.project_type && (
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${getProjectTypeBadgeClass(p.project_type)}`}
                        >
                          {p.project_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdmin && onOpenStatus) onOpenStatus(p);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 transition-transform ${
                      isAdmin && onOpenStatus
                        ? "cursor-pointer hover:scale-105"
                        : "cursor-default"
                    } ${
                      currentStatus === "Active" || currentStatus === "Ongoing"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : currentStatus === "Completed"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : currentStatus === "On Hold"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                    title={
                      isAdmin
                        ? "Click to update status and progress"
                        : currentStatus
                    }
                  >
                    {currentStatus}
                  </button>
                  {(p.payment_remaining ||
                    p.payment_status === "Payment Remaining") && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs shrink-0 flex items-center gap-0.5"
                      title={`Payment Remaining: ${p.payment_remaining || "Pending"}`}
                    >
                      <span>💳</span>
                      <span>{p.payment_remaining ? `₨ ${p.payment_remaining}` : "Due"}</span>
                    </span>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditProject && onEditProject(p)}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 cursor-pointer"
                        title="Edit Project"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() =>
                          onDeleteProject && onDeleteProject(p.id, p.name)
                        }
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* STAGE & DEADLINE */}
              <div className="pt-1 flex flex-col gap-2">
                <div className="flex items-start justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium shrink-0 pt-0.5">
                    {stageLabel}:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenStage && onOpenStage(p)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-left transition-colors cursor-pointer group/stg"
                      title="Click to update stage"
                    >
                      <ProjectTrackBadges project={p} compact={true} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Deadline:
                  </span>
                  <ProjectDeadlineBadge
                    deadline={p.end_date || p.deadline}
                    status={p.status}
                    onClick={() => onOpenDeadline && onOpenDeadline(p)}
                  />
                </div>

                {/* Overall Progress Meter */}
                <div
                  onClick={() => {
                    if (isAdmin && onOpenStatus) onOpenStatus(p);
                  }}
                  className={`space-y-1.5 pt-1 p-1.5 rounded-lg transition-colors ${
                    isAdmin && onOpenStatus
                      ? "cursor-pointer group/prog hover:bg-slate-50"
                      : ""
                  }`}
                  title={
                    isAdmin
                      ? "Click to update status and progress"
                      : `${progressPct}% complete`
                  }
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium group-hover/prog:text-primary transition-colors">
                      Overall Progress
                    </span>
                    <span className="font-bold text-slate-800">
                      {progressPct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentStatus === "Completed"
                          ? "bg-purple-600"
                          : currentStatus === "On Hold"
                            ? "bg-amber-500"
                            : currentStatus === "Delayed"
                              ? "bg-rose-500"
                              : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, progressPct))}%`,
                      }}
                    />
                  </div>

                  {/* Dual-track Mini Progress Cards */}
                  {(p.design_stage ||
                    p.site_stage ||
                    Number(p.design_progress) > 0 ||
                    Number(p.site_progress) > 0) && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100/80 text-[10px]">
                      <div className="bg-[#63537E]/10 p-1.5 rounded-md border border-[#63537E]/20">
                        <div className="flex justify-between text-[#514366] font-semibold mb-0.5">
                          <span>🎨 Design</span>
                          <span>{p.design_progress ?? 0}%</span>
                        </div>
                        <div className="w-full h-1 bg-[#63537E]/15 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#63537E] rounded-full"
                            style={{ width: `${p.design_progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-teal-50 p-1.5 rounded-md border border-teal-200/80">
                        <div className="flex justify-between text-teal-900 font-semibold mb-0.5">
                          <span>🏗️ Site</span>
                          <span>{p.site_progress ?? 0}%</span>
                        </div>
                        <div className="w-full h-1 bg-teal-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-600 rounded-full"
                            style={{ width: `${p.site_progress ?? 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                    {leadLabel}:
                  </span>
                  {leadName ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs truncate max-w-[200px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span className="truncate">{leadName}</span>
                      <span
                        className={`px-1 py-0.1 rounded text-[9px] font-bold shrink-0 ${getAssignedRoleBadgeClass(p.lead_architect_role || "Design")}`}
                      >
                        {p.lead_architect_role || "Design"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">
                      Unassigned
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {stats?.entryCount ?? 0} logs
                </span>
              </div>

              {subs.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-0.5">
                  <span className="text-[10px] font-medium text-slate-400 shrink-0 uppercase tracking-wider">
                    {subLeadLabel}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {subs.slice(0, 3).map((s, idx) => {
                      const sName = typeof s === "object" ? s.name : s;
                      const sRole = typeof s === "object" ? s.role : "Design";
                      const isExt = Boolean(
                        typeof s === "object" && s.isExternal,
                      );
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border truncate max-w-[150px] ${
                            isExt
                              ? "bg-amber-50 text-amber-900 border-amber-200"
                              : "bg-slate-50 text-slate-700 border-slate-200/80"
                          }`}
                          title={
                            isExt
                              ? `External Collaborator: ${sName}`
                              : `${sName} (${sRole})`
                          }
                        >
                          <span className="truncate">{sName}</span>
                          <span
                            className={`px-1 py-0.1 rounded text-[8px] font-bold ${
                              isExt
                                ? "bg-amber-100 text-amber-800"
                                : getAssignedRoleBadgeClass(sRole)
                            }`}
                          >
                            {isExt ? "Ext" : sRole}
                          </span>
                        </span>
                      );
                    })}
                    {subs.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-medium self-center">
                        +{subs.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
