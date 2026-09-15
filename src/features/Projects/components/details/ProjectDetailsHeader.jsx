import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import { getProjectTypeBadgeClass } from "../../../../constants/projectPresets";

export function ProjectDetailsHeader({
  project,
  isAdmin = false,
  canEdit = false,
  onOpenEdit,
  onOpenAddLog,
}) {
  if (!project) return null;

  const status = project.status || "Active";

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
      <div className="space-y-1.5">
        {/* BREADCRUMB */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Link
            to="/projects"
            className="hover:text-primary transition-colors flex items-center gap-1 text-slate-600"
          >
            <ArrowLeft size={13} />
            <span>Projects</span>
          </Link>
          <ChevronRight size={12} className="text-slate-400" />
          <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-none">
            {project.name}
          </span>
        </div>

        {/* TITLE & BADGES */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
              style={{ backgroundColor: project.color || "#63537E" }}
            />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {project.name}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${
                status === "Active" || status === "Ongoing"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : status === "Completed"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : status === "On Hold"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  status === "Active" || status === "Ongoing"
                    ? "bg-emerald-500"
                    : status === "Completed"
                      ? "bg-purple-500"
                      : status === "On Hold"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                }`}
              />
              {status}
            </span>

            {/* Project Type Badge */}
            {project.project_type && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shadow-2xs ${getProjectTypeBadgeClass(project.project_type)}`}
              >
                {project.project_type}
              </span>
            )}

            {/* Payment Remaining Badge — admin only */}
            {isAdmin && (project.payment_remaining ||
              project.payment_status === "Payment Remaining") && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs"
                title={`Payment Remaining: ${project.payment_remaining || "Pending"}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>
                  💳 Payment Due{project.payment_remaining ? `: ₨ ${project.payment_remaining}` : ""}
                </span>
              </span>
            )}
          </div>
        </div>

        {project.project_work && (
          <p className="text-xs text-slate-500 max-w-2xl">
            {project.project_work}
          </p>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center gap-2 self-start md:self-center shrink-0">
        {canEdit && (
          <button
            type="button"
            onClick={onOpenEdit}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-xl bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Pencil size={13} />
            <span>Edit Project</span>
          </button>
        )}
        {!isAdmin && (
          <button
            type="button"
            onClick={onOpenAddLog}
            className="h-9 flex items-center gap-1.5 px-4 rounded-xl bg-primary hover:bg-primary/90 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Log Work</span>
          </button>
        )}
      </div>
    </div>
  );
}
