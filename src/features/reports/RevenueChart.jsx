import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../app/store.jsx";
import { money, toISODate, withAlpha } from "../../lib/format.js";

/** Daily revenue rows for a preset period ("Today" | "7 Days" | "30 Days") or a custom from/to range. */
export function chartRows(transactions, period, from = "", to = "") {
  if (!from && !to) {
    const today = new Date();
    to = toISODate(today);
    if (period === "Today") from = to;
    else { const start = new Date(today); start.setDate(start.getDate() - (period === "30 Days" ? 29 : 6)); from = toISODate(start); }
  }
  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59`) : null;
  if (fromDate && toDate && fromDate > toDate) return [];
  const days = fromDate && toDate ? Math.min(31, Math.max(1, Math.floor((toDate - fromDate) / 86400000) + 1)) : 7;
  const start = fromDate || new Date(Date.now() - (days - 1) * 86400000);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const iso = toISODate(date);
    const value = transactions.filter((t) => t.date.slice(0, 10) === iso).reduce((sum, t) => sum + (t.revenueAmount ?? t.amount), 0);
    return { date: iso, label: days === 1 ? "Today" : new Intl.DateTimeFormat("en-BD", { day: "numeric", month: days > 9 ? "short" : undefined }).format(date), value };
  });
}

// Chart.js is fetched only when a chart is first shown, then cached by the service worker.
let chartModule;
const loadChart = () => (chartModule ??= import("chart.js/auto").then((m) => m.default));

function SvgFallback({ rows }) {
  const max = Math.max(100, ...rows.map((r) => r.value));
  const width = 650, height = 170, left = 8, right = width - 8, top = 12, bottom = height - 24;
  const points = rows.map((row, index) => ({
    ...row,
    x: rows.length === 1 ? (left + right) / 2 : left + (right - left) * (index / (rows.length - 1)),
    y: bottom - (bottom - top) * (row.value / max)
  }));
  const path = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Revenue chart, demo transaction totals">
        {[0.25, 0.5, 0.75, 1].map((f) => { const y = (bottom - (bottom - top) * f).toFixed(1); return <line key={f} x1={left} x2={right} y1={y} y2={y}></line>; })}
        <path className="chart-area" d={`${path} L${right} ${bottom} L${left} ${bottom} Z`}></path>
        <path className="chart-line" d={path}></path>
        {points.map((p) => <circle key={p.date} cx={p.x} cy={p.y} r="3.2"><title>{p.label} · {money(p.value)}</title></circle>)}
        <g className="chart-labels">
          {points.filter((_, i) => rows.length <= 8 || i % Math.ceil(rows.length / 6) === 0 || i === rows.length - 1).map((p) => (
            <text key={p.date} x={p.x} y={height - 4} textAnchor="middle">{p.label}</text>
          ))}
        </g>
      </svg>
      {rows.every((r) => r.value === 0) && <span className="chart-empty-label">No settled transactions in this period</span>}
    </>
  );
}

export default function RevenueChart({ period, from = "", to = "" }) {
  const { transactions, settings } = useStore();
  const rows = useMemo(() => chartRows(transactions, period, from, to), [transactions, period, from, to]);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let chart, cancelled = false;
    loadChart().then((Chart) => {
      if (cancelled || !canvasRef.current) return;
      const css = getComputedStyle(document.documentElement);
      const v = (name) => css.getPropertyValue(name).trim();
      const primary = v("--color-primary");
      const fill = ({ chart: c }) => {
        const { ctx, chartArea } = c;
        if (!chartArea) return withAlpha(primary, 0.15);
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, withAlpha(primary, 0.38));
        gradient.addColorStop(1, withAlpha(primary, 0));
        return gradient;
      };
      const tick = { size: 11, family: "Chakra Petch, sans-serif", weight: "600" };
      chart = new Chart(canvasRef.current, {
        type: "line",
        data: { labels: rows.map((r) => r.label), datasets: [{ data: rows.map((r) => r.value), borderColor: primary, backgroundColor: fill, fill: true, tension: 0.38, pointRadius: 4, pointHoverRadius: 7, pointBorderColor: v("--bg-panel"), pointBorderWidth: 2, pointBackgroundColor: primary, borderWidth: 3 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: "rgba(4,12,8,.94)", borderColor: withAlpha(primary, 0.6), borderWidth: 1, padding: 11, displayColors: false, titleFont: { family: "Chakra Petch, sans-serif", weight: "700", size: 12 }, bodyFont: { family: "Orbitron, sans-serif", weight: "700", size: 13 }, callbacks: { label: (c) => money(c.raw) } }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: v("--color-text-muted"), maxTicksLimit: 7, font: tick } },
            y: { beginAtZero: true, grid: { color: v("--color-border") }, ticks: { color: v("--color-text-muted"), font: tick, callback: (value) => `৳${Number(value).toLocaleString("en-BD")}` } }
          }
        }
      });
      setReady(true);
      document.fonts?.ready.then(() => chart?.update());
    }).catch(() => setReady(false));
    return () => { cancelled = true; chart?.destroy(); };
    // Rebuild when data, theme or accent changes so colours follow the CSS variables.
  }, [rows, settings.theme, settings.accent]);

  return (
    <div className="chart-box" id="revenue-chart">
      <canvas ref={canvasRef} aria-label="Revenue chart" role="img" style={ready ? undefined : { display: "none" }}></canvas>
      {!ready && <SvgFallback rows={rows} />}
    </div>
  );
}
