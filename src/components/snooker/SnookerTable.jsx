import { useState } from "react";
import { clothColors } from "@/lib/constants.js";

// Ball positions (x%, y%) on the top-down table: reds triangle, colours on their spots, cue ball.
const BALLS = [
  ["red", 75, 50], ["red", 77.9, 46.7], ["red", 77.9, 53.3], ["red", 80.8, 43.4], ["red", 80.8, 50], ["red", 80.8, 56.6],
  ["pink", 71.4, 50], ["black", 91, 50], ["blue", 50, 50], ["green", 24, 33], ["brown", 24, 50], ["yellow", 24, 67], ["white", 16.5, 42]
];
const POCKETS = ["tl", "tc", "tr", "bl", "bc", "br"];
const Pockets = () => POCKETS.map((p) => <i key={p} className={`pocket ${p}`}></i>);

/**
 * CSS-drawn snooker table with balls. `cloth` is a colour id from clothColors (default green).
 * `children` are centred on the cloth (e.g. <TableOverlay> with the live time and player).
 */
export default function SnookerTable({ cloth = "green", children }) {
  return (
    // With an overlay the artwork is decorative and the overlay text is what screen readers get.
    <div className="snooker-art" data-cloth={cloth} {...(children ? {} : { role: "img", "aria-label": "Top-down snooker table illustration" })}>
      <div className="table-inner" aria-hidden={children ? true : undefined}>
        <span className="table-baulk"></span>
        <span className="table-d"></span>
        <Pockets />
        {BALLS.map(([color, x, y], index) => (
          <i key={index} className={`ball ${color}`} style={{ left: `${x}%`, top: `${y}%` }}></i>
        ))}
      </div>
      {children && <div className="table-overlay">{children}</div>}
    </div>
  );
}

/** Small table thumbnail used in list view. */
export function MiniTable({ cloth = "green" }) {
  return (
    <div className="mini-art" data-cloth={cloth}>
      <div className="table-inner"><Pockets /></div>
    </div>
  );
}

/**
 * Board colour chooser: radio swatches named `name`, so it works inside FormData forms.
 * Shows a live preview of the table in the chosen colour unless `preview` is false.
 * `compact` shows round swatches only (names as tooltips); `onChange` reports the chosen id.
 */
export function ClothPicker({ name = "cloth", value = "green", label = "Board color", preview = true, compact = false, onChange }) {
  const [selected, setSelected] = useState(value);
  const choose = (id) => { setSelected(id); onChange?.(id); };
  return (
    <div className="field field-wide">
      <span>{label}{compact && <em className="cloth-current"> · {clothColors.find((c) => c.id === selected)?.name}</em>}</span>
      {preview && <div className="cloth-preview"><SnookerTable cloth={selected} /></div>}
      <div className={`cloth-picker${compact ? " compact" : ""}`} role="radiogroup" aria-label={label}>
        {clothColors.map((c) => (
          <label key={c.id} className="cloth-option" style={{ "--swatch-light": c.light, "--swatch-dark": c.dark }} title={c.name}>
            <input type="radio" name={name} value={c.id} checked={selected === c.id} onChange={() => choose(c.id)} aria-label={c.name} />
            <span>{compact ? "" : c.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
