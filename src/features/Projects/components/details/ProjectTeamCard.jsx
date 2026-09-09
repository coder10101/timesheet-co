import { Users, User } from "lucide-react";
import {
  getInitials,
  getAssignedRoleBadgeClass,
  getAssignedRoleBadgeText,
} from "../../../../constants/projectPresets";
import { getEmployeeColor } from "../../../../constants/colors";

export function ProjectTeamCard({
  leadArchitect,
  leadRole = "Design",
  subArchitects = [],
  config = {},
}) {
  const leadLabel = config.leadLabel || "Lead Architect";
  const subLeadLabel = config.subLeadLabel || "Sub-Architects";

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Architectural Team
          </h3>
        </div>
      </div>

      {/* Lead Architect */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
          {leadLabel}
        </span>
        {leadArchitect ? (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs"
                style={{ backgroundColor: getEmployeeColor(leadArchitect.name) }}
              >
                {getInitials(leadArchitect.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {leadArchitect.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {leadArchitect.email || leadArchitect.role || "Lead Architect"}
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border shadow-2xs shrink-0 ${getAssignedRoleBadgeClass(leadRole)}`}
              title={`Assigned Focus: ${leadRole}`}
            >
              {getAssignedRoleBadgeText(leadRole)}
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No lead architect assigned
          </div>
        )}
      </div>

      {/* Sub-Architects / Contributors */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          <span>{subLeadLabel}</span>
          <span>{subArchitects.length} assigned</span>
        </div>

        {subArchitects.length === 0 ? (
          <div className="p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
            No secondary architects assigned
          </div>
        ) : (
          <div className="space-y-2">
            {subArchitects.map((sub, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: getEmployeeColor(sub.name) }}
                  >
                    {getInitials(sub.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {sub.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {sub.isExternal
                        ? "External Collaborator"
                        : sub.role || "Architect"}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border shadow-2xs shrink-0 ${
                    sub.isExternal
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : getAssignedRoleBadgeClass(sub.assignedRole || "Design")
                  }`}
                  title={`Assigned Focus: ${sub.assignedRole || "Design"}`}
                >
                  {sub.isExternal
                    ? "External"
                    : getAssignedRoleBadgeText(sub.assignedRole || "Design")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
