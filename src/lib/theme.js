const legacyAccents = { "#16a36a": "#1fdc8a", "#4d8fe8": "#3da9ff", "#a56ce0": "#b47cff", "#d58b36": "#ffb23e" };
export const accentOptions = ["#1fdc8a", "#3da9ff", "#b47cff", "#ffb23e"];
export const accentNames = { "#1fdc8a": "Neon green", "#3da9ff": "Arcade blue", "#b47cff": "Ultra violet", "#ffb23e": "Gold rush" };
export const currentAccent = (settings) => legacyAccents[settings.accent] || settings.accent || accentOptions[0];

/** A table's own board colour, falling back to the club default, then classic green. */
export const clothFor = (table, settings) => table?.cloth || settings?.defaultCloth || "green";
