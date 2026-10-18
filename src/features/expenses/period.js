/** Date-period helpers for the Expenses page: pick a day, month, year, custom range or all time. */
import { monthISO, monthLabel, shortDate, toISODate, todayISO } from "../../lib/format.js";

export const PERIOD_MODES = [["day", "Day"], ["month", "Month"], ["year", "Year"], ["custom", "Custom"], ["all", "All"]];

export const defaultPeriod = () => ({ mode: "month", day: todayISO(), month: monthISO(), year: String(new Date().getFullYear()), from: "", to: "" });

const lastDayOfMonth = (month) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

/** { from, to, label, file } for a period; from/to are inclusive "YYYY-MM-DD" or "" for open-ended. */
export function periodRange(p) {
  switch (p.mode) {
    case "day": return { from: p.day, to: p.day, label: shortDate(p.day), file: p.day };
    case "month": return { from: `${p.month}-01`, to: `${p.month}-${String(lastDayOfMonth(p.month)).padStart(2, "0")}`, label: monthLabel(p.month), file: p.month };
    case "year": return { from: `${p.year}-01-01`, to: `${p.year}-12-31`, label: p.year, file: p.year };
    case "custom": {
      // A reversed range is swapped rather than rejected.
      const [from, to] = p.from && p.to && p.from > p.to ? [p.to, p.from] : [p.from, p.to];
      const label = from || to ? `${from ? shortDate(from) : "Start"} – ${to ? shortDate(to) : "Today"}` : "All dates";
      return { from, to, label, file: `${from || "start"}_to_${to || "today"}` };
    }
    default: return { from: "", to: "", label: "All time", file: "all" };
  }
}

export const inPeriod = (range, date) => !!date && (!range.from || date >= range.from) && (!range.to || date <= range.to);

/** Moves a day / month / year period by `delta` steps; other modes are unchanged. */
export function shiftPeriod(p, delta) {
  if (p.mode === "day") {
    const d = new Date(`${p.day}T12:00:00`);
    d.setDate(d.getDate() + delta);
    return { ...p, day: toISODate(d) };
  }
  if (p.mode === "month") {
    const [y, m] = p.month.split("-").map(Number);
    return { ...p, month: monthISO(new Date(y, m - 1 + delta, 1)) };
  }
  if (p.mode === "year") return { ...p, year: String(Number(p.year) + delta) };
  return p;
}

/** Sums `list` by key(entry) into [[key, { count, amount }]] sorted by key. */
export function totalsBy(list, key) {
  const map = new Map();
  list.forEach((e) => {
    const k = key(e);
    const cur = map.get(k) || { count: 0, amount: 0 };
    map.set(k, { count: cur.count + 1, amount: cur.amount + Number(e.amount) });
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const daysBetween = (from, to) => Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86_400_000) + 1;

/**
 * Trend buckets for the chart: one per day for a month or a short range, one per month for a
 * year or a long range. Returns [] for a single day. Empty buckets are included so gaps show.
 */
export function trendBuckets(list, p, range) {
  if (p.mode === "day") return [];
  const dates = list.map((e) => e.date).sort();
  const from = range.from || dates[0];
  const to = range.to || (p.mode === "custom" ? todayISO() : dates.at(-1));
  if (!from || !to || from > to) return [];
  const sums = (key) => Object.fromEntries(totalsBy(list, key).map(([k, v]) => [k, v.amount]));

  if (p.mode === "month" || (p.mode === "custom" && daysBetween(from, to) <= 62)) {
    const byDay = sums((e) => e.date);
    const out = [];
    for (let d = new Date(`${from}T12:00:00`); toISODate(d) <= to; d.setDate(d.getDate() + 1)) {
      const key = toISODate(d);
      out.push({ key, label: String(d.getDate()), title: shortDate(key), amount: byDay[key] || 0 });
    }
    return out;
  }
  const byMonth = sums((e) => e.date.slice(0, 7));
  const out = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = shiftPeriod({ mode: "month", month: m }, 1).month) {
    out.push({ key: m, label: monthLabel(m, true).split(" ")[0], title: monthLabel(m), amount: byMonth[m] || 0 });
  }
  return out.slice(-36); // "All" on a long history: keep the last three years readable
}

/** Changes mode; an empty custom range starts from the period that was on screen. */
export function switchMode(p, mode) {
  if (mode === "custom" && !p.from && !p.to && p.mode !== "all") {
    const { from, to } = periodRange(p);
    return { ...p, mode, from, to };
  }
  return { ...p, mode };
}
