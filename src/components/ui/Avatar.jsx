import { initials } from "@/lib/format.js";

/** Round initials badge. */
export function Avatar({ name, color = "" }) {
  return <span className="avatar" style={color ? { "--avatar-color": color } : undefined}>{initials(name)}</span>;
}
