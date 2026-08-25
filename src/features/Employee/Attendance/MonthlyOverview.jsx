import AttendanceLegend from "./AttendanceLegend";

function getBlockClass(status) {
  switch (status) {
    case "present":
      return "bg-success text-success";

    case "late":
      return "bg-warning text-warning";

    case "absent":
      return "bg-alert text-alert";

    case "leave":
      return "bg-primary text-primary";

    case "holiday":
      return "bg-border text-text-muted";

    case "future":
      return "bg-white border border-dashed border-border-light text-text-faint";

    default:
      return "bg-surface-muted text-text-faint";
  }
}

function getTooltip(result) {
  if (result.status === "holiday") {
    return result.holiday?.name || (result.isSaturday ? "Saturday" : "Holiday");
  }

  if (result.status === "leave") {
    return result.leave?.type || "Leave";
  }

  if (result.status === "future") {
    return "Future";
  }

  return result.status;
}

export default function AttendanceOverview({ monthDates, getDateStatus }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-border mb-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-base text-text">Monthly overview</h3>

        <div className="hidden sm:flex">
          <AttendanceLegend />
        </div>
      </div>

      <div className="flex gap-[3px] overflow-x-auto pb-0.5">
        {monthDates.map((date) => {
          const result = getDateStatus(date);

          return (
            <div
              key={date.isoDate}
              className="flex-1 min-w-[20px] text-center"
              title={getTooltip(result)}
            >
              <div className="text-xs leading-none text-text-subtle">
                {date.day}
              </div>

              <div
                className={`mt-0.5 h-8 rounded-[3px] ${getBlockClass(
                  result.status,
                )}`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex sm:hidden flex-wrap items-center gap-2 mt-1.5 pt-1.5 border-t border-border-light">
        <AttendanceLegend />
      </div>
    </div>
  );
}
