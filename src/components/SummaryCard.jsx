export default function SummaryCard({ color, label, value, footer }) {
  return (
    <div className="bg-white rounded-xl p-3.5 border border-border">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-2 h-2 rounded-full ${color}`} />

        <p className="text-xs text-text-muted">{label}</p>
      </div>

      <p className="text-xl font-semibold text-text">{value}</p>

      {footer && <p className="text-[10px] text-text-faint mt-0.5">{footer}</p>}
    </div>
  );
}
