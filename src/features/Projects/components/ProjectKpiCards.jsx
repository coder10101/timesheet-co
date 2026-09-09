export function ProjectKpiCards({
  kpiStats = {},
  statusFilter = "all",
  onStatusFilterChange,
  isLoading = false,
}) {
  const handleToggle = (key) => {
    if (!onStatusFilterChange) return;
    onStatusFilterChange(statusFilter === key ? "all" : key);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. ACTIVE */}
      <div
        onClick={() => handleToggle("active")}
        className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-slate-300 ${
          statusFilter === "active"
            ? "border-primary ring-2 ring-primary/10"
            : "border-slate-200/80"
        }`}
      >
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Active
        </p>
        <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
          {isLoading ? "—" : kpiStats.active ?? 0}
        </p>
      </div>

      {/* 2. DUE < 7 DAYS */}
      <div
        onClick={() => handleToggle("urgent")}
        className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-amber-300 ${
          statusFilter === "urgent"
            ? "border-amber-400 ring-2 ring-amber-400/15"
            : "border-slate-200/80"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-amber-700 uppercase tracking-wider">
            Due &lt; 7 Days
          </p>
          {(kpiStats.urgent ?? 0) > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </div>
        <p className="text-2xl font-bold font-mono text-amber-900 mt-1">
          {isLoading ? "—" : kpiStats.urgent ?? 0}
        </p>
      </div>

      {/* 3. DELAYED */}
      <div
        onClick={() => handleToggle("delayed")}
        className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-rose-300 ${
          statusFilter === "delayed"
            ? "border-rose-400 ring-2 ring-rose-400/15"
            : "border-slate-200/80"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-rose-700 uppercase tracking-wider">
            Delayed
          </p>
          {(kpiStats.delayed ?? 0) > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
        </div>
        <p className="text-2xl font-bold font-mono text-rose-900 mt-1">
          {isLoading ? "—" : kpiStats.delayed ?? 0}
        </p>
      </div>

      {/* 4. COMPLETED */}
      <div
        onClick={() => handleToggle("completed")}
        className={`bg-white border rounded-2xl p-4 shadow-2xs cursor-pointer transition-all hover:border-emerald-300 ${
          statusFilter === "completed"
            ? "border-emerald-400 ring-2 ring-emerald-400/15"
            : "border-slate-200/80"
        }`}
      >
        <p className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider">
          Completed
        </p>
        <p className="text-2xl font-bold font-mono text-emerald-900 mt-1">
          {isLoading ? "—" : kpiStats.completed ?? 0}
        </p>
      </div>
    </div>
  );
}
