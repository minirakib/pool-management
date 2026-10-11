export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
export const money = (amount) => `৳${Math.round(Number(amount) || 0).toLocaleString("en-BD")}`;
export const dateLabel = (date = new Date()) => new Intl.DateTimeFormat("en-BD", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
export const timeLabel = (value) => new Intl.DateTimeFormat("en-BD", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
export const shortDate = (value) => value ? new Intl.DateTimeFormat("en-BD", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—";
export const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const uid = (prefix) => `${prefix}-${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`}`;
export const durationLabel = (milliseconds) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${rest}`;
};
export const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "G";
export const option = (value, current) => `<option value="${escapeHTML(value)}" ${String(value) === String(current) ? "selected" : ""}>${escapeHTML(value)}</option>`;
export const field = (label, name, value = "", type = "text", extra = "") => `
  <label class="field"><span>${escapeHTML(label)}</span><input name="${escapeHTML(name)}" type="${escapeHTML(type)}" value="${escapeHTML(value)}" ${extra}></label>`;
export const selectField = (label, name, values, current, extra = "") => `
  <label class="field"><span>${escapeHTML(label)}</span><select name="${escapeHTML(name)}" ${extra}>${values.map((value) => option(value, current)).join("")}</select></label>`;
export const textareaField = (label, name, value = "", extra = "") => `
  <label class="field field-wide"><span>${escapeHTML(label)}</span><textarea name="${escapeHTML(name)}" rows="3" ${extra}>${escapeHTML(value)}</textarea></label>`;
export const emptyState = (title, description, action = "") => `<div class="empty-state"><span class="empty-icon">${icon("search")}</span><strong>${escapeHTML(title)}</strong><p>${escapeHTML(description)}</p>${action}</div>`;
export const statusPill = (status) => `<span class="status-pill status-${escapeHTML(String(status).toLowerCase().replace(/\s+/g, "-"))}"><i></i>${escapeHTML(status)}</span>`;
export const avatar = (name, color = "") => `<span class="avatar" ${color ? `style="--avatar-color:${escapeHTML(color)}"` : ""}>${escapeHTML(initials(name))}</span>`;
export function csvDownload(filename, rows) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const iconPaths = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  table: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M8 5.5v13"/><circle cx="15" cy="12" r="1.6"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
  receipt: '<path d="M5 2.5h14v19l-2.3-1.6-2.4 1.6-2.3-1.6-2.3 1.6-2.4-1.6L5 21.5z"/><path d="M8.5 7.5h7M8.5 11.5h7M8.5 15.5h4"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  wallet: '<rect x="2.5" y="5.5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M16 14.5h2"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
  badge: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17c.7-1.8 2.2-2.8 4-2.8s3.3 1 4 2.8"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>',
  "chevron-down": '<path d="m6 9 6 6 6-6"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>',
  collapse: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M16 10l-2 2 2 2"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4M12 17v.3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-1-1.5-1.5-2.8-1.5-1.6 0-2.7.8-2.7 2s1.1 1.7 2.7 2.1c1.7.4 2.9 1 2.9 2.3s-1.2 2.2-2.9 2.2c-1.4 0-2.5-.6-3-1.7M12 6v1.7M12 16.3V18"/>',
  "trend-up": '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  "trend-down": '<path d="m3 7 6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.3"/>',
  cup: '<path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5V5M12 2.5V5"/>',
  bottle: '<path d="M10 2.5h4M10.5 2.5v3.3L8 9.5v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-11l-2.5-3.7V2.5M8 13h8"/>',
  droplet: '<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z"/>',
  cookie: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9.5" r=".9"/><circle cx="14.5" cy="8.5" r=".9"/><circle cx="15" cy="14" r=".9"/><circle cx="9.5" cy="15" r=".9"/>',
  cue: '<path d="M3.5 20.5 16.5 7.5"/><path d="m15 6 3 3"/><circle cx="19.5" cy="4.5" r="1.8"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.5M4 12h.5M4 18h.5"/>',
  printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v3M8 21h8M9 17.5h6"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'
};
export const icon = (name, className = "") => `<svg class="ico${className ? ` ${className}` : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${iconPaths[name] || ""}</svg>`;
