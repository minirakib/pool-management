import { useState } from "react";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { paymentMethods } from "@/lib/constants.js";
import { csvDownload } from "@/lib/download.js";
import { money, shortDate, timeLabel, toISODate, todayISO } from "@/lib/format.js";

/** Club hours covered by the sheet: 10 AM to 12 AM (midnight), one row per hour. */
const OPEN_HOUR = 10;
const CLOSE_HOUR = 24;
const hour12 = (h) => `${h % 12 || 12} ${h % 24 < 12 ? "AM" : "PM"}`;
const SLOTS = Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i)
  .map((h) => ({ key: h, label: `${hour12(h)} – ${hour12(h + 1)}` }));
const OUTSIDE = { key: "outside", label: "Before 10 AM" };

const revenueOf = (t) => t.revenueAmount ?? t.amount;
const emptyRow = () => ({ games: 0, ac: 0, nonAc: 0, products: 0, counter: 0, arcade: 0, discount: 0, total: 0, methods: {} });

/** Splits one transaction into the sheet's columns. Older records without a receipt count as AC table time. */
function addTransaction(row, t) {
  const total = revenueOf(t);
  if (t.type === "session") {
    const products = (t.receipt?.products || []).reduce((s, p) => s + p.qty * p.price, 0);
    const table = t.receipt?.tableCharge ?? total;
    row.games += 1;
    row[t.receipt?.hourType === "nonac" ? "nonAc" : "ac"] += table;
    row.products += products;
    row.discount += t.receipt?.discount || t.discount || 0;
  } else if (t.type === "arcade") row.arcade += total;
  else row.counter += total;
  row.total += total;
  row.methods[t.method] = (row.methods[t.method] || 0) + total;
}

/** Hour-by-hour earnings for one day (by payment time), with a CSV export of the sheet and its transactions. */
export default function DailyEarningSheet() {
  const state = useStore();
  const { notify } = useUi();
  const [day, setDay] = useState(todayISO());

  const dayTransactions = state.transactions
    .filter((t) => toISODate(new Date(t.date)) === day)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const rows = new Map([[OUTSIDE.key, emptyRow()], ...SLOTS.map((s) => [s.key, emptyRow()])]);
  const totals = emptyRow();
  dayTransactions.forEach((t) => {
    const hour = new Date(t.date).getHours();
    addTransaction(rows.get(hour >= OPEN_HOUR ? hour : OUTSIDE.key), t);
    addTransaction(totals, t);
  });
  // The "Before 10 AM" row only appears when something was paid then, so the totals still add up.
  const slots = rows.get(OUTSIDE.key).total ? [OUTSIDE, ...SLOTS] : SLOTS;
  const expenses = state.expenses.filter((e) => e.date === day).reduce((s, e) => s + Number(e.amount), 0);
  const methods = paymentMethods.filter((m) => totals.methods[m]);
  const busiest = SLOTS.reduce((best, s) => (rows.get(s.key).total > (best ? rows.get(best.key).total : 0) ? s : best), null);

  const exportCsv = () => {
    const line = (label, r) => [label, r.games, r.ac, r.nonAc, r.products, r.counter, r.arcade, r.discount, ...paymentMethods.map((m) => r.methods[m] || 0), r.total];
    const filename = `cuecore-earnings-${day}.csv`;
    csvDownload(filename, [
      ["Daily earning sheet", shortDate(day)], ["Hours", "10:00 AM – 12:00 AM"], [],
      ["Time", "Games", "AC table BDT", "Non-AC table BDT", "Products BDT", "Counter sales BDT", "Arcade coins BDT", "Discount BDT", ...paymentMethods.map((m) => `${m} BDT`), "Total BDT"],
      ...slots.map((s) => line(s.label, rows.get(s.key))),
      line("TOTAL", totals), [],
      ["Earnings", totals.total], ["Expenses", expenses], ["Net", totals.total - expenses], [],
      ["Transactions"],
      ["Time", "Description", "Customer", "Hour type", "Method", "Amount BDT"],
      ...dayTransactions.map((t) => [timeLabel(t.date), t.description, t.customer, t.type === "session" ? (t.receipt?.hourType === "nonac" ? "Non-AC" : "AC") : "", t.method, revenueOf(t)])
    ]);
    notify(`${filename} downloaded.`, "success", "Export ready");
  };

  const cells = (r) => (
    <>
      <td>{r.games || "—"}</td>
      <td>{r.ac ? money(r.ac) : "—"}</td>
      <td>{r.nonAc ? money(r.nonAc) : "—"}</td>
      <td>{r.products ? money(r.products) : "—"}</td>
      <td>{r.counter ? money(r.counter) : "—"}</td>
      <td>{r.arcade ? money(r.arcade) : "—"}</td>
      <td>{r.discount ? `−${money(r.discount)}` : "—"}</td>
      <td className="table-primary">{r.total ? money(r.total) : "—"}</td>
    </>
  );

  return (
    <article className="panel report-row earning-sheet">
      <div className="panel-heading">
        <div><h2>Daily earning sheet</h2><p>{shortDate(day)} · 10 AM – 12 AM · by payment time</p></div>
        <div className="earning-sheet-tools">
          <input type="date" aria-label="Sheet date" value={day} max={todayISO()} onChange={(e) => setDay(e.target.value || todayISO())} />
          <button className="button button-sm" onClick={exportCsv}><Icon name="download" /><span className="btn-label">CSV</span></button>
        </div>
      </div>
      <div className="report-kpis four">
        <div><span>Earnings</span><strong>{money(totals.total)}</strong></div>
        <div><span>Expenses</span><strong>{money(expenses)}</strong></div>
        <div><span>Net</span><strong style={totals.total - expenses < 0 ? { color: "var(--color-danger)" } : undefined}>{money(totals.total - expenses)}</strong></div>
        <div><span>Busiest hour</span><strong>{busiest ? busiest.label : "—"}</strong></div>
      </div>
      {methods.length > 0 && <p className="muted earning-methods">{methods.map((m) => `${m} ${money(totals.methods[m])}`).join(" · ")}</p>}
      <div className="data-table-wrap">
        <table className="data-table earning-table">
          <thead><tr><th>Time</th><th>Games</th><th>AC table</th><th>Non-AC table</th><th>Products</th><th>Counter</th><th>Arcade</th><th>Discount</th><th>Total</th></tr></thead>
          <tbody>
            {slots.map((s) => {
              const r = rows.get(s.key);
              return <tr key={s.key} className={r.total ? "" : "is-empty"}><td className="table-primary">{s.label}</td>{cells(r)}</tr>;
            })}
          </tbody>
          <tfoot><tr><td className="table-primary">Total</td>{cells(totals)}</tr></tfoot>
        </table>
      </div>
    </article>
  );
}
