const pad = (n) => String(n).padStart(2, "0");

export const money = (amount) => `৳${Math.round(Number(amount) || 0).toLocaleString("en-BD")}`;
export const dateLabel = (date = new Date()) => new Intl.DateTimeFormat("en-BD", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
export const timeLabel = (value) => new Intl.DateTimeFormat("en-BD", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
export const shortDate = (value) => value ? new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";
export const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const todayISO = () => toISODate(new Date());
export const uid = (prefix) => `${prefix}-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`}`;
export const durationLabel = (milliseconds) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
};
export const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "G";
export const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"; };
export const withAlpha = (hex, alpha) => {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!match) return `rgba(31,220,138,${alpha})`;
  const n = parseInt(match[1], 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
};
/** "2026-10" → "October 2026" (or "Oct 2026" with short). */
export const monthLabel = (month, short = false) => month ? new Intl.DateTimeFormat("en-BD", { month: short ? "short" : "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`)) : "—";
export const monthISO = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
