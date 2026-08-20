export function MiniStat({ label, value }) {
  return (
    <div className="bg-white border border-[#E4DFD3] rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-[#918A7B]">
        {label}
      </div>

      <div className="font-mono text-lg font-semibold mt-0.5">{value}</div>
    </div>
  );
}
