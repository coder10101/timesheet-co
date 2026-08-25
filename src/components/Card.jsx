export function Card({ title, subtitle, children, right, cardClass }) {
  return (
    <div
      className={`bg-white border border-[#E4DFD3] rounded-xl p-5 mb-5 ${cardClass || ""}`}
    >
      {(title || right) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="font-semibold text-[15px]">{title}</h3>}
            {subtitle && (
              <p className="text-[12px] text-[#7A7362] mt-0.5">{subtitle}</p>
            )}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
