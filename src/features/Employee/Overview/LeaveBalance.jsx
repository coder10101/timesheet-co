import { Sun, HeartPulse, Umbrella } from "lucide-react";
import { Card } from "../../../components/Card";
import { COLORS } from "../../../constants/colors";
import { formatLeaveBalance } from "../../../utils/leaveUtils";

const LEAVE_VISUAL = {
  Annual: {
    icon: Sun,
    color: COLORS.primary,
    max: 24,
  },
  Sick: {
    icon: HeartPulse,
    color: COLORS.alert,
    max: 6,
  },
};

export function LeaveBalance({ myLeave, me }) {
  const pendingLeave = myLeave.filter(
    (leave) => leave.status === "Pending",
  ).length;

  return (
    <Card
      title="Leave balance"
      subtitle={
        pendingLeave
          ? `${pendingLeave} request${pendingLeave > 1 ? "s" : ""} pending`
          : "Available days"
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(LEAVE_VISUAL).map(
          ([type, { icon: Icon, color, max }]) => {
            const value = me.leave_balance?.[type];
            if (value === undefined) return null;

            const isOut = value <= 0;
            const used = Math.max(0, max - value);
            const stubColor = isOut ? "#B5563A" : color;

            return (
              <div
                key={type}
                className="flex rounded-lg overflow-hidden border border-border-light bg-white"
              >
                {/* stub */}
                <div
                  className="w-12 shrink-0 flex flex-col items-center justify-center py-2 text-white"
                  style={{ backgroundColor: stubColor }}
                >
                  <span className="font-mono text-base font-bold leading-none">
                    {formatLeaveBalance(value)}
                  </span>
                  <span className="text-[8px] uppercase tracking-wide text-white/75 mt-0.5">
                    left
                  </span>
                </div>

                {/* perforation */}
                <div className="relative w-px shrink-0">
                  <div
                    className="absolute inset-y-1 left-0 w-px"
                    style={{
                      backgroundImage: `linear-gradient(${stubColor} 50%, transparent 0%)`,
                      backgroundSize: "1px 6px",
                      backgroundRepeat: "repeat-y",
                      opacity: 0.35,
                    }}
                  />
                  <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-surface-muted" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-surface-muted" />
                </div>

                {/* details */}
                <div className="flex-1 min-w-0 px-2 py-1.5 flex flex-col justify-center">
                  <div className="flex items-center gap-1">
                    <Icon
                      size={11}
                      style={{ color: stubColor }}
                      className="shrink-0"
                    />
                    <span className="text-xs font-semibold text-text truncate">
                      {type}
                    </span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    {formatLeaveBalance(used)}/{max} used
                  </span>
                </div>
              </div>
            );
          },
        )}
      </div>

      {pendingLeave > 0 && (
        <div className="mt-3 px-2.5 py-2 rounded-lg bg-warning-light text-warning text-[11px] flex gap-2">
          <Umbrella size={12} className="shrink-0 mt-0.5" />
          <span>
            {pendingLeave} leave request{pendingLeave > 1 ? "s" : ""} waiting
            for approval.
          </span>
        </div>
      )}
    </Card>
  );
}
