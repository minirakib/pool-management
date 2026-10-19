/**
 * Radio buttons styled as large option tiles; works with FormData through `name`.
 * options: [[value, title, subtitle?], ...]
 */
export function ChoiceGroup({ name, options, value, onChange, label }) {
  return (
    <div className="choice-group" role="radiogroup" aria-label={label}>
      {options.map(([id, text, sub]) => (
        <label key={id} className={`choice${value === id ? " active" : ""}`}>
          <input type="radio" name={name} value={id} checked={value === id} onChange={() => onChange(id)} />
          <strong>{text}</strong>{sub && <small>{sub}</small>}
        </label>
      ))}
    </div>
  );
}
