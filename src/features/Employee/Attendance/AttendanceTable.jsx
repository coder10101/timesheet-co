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
    label: "Time",
    width: "1fr",
  },
  {
    key: "hours",
    label: "Hours",
    width: "1fr",
  },
  {
    key: "action",
    label: "Action",
    width: "80px",
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
    <div>
      {/* TABLE TITLE */}
      <div className="bg-white border border-border border-b-0 rounded-t-xl px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base text-text">Daily log</h3>
        </div>

        <span className="text-[10px] text-text-muted">
          {visibleDates.length} days
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
