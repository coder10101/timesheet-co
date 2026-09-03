import { CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

export default function AttendanceSummary({ stats, formatDifference }) {
  const cards = [
    {
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success-light border-success/30",
      label: "Present",
      value: stats.present,
      footer: "on-time days",
    },
    {
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning-light border-warning/30",
      label: "Late Check-in",
      value: stats.late,
      footer: "after 10:30 AM",
    },
    {
      icon: AlertCircle,
      color: "text-alert",
      bg: "bg-alert-light border-alert/30",
      label: "Absent",
      value: stats.absent,
      footer: "working days missed",
    },
    {
      icon: TrendingUp,
      color: stats.overtimeMinutes > 0 ? "text-success" : "text-text-muted",
      bg:
        stats.overtimeMinutes > 0
          ? "bg-success-light border-success/30"
          : "bg-surface-muted border-border-light",
      label: "Overtime",
      value:
        stats.overtimeMinutes > 0
          ? `+${formatDifference(stats.overtimeMinutes)}`
          : "0m",
      footer:
        stats.overtimeMinutes > 0
          ? "extra hours worked"
          : "no extra hours",
    },
    {
      icon: TrendingDown,
      color: stats.undertimeMinutes > 0 ? "text-alert" : "text-success",
      bg:
        stats.undertimeMinutes > 0
          ? "bg-alert-light border-alert/30"
          : "bg-success-light border-success/30",
      label: "Short Hours",
      value:
        stats.undertimeMinutes > 0
          ? `-${formatDifference(stats.undertimeMinutes)}`
          : "0m",
      footer:
        stats.undertimeMinutes > 0
          ? "time to make up"
          : "target hours met",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-3.5 border border-border shadow-2xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">{card.label}</span>
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${card.bg}`}>
                <Icon size={12} className={card.color} />
              </div>
            </div>

            <p className="text-xl font-bold text-text font-mono">{card.value}</p>
            <p className="text-[10px] text-text-muted">{card.footer}</p>
          </div>
        );
      })}
    </div>
  );
}
