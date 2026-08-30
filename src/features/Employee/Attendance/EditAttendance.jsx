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
          <div className="font-semibold text-text">Edit attendance</div>

          <div className="text-xs text-text-muted mt-0.5">
            {editing.bsDay} {NEPALI_MONTHS[editing.bsMonth - 1]}{" "}
            {editing.bsYear}
          </div>
        </div>
      </div>

      {/* TIME */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <label className="text-xs text-text-muted">
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

        <label className="text-xs text-text-muted">
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
          className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-dark active:scale-95 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:active:scale-100"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text hover:bg-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
