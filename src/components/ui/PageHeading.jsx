/**
 * One-row page header: title, small stat pills, then actions on the right.
 * stats: [{ label, value, tone, onClick?, active?, title? }]; a stat with onClick is a filter toggle.
 */
export function PageHeading({ title, stats, children }) {
  return (
    <div className="page-heading compact-heading">
      <h1>{title}</h1>
      {stats?.length > 0 && <MiniStats items={stats} />}
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

/** tone: primary | success | warning | danger | info | gold | muted */
export function MiniStats({ items, label = "Summary" }) {
  return (
    <div className="mini-stats" aria-label={label}>
      {items.filter(Boolean).map((s) => {
        const content = <><i></i>{s.label}<b>{s.value}</b></>;
        return s.onClick
          ? <button key={s.label} type="button" className={`mini-stat${s.active ? " active" : ""}`} data-tone={s.tone} onClick={s.onClick} title={s.title} aria-pressed={!!s.active}>{content}</button>
          : <span key={s.label} className="mini-stat" data-tone={s.tone} title={s.title}>{content}</span>;
      })}
    </div>
  );
}
