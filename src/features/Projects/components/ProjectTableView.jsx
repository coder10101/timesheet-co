import { Link } from "react-router-dom";
import { Eye, Pencil, Trash2, CheckCheck } from "lucide-react";
import {
  getInitials,
  formatProjectDateNepali,
  formatRelativeTime,
  getProjectTypeBadgeClass,
  getAssignedRoleBadgeClass,
  getAssignedRoleBadgeText,
  calculateOverallProgress,
  getStageDefaultProgress,
} from "../../../constants/projectPresets";
import { ProjectTrackBadges, ProjectDeadlineBadge } from "./ProjectTrackBadges";
import { getLeadName, getSubArchitectsList } from "../utils/projectHelpers";
import { useColumnVisibility } from "../../../hooks/useColumnVisibility";
import { PROJECT_TABLE_COLUMNS } from "../../../constants/projectTableColumns";
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";

/** Stages that indicate a project has been handed over / completed on-site. */
const HANDED_OVER_STAGES = ["Handover Complete", "Final Payment"];

function isHandedOver(project) {
  const stage = (project.current_stage || "").trim();
  const siteStage = (project.site_stage || "").trim();
  return (
    HANDED_OVER_STAGES.includes(stage) || HANDED_OVER_STAGES.includes(siteStage)
  );
}

export function ProjectTableView({
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
  const stageLabel = config.stageLabel || "Stage";

  const { isVisible, toggleColumn, resetColumns } = useColumnVisibility(
    "projects-table",
    PROJECT_TABLE_COLUMNS,
  );

  // Split into active and handed-over groups
  const activeProjects = projects.filter((p) => !isHandedOver(p));
  const handedOverProjects = projects.filter((p) => isHandedOver(p));

  /** Renders a single table row for a project */
  function renderRow(p) {
    const stats = projectStats?.get ? projectStats.get(p.id) : null;
    const currentStatus = stats?.status || p.status || "Active";
    const leadName = getLeadName(p, empMap);
    const leadEmp = p.lead_architect_id && empMap?.get ? empMap.get(p.lead_architect_id) : null;
    const isLeadInactive = leadEmp ? leadEmp.is_active === false : false;
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
      <tr
        key={p.id}
        className="hover:bg-slate-50/70 transition-colors group"
      >
        {/* 1. PROJECT LIST (NAME + WORK & TYPE PILL) */}
        {isVisible("project") && (
          <td className="py-3.5 px-4 min-w-[220px]">
            <div className="flex items-start gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                style={{ backgroundColor: p.color || "#63537E" }}
              />
              <div className="min-w-0">
                <Link
                  to={`/projects/${p.id}`}
                  className="font-bold text-slate-900 hover:text-primary text-xs block truncate max-w-[220px] transition-colors"
                  title={`View ${p.name} details & logs`}
                >
                  {p.name}
                </Link>
                <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                  {p.project_work ? (
                    <span
                      className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]"
                      title={p.project_work}
                    >
                      {p.project_work}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-normal">
                      General Work
                    </span>
                  )}
                  {p.project_type && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold border shadow-2xs shrink-0 ${getProjectTypeBadgeClass(p.project_type)}`}
                    >
                      {p.project_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>
        )}

        {/* 2. ARCHITECTS & ASSIGNED SCOPE UNDER EMPLOYEE */}
        {isVisible("team") && (
          <td className="py-3.5 px-3.5">
            <div className="flex items-start gap-2.5 flex-wrap">
              {leadName ? (
                <div className="flex flex-col items-start gap-1 group/arch relative">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                      isLeadInactive
                        ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                        : "bg-slate-100 text-slate-800 border border-slate-300/80 hover:bg-slate-200/80"
                    }`}
                    title={`Lead ${leadLabel}: ${leadName}${isLeadInactive ? " (Inactive)" : ""}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLeadInactive ? "bg-rose-500" : "bg-slate-400"}`} />
                    <span>{getInitials(leadName)}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {isLeadInactive ? "Inactive Lead" : "Lead"}
                    </span>
                  </span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border shadow-2xs ${getAssignedRoleBadgeClass(p.lead_architect_role || "Design")}`}
                    title={`Lead Scope: ${p.lead_architect_role || "Design"}`}
                  >
                    {getAssignedRoleBadgeText(
                      p.lead_architect_role || "Design",
                    )}
                  </span>
                  <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/arch:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                    <span>
                      Lead {leadLabel}: {leadName}
                      {isLeadInactive ? " (Inactive)" : ""}
                    </span>
                    <span className="text-slate-400 font-bold">
                      • {p.lead_architect_role || "Design"}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 text-xs font-normal">
                  —
                </span>
              )}

              {subs.length > 0 &&
                subs.map((s, idx) => {
                  const sName = typeof s === "object" ? s.name : s;
                  const sRole =
                    typeof s === "object" ? s.role : "Design";
                  const isExt = Boolean(
                    typeof s === "object" && s.isExternal,
                  );
                  const isInactive =
                    typeof s === "object" && s.isActive === false;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-start gap-1 group/sub relative"
                    >
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          isInactive
                            ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                            : isExt
                              ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                              : "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                        title={
                          isInactive
                            ? `Inactive Contributor: ${sName}`
                            : isExt
                              ? `External Collaborator: ${sName}`
                              : `Sub-${leadLabel}: ${sName}`
                        }
                      >
                        <span>{getInitials(sName)}</span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider ${
                            isInactive
                              ? "text-rose-600"
                              : isExt
                                ? "text-amber-700"
                                : "text-slate-400"
                          }`}
                        >
                          {isInactive ? "Inactive" : isExt ? "Ext" : "Sub"}
                        </span>
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border shadow-2xs ${
                          isExt
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : getAssignedRoleBadgeClass(sRole)
                        }`}
                        title={
                          isExt
                            ? `External Collaborator: ${sName}`
                            : `Sub Scope: ${sRole}`
                        }
                      >
                        {isExt
                          ? "External"
                          : getAssignedRoleBadgeText(sRole)}
                      </span>
                      <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover/sub:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-md whitespace-nowrap z-30 pointer-events-none">
                        <span>
                          {isExt
                            ? "External Collaborator"
                            : `Sub-${leadLabel}`}
                          : {sName}
                        </span>
                        {!isExt && (
                          <span className="text-slate-400 font-bold">
                            • {sRole}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </td>
        )}

        {/* 3. CURRENT STAGE */}
        {isVisible("stage") && (
          <td className="py-3.5 px-3">
            <button
              type="button"
              onClick={() => onOpenStage && onOpenStage(p)}
              className="inline-flex items-center gap-1.5 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer group/stage text-left"
              title="Click to edit or choose stage"
            >
              <ProjectTrackBadges project={p} compact={true} />
              <Pencil
                size={11}
                className="text-slate-400 opacity-60 shrink-0 ml-0.5 group-hover/stage:opacity-100 group-hover/stage:text-primary transition-colors"
              />
            </button>
          </td>
        )}

        {/* 4. START DATE */}
        {isVisible("startDate") && (
          <td className="py-3.5 px-3 text-slate-700 text-xs whitespace-nowrap">
            <span className="font-medium" title={p.start_date}>
              {formatProjectDateNepali(p.start_date)}
            </span>
          </td>
        )}

        {/* 5. DEADLINE */}
        {isVisible("deadline") && (
          <td className="py-3.5 px-3 whitespace-nowrap">
            <ProjectDeadlineBadge
              deadline={p.end_date || p.deadline}
              status={p.status}
              onClick={() => onOpenDeadline && onOpenDeadline(p)}
            />
          </td>
        )}

        {/* 6. PAYMENT REMAINING — admin only */}
        {isAdmin && isVisible("payment") && (
          <td className="py-3.5 px-3 whitespace-nowrap">
            {p.payment_remaining ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs"
                title={`Payment Remaining: ₨ ${p.payment_remaining}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                <span>₨ {p.payment_remaining}</span>
                <span className="text-[10px] font-bold text-amber-700 uppercase">
                  Due
                </span>
              </span>
            ) : p.payment_status === "Payment Remaining" ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Payment Due</span>
              </span>
            ) : p.payment_status === "Paid" ||
              p.payment_status === "Paid in Full" ||
              p.payment_status === "Cleared" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <span>✓</span>
                <span>Paid</span>
              </span>
            ) : (
              <span className="text-slate-400 text-xs font-normal">
                —
              </span>
            )}
          </td>
        )}

        {/* 7. PROJECT STATUS & PROGRESS */}
        {isVisible("status") && (
          <td className="py-3.5 px-3 whitespace-nowrap">
            <div
              onClick={() => {
                if (isAdmin && onOpenStatus) {
                  onOpenStatus(p);
                }
              }}
              className={`flex flex-col gap-1 items-start text-left p-1 rounded-lg transition-colors ${
                isAdmin && onOpenStatus
                  ? "cursor-pointer group/stat hover:bg-slate-50"
                  : ""
              }`}
              title={
                isAdmin
                  ? "Click to update status and progress"
                  : `${currentStatus} • ${progressPct}% completed`
              }
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      currentStatus === "Active" ||
                      currentStatus === "Ongoing"
                        ? "bg-emerald-500"
                        : currentStatus === "Completed"
                          ? "bg-purple-500"
                          : currentStatus === "On Hold"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                    }`}
                  />
                  {currentStatus}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {progressPct}%
                </span>
              </div>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    currentStatus === "Completed"
                      ? "bg-purple-500"
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
              {(p.design_stage ||
                p.site_stage ||
                Number(p.design_progress) > 0 ||
                Number(p.site_progress) > 0) && (
                <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500 pt-0.5">
                  {(p.design_stage ||
                    Number(p.design_progress) > 0) && (
                    <span className="text-[#514366] bg-[#63537E]/10 px-1 rounded">
                      🎨 {p.design_progress ?? 0}%
                    </span>
                  )}
                  {p.site_stage && (
                    <span className="text-teal-900 bg-teal-50 px-1 rounded">
                      🏗️ {p.site_progress ?? 0}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </td>
        )}

        {/* 8. LAST UPDATED */}
        {isVisible("updated") && (
          <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 text-[11px]">
            <span
              className="font-medium text-slate-600"
              title={p.updated_at || p.created_at || "Recently"}
            >
              {formatRelativeTime(p.updated_at || p.created_at)}
            </span>
          </td>
        )}

        {/* 9. ACTIONS */}
        {isVisible("actions") && (
          <td className="py-3.5 px-4 text-right whitespace-nowrap">
            <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <Link
                to={`/projects/${p.id}`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
                title="View Project Overview & Work Logs"
              >
                <Eye size={14} />
              </Link>
              {isAdmin && (
                <>
                  <button
                    onClick={() => onEditProject && onEditProject(p)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                    title="Edit Project Details"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() =>
                      onDeleteProject && onDeleteProject(p.id, p.name)
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Delete Project"
                  >
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  }

  /** Renders a section-divider row spanning all columns */
  function renderSectionHeader(label, count, icon) {
    return (
      <tr key={`section-${label}`}>
        <td
          colSpan={99}
          className="px-4 py-2 bg-slate-100/80 border-y border-slate-200"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              {label}
            </span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
              {count}
            </span>
          </div>
        </td>
      </tr>
    );
  }

  // For non-admins, strip out the payment column from the menu entirely
  const visibleColumnDefs = isAdmin
    ? PROJECT_TABLE_COLUMNS
    : PROJECT_TABLE_COLUMNS.filter((c) => c.id !== "payment");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-end px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
        <ColumnVisibilityMenu
          columns={visibleColumnDefs}
          isVisible={isVisible}
          toggleColumn={toggleColumn}
          resetColumns={resetColumns}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              {isVisible("project") && (
                <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">
                  Project List
                </th>
              )}
              {isVisible("team") && (
                <th className="py-3.5 px-3.5 whitespace-nowrap min-w-[180px]">
                  {leadLabel}s &amp; Team
                </th>
              )}
              {isVisible("stage") && (
                <th className="py-3.5 px-3 whitespace-nowrap">{stageLabel}</th>
              )}
              {isVisible("startDate") && (
                <th className="py-3.5 px-3 whitespace-nowrap">Start Date</th>
              )}
              {isVisible("deadline") && (
                <th className="py-3.5 px-3 whitespace-nowrap">Deadline</th>
              )}
              {isAdmin && isVisible("payment") && (
                <th className="py-3.5 px-3 whitespace-nowrap">
                  Payment Remaining
                </th>
              )}
              {isVisible("status") && (
                <th className="py-3.5 px-3 whitespace-nowrap">
                  Project Status
                </th>
              )}
              {isVisible("updated") && (
                <th className="py-3.5 px-3 whitespace-nowrap">Last Updated</th>
              )}
              {isVisible("actions") && (
                <th className="py-3.5 px-4 text-right whitespace-nowrap">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Active projects */}
            {activeProjects.length > 0 && handedOverProjects.length > 0 &&
              renderSectionHeader(
                "Active Projects",
                activeProjects.length,
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />,
              )}
            {activeProjects.map((p) => renderRow(p))}

            {/* Handed Over / Completed section */}
            {handedOverProjects.length > 0 && (
              <>
                {renderSectionHeader(
                  "Handed Over",
                  handedOverProjects.length,
                  <CheckCheck size={13} className="text-purple-500 shrink-0" />,
                )}
                {handedOverProjects.map((p) => renderRow(p))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
