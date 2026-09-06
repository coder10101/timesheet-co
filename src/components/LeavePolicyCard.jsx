import { ShieldCheck } from "lucide-react";
import { useOfficeHours } from "../constants/officeHours";

export function LeavePolicyCard({ className = "" }) {
  const officeHours = useOfficeHours();

  return (
    <div className={`bg-white border border-border rounded-2xl p-4 shadow-2xs space-y-3 ${className}`}>
      <div className="flex items-center gap-2 pb-2 border-b border-border-light">
        <ShieldCheck size={16} className="text-primary" />
        <h3 className="text-xs sm:text-sm font-bold text-text">Leave Policy & Quotas</h3>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-surface-muted/50 border border-border-light space-y-1">
          <div className="flex items-center justify-between font-bold text-text">
            <span>Annual Leave</span>
            <span className="font-mono text-primary">24 Days / Year</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">
            For vacation, travel, and personal commitments.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-muted/50 border border-border-light space-y-1">
          <div className="flex items-center justify-between font-bold text-text">
            <span>Sick Leave</span>
            <span className="font-mono text-alert">6 Days / Year</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">
            For medical recovery and emergencies.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-muted/50 border border-border-light space-y-1">
          <div className="flex items-center justify-between font-bold text-text">
            <span>Half-Day Leaves</span>
            <span className="font-mono text-primary">0.5 Day</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">
            Available in Morning ({officeHours.startTimeAmPm}–{officeHours.halfDayMidTimeAmPm}) or Afternoon ({officeHours.halfDayMidTimeAmPm}–{officeHours.endTimeAmPm}) shifts with a {officeHours.halfDayHours}-hour target.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-muted/50 border border-border-light space-y-1">
          <div className="flex items-center justify-between font-bold text-text">
            <span>Weekly Holiday</span>
            <span className="font-mono text-text-muted">Saturdays</span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight">
            Saturdays are non-working days and are not deducted from leave balances.
          </p>
        </div>
      </div>
    </div>
  );
}
