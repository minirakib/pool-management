/** Club settings, theme and board colours. */

export function saveSettings(s, values) {
  Object.assign(s.settings, {
    clubName: values.clubName.trim(), phone: values.phone.trim(), address: values.address.trim(),
    defaultRate: Number(values.defaultRate), defaultNonAcRate: Number(values.defaultNonAcRate), billingMode: values.billingMode, singleGameMinutes: Math.max(1, Number(values.singleGameMinutes) || 15), minimumCharge: Number(values.minimumCharge) || 0,
    theme: values.theme, accent: values.accent
  });
  return "Club settings saved on this device.";
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
