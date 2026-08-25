import { NEPALI_MONTHS } from "../../../utils/nepaliCalendar";

export default function AttendanceEditForm({
  editing,
  saving,
  setEditing,
  onSave,
  onCancel,
}) {
  if (!editing) {
    return null;
  }

  const days = Array.from({ length: 32 }, (_, index) => index + 1);

  return (
    <div className="px-4 py-4 bg-surface-muted border-b border-border-light">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-semibold text-text">Edit attendance</div>

          <div className="text-[10px] text-text-muted mt-0.5">
            {editing.bsDay} {NEPALI_MONTHS[editing.bsMonth - 1]}{" "}
            {editing.bsYear}
          </div>
        </div>

        <span className="text-[10px] text-text-faint">Nepali date</span>
      </div>

      {/* DATE */}

      <div className="grid grid-cols-3 gap-2 mb-3">
        <label className="text-[10px] text-text-muted">
          Year
          <select
            value={editing.bsYear}
            onChange={(e) =>
              setEditing((current) => ({
                ...current,
                bsYear: Number(e.target.value),
              }))
            }
            className="mt-1 w-full border border-border rounded-lg px-2 py-2 text-xs bg-white outline-none"
          >
            <option value={editing.bsYear}>{editing.bsYear}</option>
          </select>
        </label>

        <label className="text-[10px] text-text-muted">
          Month
          <select
            value={editing.bsMonth}
            onChange={(e) =>
              setEditing((current) => ({
                ...current,
                bsMonth: Number(e.target.value),
              }))
            }
            className="mt-1 w-full border border-border rounded-lg px-2 py-2 text-xs bg-white outline-none"
          >
            {NEPALI_MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[10px] text-text-muted">
          Day
          <select
            value={editing.bsDay}
            onChange={(e) =>
              setEditing((current) => ({
                ...current,
                bsDay: Number(e.target.value),
              }))
            }
            className="mt-1 w-full border border-border rounded-lg px-2 py-2 text-xs bg-white outline-none"
          >
            {days.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* TIME */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="text-[10px] text-text-muted">
          Clock in
          <input
            type="time"
            value={editing.clockIn}
            onChange={(e) =>
              setEditing((current) => ({
                ...current,
                clockIn: e.target.value,
              }))
            }
            className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-xs bg-white outline-none"
          />
        </label>

        <label className="text-[10px] text-text-muted">
          Clock out
          <input
            type="time"
            value={editing.clockOut}
            onChange={(e) =>
              setEditing((current) => ({
                ...current,
                clockOut: e.target.value,
              }))
            }
            className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-xs bg-white outline-none"
          />
        </label>
      </div>

      {/* ACTIONS */}

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-border text-xs text-text hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
