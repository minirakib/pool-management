import Icon from "@/components/Icon.jsx";

/**
 * Pill tab bar. options: [{ id, label, icon?, count? }]. Used for page tabs and small mode switches.
 * role="tablist" by default; pass role="radiogroup" for a choice inside a form.
 */
export function Segmented({ options, value, onChange, label, role = "tablist", className = "" }) {
  const item = role === "tablist" ? "tab" : "radio";
  return (
    <div className={`segmented${className ? ` ${className}` : ""}`} role={role} aria-label={label}>
      {options.map(({ id, label: text, icon, count }) => (
        <button key={id} type="button" role={item} aria-selected={item === "tab" ? value === id : undefined} aria-checked={item === "radio" ? value === id : undefined}
          className={value === id ? "active" : ""} onClick={() => onChange(id)}>
          {icon && <Icon name={icon} />}{text}{count !== undefined && <span className="tab-count">{count}</span>}
        </button>
      ))}
    </div>
  );
}
