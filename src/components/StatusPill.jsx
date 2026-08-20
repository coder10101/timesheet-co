import { CheckCircle2, Clock3, XCircle } from "lucide-react";

const STATUS_STYLES = {
  Pending: "bg-[#F4E3C1] text-[#7A5A17] border-[#E0A458]",
  Approved: "bg-[#DCE9DE] text-[#2F5233] border-[#6B8F71]",
  Rejected: "bg-[#F1DAD2] text-[#8C3A20] border-[#B5563A]",
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
