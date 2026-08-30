import Table from "../../../components/Table";
import AttendanceRow from "./AttendanceRow";

const columns = [
  {
    key: "date",
    label: "Date",
    width: "1.25fr",
  },
  {
    key: "clockIn",
    label: "Clock in",
    width: "1fr",
  },
  {
    key: "clockOut",
    label: "Clock out",
    width: "1fr",
  },
  {
    key: "timeStatus",
    label: "Time status",
    width: "1.1fr",
  },
  {
    key: "hours",
    label: "Worked",
    width: "0.9fr",
  },
  {
    key: "action",
    label: "",
    width: "50px",
  },
];

export default function AttendanceTable({
  monthDates,
  today,
  recordsByDate,
  getDateStatus,
  editing,
  saving,
  setEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}) {
  const visibleDates = [...monthDates]
    .filter((date) => date.isoDate <= today)
    .reverse();

  return (
    <div className="mt-4">
      {/* TABLE TITLE */}
      <div className="bg-white border border-border border-b-0 rounded-t-xl px-4 py-2.5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-text">Daily log</h3>
        </div>

        <span className="text-[11px] font-mono text-text-muted bg-surface-muted px-2 py-0.5 rounded-md border border-border-light">
          {visibleDates.length} {visibleDates.length === 1 ? "day" : "days"}
        </span>
      </div>

      {/* REUSABLE TABLE */}
      <Table
        columns={columns}
        data={visibleDates}
        rowKey={(date) => date.isoDate}
        renderRow={(date) => (
          <AttendanceRow
            date={date}
            record={recordsByDate.get(date.isoDate)}
            result={getDateStatus(date)}
            editing={editing}
            saving={saving}
            setEditing={setEditing}
            onStartEdit={onStartEdit}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
          />
        )}
      />
    </div>
  );
}
