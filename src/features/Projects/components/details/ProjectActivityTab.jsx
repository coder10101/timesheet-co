import { Search, X, History, ArrowRight } from "lucide-react";
import {
  formatProjectDateNepali,
  formatRelativeTime,
  getInitials,
} from "../../../../constants/projectPresets";
import { getActivityMeta } from "../../utils/projectHelpers";

export function ProjectActivityTab({
  filteredActivities = [],
  activityFilter = "all",
  setActivityFilter,
  activitySearchQuery = "",
  setActivitySearchQuery,
}) {
  const filterPills = [
    { id: "all", label: "All Events" },
    { id: "stage", label: "Stages" },
    { id: "deadline", label: "Deadlines" },
    { id: "status", label: "Status & Progress" },
  ];

  return (
    <div className="space-y-4">
      {/* FILTERS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
        {/* Search box */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search activity history..."
            value={activitySearchQuery}
            onChange={(e) => setActivitySearchQuery(e.target.value)}
            className="w-full h-8.5 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary outline-none"
          />
          {activitySearchQuery && (
            <button
              onClick={() => setActivitySearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {filterPills.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActivityFilter(f.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activityFilter === f.id
                  ? "bg-slate-900 text-white font-semibold shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVITY TIMELINE STREAM */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-12 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
          <History size={28} className="mx-auto text-slate-300 stroke-1" />
          <p className="text-xs font-medium text-slate-600">
            No activity records match your criteria
          </p>
          <p className="text-[11px] text-slate-400">
            Stage transitions, deadline adjustments, and progress edits are logged automatically.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {filteredActivities.map((act, index) => {
            const meta = getActivityMeta(act.type);
            const Icon = meta.icon;
            const timeStr = act.created_at || act.timestamp;

            return (
              <div key={act.id || index} className="relative group">
                {/* Bullet icon */}
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border flex items-center justify-center shadow-2xs ${meta.color}`}
                >
                  <Icon size={11} />
                </div>

                {/* Event card */}
                <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {act.title}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${meta.pill}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    {/* Date & relative time */}
                    <div className="text-right text-[10px] text-slate-400 shrink-0">
                      <span className="font-medium text-slate-600 block">
                        {formatProjectDateNepali(timeStr)}
                      </span>
                      <span>{formatRelativeTime(timeStr)}</span>
                    </div>
                  </div>

                  {/* Description */}
                  {act.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {act.description}
                    </p>
                  )}

                  {/* Old vs New visual transition badges */}
                  {act.old_value !== undefined &&
                    act.new_value !== undefined &&
                    act.old_value !== act.new_value && (
                      <div className="flex items-center gap-2 text-xs pt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 line-through text-[11px]">
                          {String(act.old_value || "None")}
                        </span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold text-[11px]">
                          {String(act.new_value)}
                        </span>
                      </div>
                    )}

                  {/* Author Footer */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[9px] font-bold">
                        {getInitials(act.user_name || "System")}
                      </div>
                      <span className="font-medium text-slate-700">
                        {act.user_name || "System"}
                      </span>
                      {act.user_role && (
                        <span className="text-slate-400">
                          • {act.user_role}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
