import { Search, X, Table as TableIcon, LayoutGrid } from "lucide-react";

export function ProjectToolbar({
  searchQuery = "",
  onSearchChange,
  statusFilter = "all",
  onStatusFilterChange,
  viewMode = "table",
  onViewModeChange,
  leadLabel = "Architect",
  // Optional for Employee view:
  tab,
  onTabChange,
}) {
  const filterChips = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "urgent", label: "Due Soon" },
    { id: "delayed", label: "Delayed" },
    { id: "completed", label: "Completed" },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
      {/* SEARCH INPUT */}
      <div className="relative flex-1 max-w-sm">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder={`Search by title, ${leadLabel.toLowerCase()}, stage...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-primary outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* EMPLOYEE TAB TOGGLE: MY PROJECTS VS ALL PROJECTS */}
        {tab !== undefined && onTabChange && (
          <>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => onTabChange("my")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  tab === "my"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                My Projects
              </button>
              <button
                type="button"
                onClick={() => onTabChange("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  tab === "all"
                    ? "bg-white text-slate-900 font-semibold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Projects
              </button>
            </div>
            <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />
          </>
        )}

        {/* STATUS FILTER CHIPS */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {filterChips.map((f) => (
            <button
              key={f.id}
              onClick={() => onStatusFilterChange(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                statusFilter === f.id
                  ? "bg-slate-900 text-white font-semibold shadow-xs"
                  : "bg-slate-100/70 hover:bg-slate-200/60 text-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block" />

        {/* CARDS VS TABLE SWITCH */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
          <button
            onClick={() => onViewModeChange("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TableIcon size={14} />
            <span>Table</span>
          </button>
          <button
            onClick={() => onViewModeChange("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === "cards"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
        </div>
      </div>
    </div>
  );
}
