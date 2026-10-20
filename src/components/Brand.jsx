import { brandParts, brandText } from "@/lib/brand.js";

/** The club logo, or the default cue-ball mark when no logo is uploaded. */
export function BrandMark({ settings }) {
  if (settings?.logo) return <div className="brand-mark has-logo"><img src={settings.logo} alt={`${brandText(settings)} logo`} /></div>;
  return <div className="brand-mark"><span>{brandText(settings).charAt(0).toUpperCase()}</span></div>;
}

/** The wordmark: plain part, then the accent-coloured part. */
export function BrandName({ settings, className = "" }) {
  const [plain, accent] = brandParts(settings);
  return <div className={`brand-name${className ? ` ${className}` : ""}`}>{plain}{accent && <b>{accent}</b>}</div>;
}
