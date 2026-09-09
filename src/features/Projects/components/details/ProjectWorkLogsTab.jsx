import { Search, X, Filter, Clock, MapPin, Plus } from "lucide-react";
import {
  getInitials,
  formatProjectDateNepali,
  formatRelativeTime,
} from "../../../../constants/projectPresets";
import { getEmployeeColor } from "../../../../constants/colors";

export function ProjectWorkLogsTab({
  filteredLogs = [],
  contributorStats = [],
  logSearchQuery = "",
  setLogSearchQuery,
  logMemberFilter = "all",
  setLogMemberFilter,
  logTypeFilter = "all",
  setLogTypeFilter,
  isAdmin = false,
  onOpenAddLog,
}) {
  return (
    <div className="space-y-4">
      {/* FILTERS BAR: SEARCH BOX & MEMBER DROPDOWN SIZED PROMINENTLY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        {/* Search box - spacious and clear */}
        <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search work logs by keyword or member..."
            value={logSearchQuery}
            onChange={(e) => setLogSearchQuery(e.target.value)}
            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-8 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary outline-none transition-colors"
          />
          {logSearchQuery && (
            <button
              onClick={() => setLogSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Contributor dropdown - spacious & readable */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 text-sm text-slate-700 shadow-2xs">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={logMemberFilter}
              onChange={(e) => setLogMemberFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-slate-800 outline-none cursor-pointer pr-1"
            >
              <option value="all">All Members</option>
              {contributorStats.map((c) => (
                <option key={c.id || c.name} value={c.id || c.name}>
                  {c.name} ({c.hours}h)
                </option>
              ))}
            </select>
          </div>

          {/* Mode filter pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/70 h-10">
            {[
              { id: "all", label: "All" },
              { id: "desk", label: "🎨 Desk / Design" },
              { id: "site", label: "🏗️ Site Visit" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLogTypeFilter(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  logTypeFilter === p.id
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LOGS LIST */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 space-y-2.5 border border-dashed border-slate-200 rounded-2xl">
          <Clock size={32} className="mx-auto text-slate-300 stroke-1" />
          <p className="text-sm font-semibold text-slate-700">
            No work logs recorded yet
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {logSearchQuery ||
            logMemberFilter !== "all" ||
            logTypeFilter !== "all"
              ? "No entries match your active search or filters."
              : "Keep this project up to date by logging daily site visits or design drafting tasks."}
          </p>
          {/* Prominent Log Work Now Button - Employee side only */}
          {!isAdmin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenAddLog}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/95 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>Log Work Now</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5 divide-y divide-slate-100">
          {filteredLogs.map((log) => {
            const isSite =
              (log.work_type || "").toLowerCase() === "site" ||
              Boolean(log.entry_text && log.entry_text.includes("[Site Visit]"));
            const empName = log.employeeName || "Team Member";
            const avatarColor = getEmployeeColor(empName);

            return (
              <div
                key={log.id}
                className="pt-3 first:pt-0 flex items-start justify-between gap-3 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {/* Member Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white shadow-2xs mt-0.5"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(empName)}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-slate-900">
                        {empName}
                      </span>
                      {log.employeeRole && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          • {log.employeeRole}
                        </span>
                      )}

                      {/* Mode pill */}
                      {isSite ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-teal-50 text-teal-900 border border-teal-200">
                          <MapPin size={10} />
                          <span>Site Visit</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#63537E]/10 text-[#514366] border border-[#63537E]/25">
                          <span>🎨 Desk Work</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed break-words">
                      {log.entry_text}
                    </p>
                  </div>
                </div>

                {/* Date & Hours Badge */}
                <div className="flex flex-col items-end shrink-0 text-right space-y-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-mono font-bold">
                    {parseFloat(log.hours_spent) || 0} hrs
                  </span>
                  <span
                    className="text-[10px] text-slate-400 font-medium"
                    title={log.date}
                  >
                    {formatProjectDateNepali(log.date)}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {formatRelativeTime(log.created_at || log.date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
