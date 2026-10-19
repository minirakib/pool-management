import { useEffect, useRef, useState } from "react";
import { deleteRecord } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { ConfirmModal } from "@/components/Modal.jsx";
import { EmptyState, PageHeading, SearchBox, Select } from "@/components/ui";
import { expenseCategories, expenseMethods } from "@/lib/constants.js";
import { csvDownload } from "@/lib/download.js";
import { money, monthLabel, shortDate } from "@/lib/format.js";
import ExpenseFormModal from "./ExpenseFormModal.jsx";
import { defaultPeriod, inPeriod, PERIOD_MODES, periodRange, shiftPeriod, switchMode, totalsBy, trendBuckets } from "./period.js";

const ALL_CATEGORIES = "All categories";
const ALL_METHODS = "All methods";
const CURRENT_LABEL = { day: "Today", month: "This month", year: "This year" };
const sumOf = (list) => list.reduce((s, e) => s + Number(e.amount), 0);

/** Day / month / year picker with previous and next arrows. */
function PeriodPicker({ period, setPeriod, years }) {
  const set = (patch) => setPeriod((p) => ({ ...p, ...patch }));
  if (period.mode === "custom") return (
    <div className="period-custom">
      <input type="date" aria-label="From date" value={period.from} max={period.to || undefined} onChange={(e) => set({ from: e.target.value })} />
      <span className="muted">to</span>
      <input type="date" aria-label="To date" value={period.to} min={period.from || undefined} onChange={(e) => set({ to: e.target.value })} />
      {(period.from || period.to) && <button className="button button-sm button-quiet" onClick={() => set({ from: "", to: "" })}>Clear</button>}
    </div>
  );
  if (period.mode === "all") return null;
  const input = {
    day: <input type="date" aria-label="Day" value={period.day} onChange={(e) => e.target.value && set({ day: e.target.value })} />,
    month: <input type="month" aria-label="Month" value={period.month} onChange={(e) => e.target.value && set({ month: e.target.value })} />,
    year: <select aria-label="Year" value={period.year} onChange={(e) => set({ year: e.target.value })}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
  }[period.mode];
  return (
    <div className="period-step">
      <button className="icon-button" onClick={() => setPeriod((p) => shiftPeriod(p, -1))} aria-label={`Previous ${period.mode}`}><Icon name="chevron-down" className="rot-90" /></button>
      {input}
      <button className="icon-button" onClick={() => setPeriod((p) => shiftPeriod(p, 1))} aria-label={`Next ${period.mode}`}><Icon name="chevron-down" className="rot-270" /></button>
    </div>
  );
}

/** CSV button with a small menu of export shapes. */
function CsvMenu({ disabled, onExport }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const pick = (kind) => () => { setOpen(false); onExport(kind); };
  return (
    <div className="menu-anchor" ref={ref}>
      <button className="button button-sm" onClick={() => setOpen((o) => !o)} disabled={disabled} aria-expanded={open} title="Download CSV for the selected period">
        <Icon name="download" /><span className="btn-label">CSV</span><Icon name="chevron-down" />
      </button>
      <div className="menu-popover csv-menu" hidden={!open}>
        <button onClick={pick("entries")}><Icon name="list" /><span>All entries<small>Every expense in this period</small></span></button>
        <button onClick={pick("daily")}><Icon name="calendar" /><span>Daily totals<small>One row per day</small></span></button>
        <button onClick={pick("monthly")}><Icon name="chart" /><span>Monthly totals<small>One row per month</small></span></button>
        <button onClick={pick("category")}><Icon name="box" /><span>By category<small>Totals per category</small></span></button>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const state = useStore();
  const { openModal, notify, perform, search, setSearch } = useUi();
  const [period, setPeriod] = useState(defaultPeriod);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [method, setMethod] = useState(ALL_METHODS);
  const { expenses } = state;

  const range = periodRange(period);
  const inRange = expenses.filter((e) => inPeriod(range, e.date));
  // Category and method narrow the list; the category breakdown ignores the category filter so it can switch between them.
  const byMethod = inRange.filter((e) => method === ALL_METHODS || e.method === method)
    .filter((e) => `${e.title} ${e.category} ${e.description} ${e.recordedBy}`.toLowerCase().includes(search.toLowerCase()));
  const rows = byMethod.filter((e) => category === ALL_CATEGORIES || e.category === category).sort((a, b) => b.date.localeCompare(a.date));
  const total = sumOf(rows);
  const byCategory = totalsBy(byMethod, (e) => e.category).sort((a, b) => b[1].amount - a[1].amount);
  const categoryTotal = sumOf(byMethod);
  const trend = trendBuckets(rows, period, range);
  const trendMax = Math.max(1, ...trend.map((b) => b.amount));

  const dates = rows.map((e) => e.date).sort();
  const spanFrom = range.from || dates[0];
  const spanTo = range.to || dates.at(-1);
  const days = spanFrom && spanTo ? Math.max(1, Math.round((new Date(`${spanTo}T12:00:00`) - new Date(`${spanFrom}T12:00:00`)) / 86_400_000) + 1) : 0;
  const years = [...new Set([String(new Date().getFullYear()), period.year, ...expenses.map((e) => e.date.slice(0, 4))])].sort().reverse();
  const methods = [...new Set([...expenseMethods, ...expenses.map((e) => e.method)])];
  const filtersOn = category !== ALL_CATEGORIES || method !== ALL_METHODS || search;

  const exportCsv = (kind) => {
    const filters = [category !== ALL_CATEGORIES && category, method !== ALL_METHODS && method].filter(Boolean).join(" · ");
    const header = [["Period", range.label], ...(filters ? [["Filters", filters]] : []), []];
    const sheets = {
      entries: [["Date", "Expense", "Category", "Payment method", "Amount BDT", "Recorded by", "Description"],
        ...[...rows].reverse().map((e) => [e.date, e.title, e.category, e.method, e.amount, e.recordedBy, e.description]),
        [], ["", "", "", "TOTAL", total]],
      daily: [["Date", "Entries", "Total BDT"], ...totalsBy(rows, (e) => e.date).map(([d, v]) => [d, v.count, v.amount]), [], ["TOTAL", rows.length, total]],
      monthly: [["Month", "Entries", "Total BDT"], ...totalsBy(rows, (e) => e.date.slice(0, 7)).map(([m, v]) => [monthLabel(m), v.count, v.amount]), [], ["TOTAL", rows.length, total]],
      category: [["Category", "Entries", "Total BDT", "Share %"], ...totalsBy(rows, (e) => e.category).sort((a, b) => b[1].amount - a[1].amount).map(([c, v]) => [c, v.count, v.amount, total ? Math.round((v.amount / total) * 1000) / 10 : 0]), [], ["TOTAL", rows.length, total, 100]]
    };
    const filename = `cuecore-expenses-${kind}-${range.file}.csv`;
    csvDownload(filename, [...header, ...sheets[kind]]);
    notify(`${filename} downloaded.`, "success", "Export ready");
  };
  const remove = (e) => openModal(<ConfirmModal title="Delete expense?" message={`This will permanently remove ${e.title} from the saved demo data.${e.salaryId ? " The linked salary goes back to pending." : ""}`} confirmLabel="Delete" danger onConfirm={() => perform(deleteRecord, "expense", e.id)} />);
  const edit = (e) => openModal(<ExpenseFormModal expenseId={e.id} />);
  const top = byCategory[0];

  return (
    <>
      <PageHeading title="Expenses" stats={[
        { label: "Total", value: money(total), tone: "danger", title: range.label },
        { label: "Entries", value: rows.length, tone: "primary" },
        days > 1 && { label: "Daily avg", value: money(total / days), tone: "warning", title: `${days} days` },
        top && { label: "Top", value: top[0], tone: "gold", title: money(top[1].amount) }
      ]}>
        <CsvMenu disabled={!rows.length} onExport={exportCsv} />
        <button className="button button-primary button-sm" onClick={() => openModal(<ExpenseFormModal />)}><Icon name="plus" />Record expense</button>
      </PageHeading>

      <div className="toolbar period-bar">
        <div className="segmented" role="tablist" aria-label="Period">
          {PERIOD_MODES.map(([mode, label]) => (
            <button key={mode} role="tab" aria-selected={period.mode === mode} className={period.mode === mode ? "active" : ""} onClick={() => setPeriod((p) => switchMode(p, mode))}>{label}</button>
          ))}
        </div>
        <PeriodPicker period={period} setPeriod={setPeriod} years={years} />
        {CURRENT_LABEL[period.mode] && period[period.mode] !== defaultPeriod()[period.mode] && (
          <button className="button button-sm button-quiet" onClick={() => setPeriod((p) => ({ ...p, [p.mode]: defaultPeriod()[p.mode] }))}>{CURRENT_LABEL[period.mode]}</button>
        )}
        <span className="toolbar-spacer"></span>
        <Select aria-label="Filter category" value={category} onChange={(e) => setCategory(e.target.value)} options={[ALL_CATEGORIES, ...expenseCategories]} />
        <Select aria-label="Filter payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={[ALL_METHODS, ...methods]} />
        {filtersOn && <button className="button button-sm button-quiet" onClick={() => { setCategory(ALL_CATEGORIES); setMethod(ALL_METHODS); setSearch(""); }}>Reset</button>}
        <SearchBox className="page-search" placeholder="Search expenses…" value={search} onChange={setSearch} />
      </div>

      <div className="two-col expenses-layout">
        <div className="expense-side">
          {trend.length > 1 && (
            <article className="panel">
              <div className="panel-heading"><div><h2>Trend</h2><p>{range.label}</p></div></div>
              <div className="expense-trend" style={{ "--bars": trend.length }}>
                {trend.map((b) => (
                  <div key={b.key} className={`trend-bar${b.amount ? "" : " empty"}`} title={`${b.title} · ${money(b.amount)}`}>
                    <i style={{ height: `${b.amount ? Math.max(4, (b.amount / trendMax) * 100) : 2}%` }}></i>
                    {(trend.length <= 12 || Number(b.label) % 5 === 1) && <span>{b.label}</span>}
                  </div>
                ))}
              </div>
            </article>
          )}
          <article className="panel">
            <div className="panel-heading"><div><h2>By category</h2><p>Click to filter</p></div></div>
            {byCategory.length ? byCategory.map(([name, v]) => (
              <button key={name} className={`category-row${category === name ? " active" : ""}`} onClick={() => setCategory(category === name ? ALL_CATEGORIES : name)}>
                <div><strong>{name}</strong><span>{v.count} entr{v.count === 1 ? "y" : "ies"} · {categoryTotal ? Math.round((v.amount / categoryTotal) * 100) : 0}%</span>
                  <span className="share-bar"><i style={{ width: `${categoryTotal ? Math.max(3, (v.amount / categoryTotal) * 100) : 0}%` }}></i></span></div>
                <strong>{money(v.amount)}</strong>
              </button>
            )) : <EmptyState title="Nothing in this period" description="Pick another period or record an expense." />}
          </article>
        </div>

        <article className="panel">
          <div className="panel-heading">
            <div><h2>{range.label}</h2><p>{rows.length} expense{rows.length === 1 ? "" : "s"}{category !== ALL_CATEGORIES ? ` · ${category}` : ""}{method !== ALL_METHODS ? ` · ${method}` : ""}</p></div>
          </div>
          {rows.length ? (
            <div className="data-table-wrap">
              <table className="data-table expense-table">
                <thead><tr><th>Expense</th><th>Date</th><th>Method</th><th className="num">Amount</th><th></th></tr></thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className="clickable-row" tabIndex={0} onClick={() => edit(e)} onKeyDown={(ev) => { if (ev.target === ev.currentTarget && ev.key === "Enter") edit(e); }}>
                      <td><span className="table-primary">{e.title}</span><span className="table-sub">{e.category}{e.salaryId ? " · payroll" : ""}{e.description ? ` · ${e.description}` : ""}</span></td>
                      <td>{shortDate(e.date)}<span className="table-sub">{e.recordedBy}</span></td>
                      <td>{e.method}</td>
                      <td className="table-primary num">{money(e.amount)}</td>
                      <td onClick={(ev) => ev.stopPropagation()}><div className="table-actions">
                        <button className="icon-button" onClick={() => edit(e)} aria-label={`Edit ${e.title}`}><Icon name="edit" /></button>
                        <button className="icon-button" onClick={() => remove(e)} aria-label="Delete expense"><Icon name="x" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={3}>Total · {rows.length} entr{rows.length === 1 ? "y" : "ies"}</td><td className="num">{money(total)}</td><td></td></tr></tfoot>
              </table>
            </div>
          ) : <EmptyState title="No expenses found" description={filtersOn ? "Try another category, method or search." : "Nothing recorded in this period."} />}
        </article>
      </div>
    </>
  );
}
