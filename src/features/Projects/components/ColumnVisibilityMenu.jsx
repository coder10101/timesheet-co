import { useState, useRef, useEffect } from "react";
import { Columns3, Check, RotateCcw } from "lucide-react";

/**
 * Small button + dropdown that lets the user show/hide non-required
 * table columns. Purely presentational — all state lives in the
 * useColumnVisibility hook and is passed in as props.
 */
export function ColumnVisibilityMenu({
  columns,
  isVisible,
  toggleColumn,
  resetColumns,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleableColumns = columns.filter((col) => !col.required);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
        title="Show or hide columns"
        aria-expanded={open}
      >
        <Columns3 size={13} />
        Columns
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white shadow-lg z-40 py-1.5">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Toggle Columns
          </div>

          {toggleableColumns.map((col) => {
            const visible = isVisible(col.id);
            return (
              <button
                key={col.id}
                type="button"
                onClick={() => toggleColumn(col.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <span>{col.label}</span>
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                    visible
                      ? "bg-primary border-primary text-white"
                      : "border-slate-300 text-transparent"
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </span>
              </button>
            );
          })}

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={resetColumns}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
