export function StatBlock({ label, value, accent }) {
  return (
    <div className="bg-white border border-[#E4DFD3] rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-wide text-text-muted mb-1">
        {label}
      </div>
      <div
        className={`font-mono text-2xl font-semibold ${accent || "text-[#1A2332]"}`}
      >
        {value}
      </div>
    </div>
  );
}
