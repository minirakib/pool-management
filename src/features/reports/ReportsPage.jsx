import { useState } from "react";
import { lowStockCount } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { EmptyState, MiniStats, PageHeading } from "@/components/ui";
import { useNow } from "@/hooks/useNow.js";
import { expenseCategories, paymentMethods } from "@/lib/constants.js";
import { dashboardMetrics, salaryNet } from "@/lib/domain.js";
import { csvDownload } from "@/lib/download.js";
import { money, monthISO, monthLabel, shortDate, timeLabel, toISODate } from "@/lib/format.js";
import DailyEarningSheet from "./DailyEarningSheet.jsx";
import RevenueChart from "./RevenueChart.jsx";

const revenueOf = (t) => t.revenueAmount ?? t.amount;
const sum = (list, fn = revenueOf) => list.reduce((s, x) => s + fn(x), 0);
const BOOKING_STATUSES = ["Confirmed", "Pending", "Completed", "Cancelled"];

function dateBounds(period, from, to) {
  if (from || to) return { from, to };
  const today = new Date();
  const end = toISODate(today);
  if (period === "Today") return { from: end, to: end };
  today.setDate(today.getDate() - (period === "30 Days" ? 29 : 6));
  return { from: toISODate(today), to: end };
}

/** Revenue and profit include live session bills, so they tick every second. */
function LiveMetric({ field }) {
  const state = useStore();
  useNow(); // re-render every second; dashboardMetrics reads the clock itself
  return money(dashboardMetrics(state)[field]);
}

function ListPanel({ title, subtitle, rows, empty, children }) {
  return (
    <article className="panel">
      <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div></div>
      {children}
      {rows.length ? rows.map(([key, name, sub, value]) => (
        <div key={key} className="settings-row"><div><strong>{name}</strong><span>{sub}</span></div><strong>{value}</strong></div>
      )) : empty}
    </article>
  );
}

/** Horizontal share bar used inside report rows. */
const Share = ({ value, total }) => <span className="share-bar"><i style={{ width: `${total ? Math.max(3, Math.round((value / total) * 100)) : 0}%` }}></i></span>;

export default function ReportsPage() {
  const state = useStore();
  const { notify, setPage, reportPeriod, setReportPeriod } = useUi();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const range = dateBounds(reportPeriod, from, to);
  const inRange = (day) => !!day && (!range.from || day >= range.from) && (!range.to || day <= range.to);
  const m = dashboardMetrics(state);

  // ----- Sales -----
  const filtered = [...state.transactions].sort((a, b) => a.date.localeCompare(b.date)).filter((t) => inRange(t.date.slice(0, 10)));
  const revenue = sum(filtered);
  const payments = paymentMethods.map((method) => ({ method, list: filtered.filter((t) => t.method === method) })).filter((e) => e.list.length && sum(e.list, (t) => t.amount));
  const topCustomers = state.customers.map((c) => ({ c, amount: sum(filtered.filter((t) => t.customer === c.name)) })).filter((e) => e.amount).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const topTables = state.tables.map((table) => ({ table, amount: sum(filtered.filter((t) => t.tableId === table.id)) })).filter((e) => e.amount).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const sales = filtered.filter((t) => t.type === "sale");
  const arcadeSales = filtered.filter((t) => t.type === "arcade");
  const allArcade = state.transactions.filter((t) => t.type === "arcade");
  const sessionsClosed = filtered.filter((t) => t.type === "session");
  const recent = [...filtered].reverse().slice(0, 8);

  const soldProducts = new Map();
  sales.forEach((t) => t.receipt?.products?.forEach((item) => {
    const current = soldProducts.get(item.name) || { qty: 0, amount: 0 };
    soldProducts.set(item.name, { qty: current.qty + item.qty, amount: current.amount + item.qty * item.price });
  }));

  // Peak hours: live session starts in range + recorded session receipts. No synthetic history.
  const peakHours = new Map();
  [
    ...state.sessions.map((s) => s.originalStartedAt || s.startedAt).filter((ts) => inRange(toISODate(new Date(ts)))),
    ...sessionsClosed.map((t) => t.receipt?.startedAt).filter(Boolean)
  ].forEach((ts) => { const hour = new Date(ts).getHours(); peakHours.set(hour, (peakHours.get(hour) || 0) + 1); });

  // ----- Costs -----
  const rangeExpenses = state.expenses.filter((e) => inRange(e.date));
  const expenses = sum(rangeExpenses, (e) => e.amount);
  const byCategory = expenseCategories.map((category) => ({ category, list: rangeExpenses.filter((e) => e.category === category) }))
    .map((e) => ({ ...e, amount: sum(e.list, (x) => x.amount) })).filter((e) => e.amount).sort((a, b) => b.amount - a.amount);
  const salariesPaid = state.salaries.filter((r) => r.status === "Paid" && inRange(r.paidOn));
  const thisMonth = monthISO();
  const monthPayroll = state.salaries.filter((r) => r.month === thisMonth);
  const pendingPayroll = state.salaries.filter((r) => r.status === "Pending");

  // ----- Operations -----
  const rangeBookings = state.bookings.filter((b) => inRange(b.date));
  const stockCost = state.products.reduce((s, p) => s + p.cost * p.stock, 0);
  const stockRetail = state.products.reduce((s, p) => s + p.price * p.stock, 0);
  const balances = state.customers.filter((c) => c.balance > 0);

  const rangeText = from || to ? `${from ? shortDate(from) : "All time"} — ${to ? shortDate(to) : "Today"}` : reportPeriod;
  const utilization = state.tables.length ? Math.round((state.tables.filter((t) => ["occupied", "paused"].includes(t.status)).length / state.tables.length) * 100) : 0;
  const pad = (h) => String(h).padStart(2, "0");

  const exportCsv = () => {
    csvDownload("cuecore-transactions.csv", [["Transaction ID", "Type", "Description", "Customer", "Amount BDT", "Method", "Date"], ...state.transactions.map((t) => [t.id, t.type, t.description, t.customer, t.amount, t.method, t.date])]);
    notify("cuecore-transactions.csv downloaded.", "success", "Export ready");
  };
  const exportSummary = () => {
    csvDownload("cuecore-report-summary.csv", [
      ["Report range", rangeText], [],
      ["Metric", "Value BDT"],
      ["Revenue", revenue], ["Expenses (incl. salaries)", expenses], ["Salaries paid", sum(salariesPaid, salaryNet)], ["Net", revenue - expenses], [],
      ["Expense category", "Amount BDT"], ...byCategory.map((e) => [e.category, e.amount]), [],
      ["Arcade coins sold", sum(arcadeSales, (t) => t.coins || 0)], ["Arcade amount BDT", sum(arcadeSales, (t) => t.amount)], [],
      ["Payment method", "Amount BDT"], ...payments.map(({ method, list }) => [method, sum(list, (t) => t.amount)]), [],
      ["Table", "Revenue BDT"], ...topTables.map(({ table, amount }) => [table.name, amount])
    ]);
    notify("cuecore-report-summary.csv downloaded.", "success", "Export ready");
  };

  return (
    <>
      {/* Header pills: live today. The toolbar pills below: totals for the chosen range. */}
      <PageHeading title="Reports" stats={[
        { label: "Today", value: <LiveMetric field="revenue" />, tone: "gold", title: "Settled + live session estimates" },
        { label: "Profit", value: <LiveMetric field="profit" />, tone: "success", title: "Today's revenue less today's expenses" },
        { label: "Playing", value: `${m.active}/${m.tables}`, tone: "info", onClick: () => setPage("tables"), title: "Open tables" },
        { label: "Low stock", value: lowStockCount(state), tone: lowStockCount(state) ? "warning" : "muted", onClick: () => setPage("inventory"), title: "Open inventory" }
      ]}>
        <button className="button button-sm" onClick={exportSummary} title="Export summary CSV"><Icon name="download" /><span className="btn-label">Summary</span></button>
        <button className="button button-sm" onClick={exportCsv} title="Export transactions CSV"><Icon name="download" /><span className="btn-label">Transactions</span></button>
      </PageHeading>

      <div className="toolbar">
        <div className="filter-pills">
          {["Today", "7 Days", "30 Days"].map((p) => (
            <button key={p} className={`filter-pill${reportPeriod === p && !from && !to ? " active" : ""}`} onClick={() => { setReportPeriod(p); setFrom(""); setTo(""); }}>{p}</button>
          ))}
        </div>
        <span className="muted">Custom</span>
        <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && <button className="button button-sm" onClick={() => { setFrom(""); setTo(""); }}>Clear</button>}
        <span className="toolbar-spacer"></span>
        <MiniStats label={`Totals for ${rangeText}`} items={[
          { label: "Revenue", value: money(revenue), tone: "gold", title: `${filtered.length} records · ${rangeText}` },
          { label: "Expenses", value: money(expenses), tone: "danger" },
          { label: "Net", value: money(revenue - expenses), tone: revenue - expenses < 0 ? "danger" : "success" },
          { label: "Utilization", value: `${utilization}%`, tone: "info", title: "Tables in play right now" }
        ]} />
      </div>

      <div className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><h2>Revenue trend</h2><p>Settled transactions</p></div></div>
          <RevenueChart period={reportPeriod} from={from} to={to} />
          <div className="analytics-strip">
            <div><span className="muted">Sessions</span><strong className="table-primary">{money(sum(sessionsClosed))}</strong></div>
            <div><span className="muted">Counter sales</span><strong className="table-primary">{money(sum(sales, (t) => t.amount))}</strong></div>
            <div><span className="muted">Live bills now</span><strong className="table-primary">{money(m.revenue - m.settledRevenue)}</strong></div>
            <div><span className="muted">Margin</span><strong className="table-primary">{revenue ? Math.round(((revenue - expenses) / revenue) * 100) : 0}%</strong></div>
          </div>
        </article>
        <ListPanel title="Payment methods" subtitle="Collected in range"
          rows={payments.map(({ method, list }) => [method, method, <>{list.length} transactions<Share value={sum(list, (t) => t.amount)} total={sum(filtered, (t) => t.amount)} /></>, money(sum(list, (t) => t.amount))])}
          empty={<EmptyState title="No payment records" description="Completed transactions in this range appear here." />} />
      </div>

      <DailyEarningSheet />

      <div className="two-col report-row">
        <ListPanel title="Revenue by table" subtitle="Closed sessions in range"
          rows={topTables.map(({ table, amount }) => [table.id, table.name, <>{table.category}<Share value={amount} total={revenue} /></>, money(amount)])}
          empty={<EmptyState title="No table revenue" description="End a session to create a saved record." />} />
        <ListPanel title="Top customers" subtitle="By spend in range"
          rows={topCustomers.map(({ c, amount }) => [c.id, c.name, `${c.membership} member`, money(amount)])}
          empty={<EmptyState title="No customer activity" description="Customer spend in this range appears here." />} />
      </div>

      <div className="two-col report-row">
        <ListPanel title="Expenses by category" subtitle={`${rangeExpenses.length} entries in range`}
          rows={byCategory.map(({ category, list, amount }) => [category, category, <>{list.length} entr{list.length === 1 ? "y" : "ies"}<Share value={amount} total={expenses} /></>, money(amount)])}
          empty={<EmptyState title="No expenses in range" description="Recorded costs appear here." />} />
        <ListPanel title="Payroll" subtitle="Staff salary summary"
          rows={salariesPaid.slice(-5).reverse().map((r) => [r.id, r.staffName, `${monthLabel(r.month, true)} · paid ${shortDate(r.paidOn)} · ${r.method}`, money(salaryNet(r))])}
          empty={<p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>No salaries paid in this range.</p>}>
          <div className="report-kpis">
            <div><span>Paid in range</span><strong>{money(sum(salariesPaid, salaryNet))}</strong></div>
            <div><span>{monthLabel(thisMonth, true)} payroll</span><strong>{money(sum(monthPayroll, salaryNet))}</strong></div>
            <div><span>Pending</span><strong className="text-warning">{money(sum(pendingPayroll, salaryNet))}</strong></div>
          </div>
          <button className="panel-link" style={{ marginBottom: 6 }} onClick={() => setPage("salary")}>Open salary <Icon name="arrow-right" /></button>
        </ListPanel>
      </div>

      <div className="two-col report-row">
        <article className="panel">
          <div className="panel-heading"><div><h2>Product sales</h2><p>Counter sales in range</p></div></div>
          <div className="settings-row"><div><strong>Counter sales</strong><span>{sales.length} completed sales</span></div><strong>{money(sum(sales, (t) => t.amount))}</strong></div>
          {soldProducts.size
            ? [...soldProducts.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5).map(([name, d]) => (
              <div key={name} className="settings-row"><div><strong>{name}</strong><span>{d.qty} units sold</span></div><strong>{money(d.amount)}</strong></div>
            ))
            : <p className="muted" style={{ fontSize: 12, margin: "9px 0 0" }}>Item-level history is recorded for new sales.</p>}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Arcade coins</h2><p>Coin sales in range · all time</p></div><button className="panel-link" onClick={() => setPage("arcade")}>Open arcade <Icon name="arrow-right" /></button></div>
          <div className="report-kpis">
            <div><span>Coins sold</span><strong>{sum(arcadeSales, (t) => t.coins || 0)}</strong></div>
            <div><span>Amount</span><strong className="text-gold">{money(sum(arcadeSales, (t) => t.amount))}</strong></div>
            <div><span>In stock</span><strong>{state.arcade.stock}</strong></div>
          </div>
          <div className="settings-row"><div><strong>All time</strong><span>{allArcade.length} sales · {sum(allArcade, (t) => t.coins || 0)} coins</span></div><strong>{money(sum(allArcade, (t) => t.amount))}</strong></div>
          <div className="settings-row"><div><strong>Coin price</strong><span>Change in Settings or Arcade</span></div><strong>{money(state.settings.arcadeCoinPrice)}</strong></div>
        </article>
      </div>

      <div className="two-col report-row">
        <ListPanel title="Peak hours" subtitle="Observed session starts"
          rows={[...peakHours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hour, count]) => [hour, `${pad(hour)}:00 – ${pad((hour + 1) % 24)}:00`, `${count} session start${count === 1 ? "" : "s"}`, count])}
          empty={<EmptyState title="No session history" description="Usage hours appear as sessions are saved." />} />
      </div>

      <div className="two-col report-row">
        <article className="panel">
          <div className="panel-heading"><div><h2>Bookings</h2><p>{rangeBookings.length} in range</p></div></div>
          <div className="report-kpis four">
            {BOOKING_STATUSES.map((status) => <div key={status}><span>{status}</span><strong>{rangeBookings.filter((b) => b.status === status).length}</strong></div>)}
          </div>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Stock & customers</h2><p>Current snapshot</p></div></div>
          <div className="report-kpis four">
            <div><span>Stock at cost</span><strong>{money(stockCost)}</strong></div>
            <div><span>Stock at retail</span><strong>{money(stockRetail)}</strong></div>
            <div><span>Customers</span><strong>{state.customers.filter((c) => c.id !== "cus-006").length}</strong></div>
            <div><span>Unpaid balances</span><strong className={balances.length ? "text-warning" : ""}>{money(sum(balances, (c) => c.balance))}</strong></div>
          </div>
        </article>
      </div>

      <article className="panel report-row">
        <div className="panel-heading">
          <div><h2>Recent transactions</h2><p>Latest in range</p></div>
          <button className="panel-link" onClick={() => setPage("pos")}>Open POS <Icon name="arrow-right" /></button>
        </div>
        <div className="transaction-list">
          {recent.length ? recent.map((t) => (
            <div key={t.id} className="transaction-row">
              <span className={`transaction-icon ${t.type === "session" ? "" : "sale"}`}><Icon name={t.type === "session" ? "table" : "receipt"} /></span>
              <div className="transaction-copy"><strong>{t.description}</strong><span>{t.customer} · {t.method} · {shortDate(t.date.slice(0, 10))} {timeLabel(t.date)}</span></div>
              <span className="transaction-amount">{money(t.amount)}</span>
            </div>
          )) : <EmptyState title="No transactions" description="Completed sessions and sales in this range appear here." />}
        </div>
      </article>
      <p className="note">Live totals are estimates for open sessions, not collected payments. Expenses include paid salaries.</p>
    </>
  );
}
