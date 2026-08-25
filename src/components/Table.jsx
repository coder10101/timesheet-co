export default function Table({
  columns,
  data,
  rowKey,
  renderRow,
  emptyMessage = "No records found.",
}) {
  return (
    <div className="bg-white border border-border border-top-0 rounded-b-xl overflow-hidden">
      {/* TABLE HEADER */}
      <div
        className="
          hidden sm:grid
          gap-4
          px-4 py-2.5
          bg-surface-muted
          border-b border-border-light
        "
        style={{
          gridTemplateColumns: columns
            .map((column) => column.width || "1fr")
            .join(" "),
        }}
      >
        {columns.map((column) => (
          <TableHeader key={column.key}>{column.label}</TableHeader>
        ))}
      </div>

      {/* TABLE BODY */}
      {data.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-text-muted">
          {emptyMessage}
        </div>
      ) : (
        data.map((item, index) => (
          <div key={rowKey(item, index)}>{renderRow(item, index)}</div>
        ))
      )}
    </div>
  );
}

function TableHeader({ children }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-text-faint">
      {children}
    </div>
  );
}
