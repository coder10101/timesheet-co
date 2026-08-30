export default function AttendanceSummary({ stats, formatDifference }) {
  const cards = [
    {
      color: "bg-success",
      label: "Present",
      value: stats.present,
      footer: "days",
    },
    {
      color: "bg-warning",
      label: "Late",
      value: stats.late,
      footer: "after 10:30 AM",
    },
    {
      color: "bg-alert",
      label: "Absent",
      value: stats.absent,
      footer: "past working days",
    },
    {
      color: "bg-success",
      label: "Overtime",
      value: formatDifference(stats.overtimeMinutes),
      footer: "above 8 hours",
    },
    {
      color: "bg-warning",
      label: "Undertime",
      value: formatDifference(stats.undertimeMinutes),
      footer: "below 8 hours",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl p-3.5 border border-border"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-2 h-2 rounded-full ${card.color}`} />

            <p className="text-xs text-text-muted">{card.label}</p>
          </div>

          <p className="text-xl font-semibold text-text">{card.value}</p>

          <p className="text-[10px] text-text-faint mt-0.5">{card.footer}</p>
        </div>
      ))}
    </div>
  );
}
