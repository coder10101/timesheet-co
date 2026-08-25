export default function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-sm ${color}`} />

      <span className="text-xs text-text-muted">{label}</span>
    </div>
  );
}
