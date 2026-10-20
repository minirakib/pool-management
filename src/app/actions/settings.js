/** Club settings, theme and board colours. */
import { fail } from "./helpers.js";

const trim = (v) => String(v).trim();
const amount = (v) => Math.max(0, Number(v) || 0);
// Each settings tab sends only its own fields; anything not sent keeps its saved value.
const SETTING_FIELDS = {
  clubName: trim, phone: trim, address: trim,
  defaultRate: amount, defaultNonAcRate: amount, minimumCharge: amount,
  billingMode: (v) => (["minute", "hour", "game"].includes(v) ? v : "minute"),
  singleGameMinutes: (v) => Math.max(1, Math.round(Number(v)) || 15),
  theme: (v) => (v === "light" ? "light" : "dark"), accent: trim,
  brandName: (v) => trim(v).slice(0, 32), brandTagline: (v) => trim(v).slice(0, 40),
  brandHighlight: (v) => (v === "none" ? "none" : "last"),
  logoOnReceipt: (v) => v === true || v === "true"
};

export function saveSettings(s, values) {
  if (values.clubName !== undefined && !trim(values.clubName)) fail("Enter the club name.");
  for (const [key, parse] of Object.entries(SETTING_FIELDS)) if (values[key] !== undefined) s.settings[key] = parse(values[key]);
  return "Settings saved on this device.";
}

/** logo: a data URL from lib/image.js fileToLogo, or "" to go back to the default mark. */
export function setLogo(s, logo) {
  s.settings.logo = logo || "";
  return logo ? "Logo updated." : "Logo removed.";
}

/** Sets the board colour for new tables; with applyToAll, recolours every existing table too. */
export function setDefaultCloth(s, cloth, applyToAll = false) {
  s.settings.defaultCloth = cloth;
  if (applyToAll) s.tables.forEach((t) => { t.cloth = cloth; });
  return applyToAll ? "Board color applied to all tables." : "Default board color saved.";
}

export function toggleTheme(s) {
  s.settings.theme = s.settings.theme === "dark" ? "light" : "dark";
}

/* ---------- Salary / payroll ---------- */
