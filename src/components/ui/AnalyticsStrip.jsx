/** The analytics chips used across pages and modals: items = [[label, value, props?]] */
export function AnalyticsStrip({ items, style }) {
  return (
    <div className="analytics-strip" style={style}>
      {items.map(([label, value, props]) => (
        <div key={label} className="analytics-chip"><span>{label}</span><strong {...props}>{value}</strong></div>
      ))}
    </div>
  );
}
