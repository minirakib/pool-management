/**
 * Club branding from settings: brandName, brandHighlight ("last" | "none"), brandTagline, logo (data URL), logoOnReceipt.
 * With no brandName set, the app keeps its own CUE + CORE wordmark.
 */
export const DEFAULT_TAGLINE = "Club operations";
export const DEFAULT_BRAND = "CUECORE";

/** [plain part, accent part] for the wordmark. "Green Pocket Club" → ["Green Pocket", "Club"]. */
export function brandParts(settings) {
  const name = (settings?.brandName || "").trim();
  if (!name) return ["CUE", "CORE"];
  if (settings.brandHighlight === "none") return [name, ""];
  const cut = name.lastIndexOf(" ");
  return cut > 0 ? [name.slice(0, cut + 1), name.slice(cut + 1)] : ["", name];
}

export const brandText = (settings) => (settings?.brandName || "").trim() || DEFAULT_BRAND;
export const brandTagline = (settings) => settings?.brandTagline ?? DEFAULT_TAGLINE;
