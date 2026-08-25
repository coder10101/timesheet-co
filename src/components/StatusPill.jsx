import { CheckCircle2, Clock3, XCircle } from "lucide-react";

const STATUS_STYLES = {
  Pending: "bg-warning-light text-warning border-warning",
  Approved: "bg-success-light text-success border-success",
  Rejected: "bg-alert-light text-alert border-alert",
};

export function StatusPill({ status }) {
  const icon =
    status === "Approved" ? (
      <CheckCircle2 size={13} />
    ) : status === "Rejected" ? (
      <XCircle size={13} />
    ) : (
      <Clock3 size={13} />
    );
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${STATUS_STYLES[status]}`}
    >
      {icon}
      {status}
    </span>
  );
}
