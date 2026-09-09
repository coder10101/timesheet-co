import { Users } from "lucide-react";
import {
  getInitials,
  formatProjectDateNepali,
  formatRelativeTime,
} from "../../../../constants/projectPresets";
import { getEmployeeColor } from "../../../../constants/colors";

export function ProjectContributorsTab({
  contributorStats = [],
  totalHours = 0,
}) {
  if (contributorStats.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
        <Users size={28} className="mx-auto text-slate-300 stroke-1" />
        <p className="text-xs font-medium text-slate-600">
          No team contributions recorded yet
        </p>
        <p className="text-[11px] text-slate-400">
          Work logs tagged with this project automatically aggregate team effort here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {contributorStats.map((c) => {
        const pctOfTotal =
          totalHours > 0 ? Math.round((c.hours / totalHours) * 100) : 0;
        const deskPct =
          c.hours > 0 ? Math.round((c.deskHours / c.hours) * 100) : 0;
        const sitePct =
          c.hours > 0 ? Math.round((c.siteHours / c.hours) * 100) : 0;
        const avatarColor = getEmployeeColor(c.name);

        return (
          <div
            key={c.id || c.name}
            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-2xs"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitials(c.name)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                  <p className="text-[10px] text-slate-400">{c.role}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-slate-900">
                  {c.hours.toFixed(1)} hrs
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {pctOfTotal}% of total
                </span>
              </div>
            </div>

            {/* Effort breakdown */}
            <div className="space-y-1 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px] font-medium text-slate-500">
                <span className="text-[#514366]">🎨 Design: {c.deskHours.toFixed(1)}h ({deskPct}%)</span>
                <span className="text-teal-900">🏗️ Site: {c.siteHours.toFixed(1)}h ({sitePct}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-[#63537E]"
                  style={{ width: `${deskPct}%` }}
                />
                <div
                  className="h-full bg-teal-600"
                  style={{ width: `${sitePct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>{c.entriesCount} work log entries</span>
              {c.lastActive && (
                <span>
                  Active {formatRelativeTime(c.lastActive)} (
                  {formatProjectDateNepali(c.lastActive)})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
