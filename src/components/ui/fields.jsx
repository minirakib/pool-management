/** Form fields. Inputs are uncontrolled and read with FormData (see Modal onSubmit). */
export function Field({ label, name, value = "", type = "text", ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input name={name} type={type} defaultValue={value} {...props} />
    </label>
  );
}

/** options: ["A", "B"] or [[value, label], ...] */
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

export function SelectField({ label, name, options, value, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select name={name} options={options} defaultValue={value} {...props} />
    </label>
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
