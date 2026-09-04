export function Card({ title, subtitle, children, right, cardStyle, className = "" }) {
  return (
    <div
      className={`bg-white border border-border rounded-2xl p-3.5 sm:p-5 mb-4 sm:mb-5 w-full max-w-full overflow-hidden shadow-2xs ${className}`}
      style={cardStyle}
    >
      {(title || right) && (
        <div className="flex items-start justify-between mb-3.5 sm:mb-4 gap-2">
          <div className="min-w-0">
            {title && <h3 className="font-semibold text-sm sm:text-[15px] text-text truncate">{title}</h3>}
            {subtitle && (
              <p className="text-[11px] sm:text-[12px] text-text-muted mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
