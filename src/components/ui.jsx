import { initials } from "../lib/format.js";
import Icon from "./Icon.jsx";

export function StatusPill({ status }) {
  return <span className={`status-pill status-${String(status).toLowerCase().replace(/\s+/g, "-")}`}><i></i>{status}</span>;
}

export function Avatar({ name, color = "" }) {
  return <span className="avatar" style={color ? { "--avatar-color": color } : undefined}>{initials(name)}</span>;
}

export function EmptyState({ title, description, children }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon name="search" /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {children}
    </div>
  );
}

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

/** className "page-search" marks a box that duplicates the topbar search: it only shows on phones, where the topbar search is hidden. */
export function SearchBox({ value, onChange, placeholder, className = "", ...props }) {
  return (
    <div className={`search-box${className ? ` ${className}` : ""}`}>
      <span className="search-icon"><Icon name="search" /></span>
      <input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}

/** Same markup as the original field() helper; inputs are uncontrolled and read via FormData. */
export function Field({ label, name, value = "", type = "text", ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} defaultValue={value} {...props} />
    </label>
  );
}

/** options: ["A", "B"] or [[value, label], ...] */
export function SelectField({ label, name, options, value, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select name={name} options={options} defaultValue={value} {...props} />
    </label>
  );
}

export function Select({ options, ...props }) {
  return (
    <select {...props}>
      {options.map((o) => {
        const [value, text] = Array.isArray(o) ? o : [o, o];
        return <option key={value} value={value}>{text}</option>;
      })}
    </select>
  );
}

export function TextareaField({ label, name, value = "" }) {
  return (
    <label className="field field-wide">
      <span>{label}</span>
      <textarea name={name} rows="3" defaultValue={value} />
    </label>
  );
}

export function ReadonlyField({ label, value }) {
  return <div className="field"><span>{label}</span><input value={value} disabled /></div>;
}

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
