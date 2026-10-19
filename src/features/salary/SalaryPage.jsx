import { useState } from "react";
import { generatePayroll } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { Avatar, EmptyState, PageHeading, SearchBox, StatusPill } from "@/components/ui";
import { salaryNet } from "@/lib/domain.js";
import { csvDownload } from "@/lib/download.js";
import { money, monthISO, monthLabel, shortDate } from "@/lib/format.js";
import { PaySalaryModal, PayslipModal, SalaryFormModal } from "./SalaryModals.jsx";

const shiftMonth = (month, delta) => {
  const [y, m] = month.split("-").map(Number);
  return monthISO(new Date(y, m - 1 + delta, 1));
};
const total = (list) => list.reduce((s, r) => s + salaryNet(r), 0);
const stop = (e) => e.stopPropagation();

export default function SalaryPage() {
  const state = useStore();
  const { openModal, notify, perform, search, setSearch } = useUi();
  const [month, setMonth] = useState(monthISO);
  const [status, setStatus] = useState("All");

  const monthRecords = state.salaries.filter((r) => r.month === month);
  const paid = monthRecords.filter((r) => r.status === "Paid");
  const pending = monthRecords.filter((r) => r.status === "Pending");
  const payroll = total(monthRecords);
  const paidPct = payroll ? Math.round((total(paid) / payroll) * 100) : 0;
  const rows = monthRecords
    .filter((r) => status === "All" || r.status === status)
    .filter((r) => `${r.staffName} ${r.role}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.status.localeCompare(b.status) || a.staffName.localeCompare(b.staffName));

  const active = state.staff.filter((m) => m.status === "Active");
  const missing = active.filter((m) => m.salary > 0 && !monthRecords.some((r) => r.staffId === m.id));
  const history = Array.from({ length: 6 }, (_, i) => {
    const key = shiftMonth(month, i - 5);
    return { key, amount: total(state.salaries.filter((r) => r.month === key && r.status === "Paid")) };
  });
  const historyMax = Math.max(1, ...history.map((h) => h.amount));

  const exportCsv = () => {
    csvDownload(`cuecore-salary-${month}.csv`, [
      ["Staff", "Role", "Month", "Base", "Bonus", "Overtime", "Deduction", "Advance", "Net pay", "Status", "Paid on", "Method", "Notes"],
      ...monthRecords.map((r) => [r.staffName, r.role, r.month, r.base, r.bonus, r.overtime, r.deduction, r.advance, salaryNet(r), r.status, r.paidOn, r.method, r.notes])
    ]);
    notify(`cuecore-salary-${month}.csv downloaded.`, "success", "Export ready");
  };
  const open = (r) => openModal(<PayslipModal salaryId={r.id} />);

  return (
    <>
      {/* Paid / Pending pills filter the payroll table. */}
      <PageHeading title="Salary" stats={[
        { label: "Payroll", value: money(payroll), tone: "primary", active: status === "All", onClick: () => setStatus("All") },
        { label: "Paid", value: money(total(paid)), tone: "success", active: status === "Paid", onClick: () => setStatus(status === "Paid" ? "All" : "Paid"), title: `${paid.length} staff` },
        { label: "Pending", value: money(total(pending)), tone: pending.length ? "warning" : "muted", active: status === "Pending", onClick: () => setStatus(status === "Pending" ? "All" : "Pending"), title: `${pending.length} staff` }
      ]}>
        <button className="button button-sm" onClick={exportCsv} disabled={!monthRecords.length} title="Export CSV"><Icon name="download" /><span className="btn-label">CSV</span></button>
        <button className="button button-sm" onClick={() => perform(generatePayroll, month)} title="Create pending entries for active staff"><Icon name="bolt" /><span className="btn-label">Run payroll</span></button>
        <button className="button button-primary button-sm" onClick={() => openModal(<SalaryFormModal month={month} />)}><Icon name="plus" />Add salary</button>
      </PageHeading>

      <div className="toolbar slim-toolbar">
        <div className="month-nav">
          <button className="icon-button" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Previous month"><Icon name="chevron-down" className="rot-90" /></button>
          <label className="month-nav-label">
            <strong>{monthLabel(month)}</strong>
            <input type="month" aria-label="Salary month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          </label>
          <button className="icon-button" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Next month"><Icon name="chevron-down" className="rot-270" /></button>
        </div>
        {month !== monthISO() && <button className="button button-sm button-quiet" onClick={() => setMonth(monthISO())}>This month</button>}
        <span className="toolbar-spacer"></span>
        {monthRecords.length > 0 && (
          <div className="inline-progress" title={`${paid.length} of ${monthRecords.length} paid`}>
            <span>{paidPct}% paid</span>
            <div className="payroll-progress"><i style={{ width: `${paidPct}%` }}></i></div>
          </div>
        )}
        <SearchBox className="page-search" placeholder="Search staff…" value={search} onChange={setSearch} />
      </div>

      <div className="salary-layout">
        <article className="panel">
          <div className="panel-heading">
            <div><h2>Payroll · {monthLabel(month, true)}</h2><p>Click a row to open the payslip</p></div>
          </div>
          {rows.length ? (
            <div className="data-table-wrap">
              <table className="data-table salary-table">
                <thead><tr><th>Staff</th><th>Base</th><th>Adjustments</th><th>Net pay</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="clickable-row" tabIndex={0} onClick={() => open(r)} onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === "Enter") open(r); }}>
                      <td><div className="staff-cell"><Avatar name={r.staffName} /><div><span className="table-primary">{r.staffName}</span><span className="table-sub">{r.role}</span></div></div></td>
                      <td>{money(r.base)}</td>
                      <td className="adjust-cell">
                        {r.bonus + r.overtime > 0 && <span className="amount-plus">+{money(r.bonus + r.overtime)}</span>}
                        {r.deduction + r.advance > 0 && <span className="amount-minus">−{money(r.deduction + r.advance)}</span>}
                        {!(r.bonus + r.overtime + r.deduction + r.advance) && "—"}
                      </td>
                      <td className="table-primary net-cell">{money(salaryNet(r))}</td>
                      <td><StatusPill status={r.status} />{r.status === "Paid" && <span className="table-sub">{shortDate(r.paidOn)} · {r.method}</span>}</td>
                      <td onClick={stop}><div className="table-actions">
                        {r.status === "Pending" && <button className="button button-primary button-sm" onClick={() => openModal(<PaySalaryModal salaryId={r.id} />)}><Icon name="cash" />Pay</button>}
                        <button className="icon-button" onClick={() => openModal(<SalaryFormModal salaryId={r.id} />)} aria-label={`Edit ${r.staffName} salary`}><Icon name="edit" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title={monthRecords.length ? "No entries match" : "No payroll for this month"} description={monthRecords.length ? "Try another status or search." : "Run payroll to create entries for every active staff member, or add one manually."}>
              {!monthRecords.length && <button className="button button-primary" onClick={() => perform(generatePayroll, month)}><Icon name="bolt" />Run payroll</button>}
            </EmptyState>
          )}
        </article>

        <div className="salary-side">
          <article className="panel">
            <div className="panel-heading"><div><h2>Team salaries</h2><p>Active staff · {monthLabel(month, true)}</p></div></div>
            {active.map((m) => {
              const entry = monthRecords.find((r) => r.staffId === m.id);
              return (
                <div key={m.id} className="roster-row">
                  <Avatar name={m.name} />
                  <div className="roster-copy"><strong>{m.name}</strong><span>{m.role} · {m.salary ? `${money(m.salary)}/mo` : "No salary set"}</span></div>
                  {entry
                    ? <button className="roster-state" onClick={() => open(entry)}><StatusPill status={entry.status} /></button>
                    : m.salary > 0 && <button className="button button-sm" onClick={() => openModal(<SalaryFormModal staffId={m.id} month={month} />)}><Icon name="plus" />Add</button>}
                </div>
              );
            })}
            {missing.length > 0 && <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>{missing.length} staff member{missing.length === 1 ? " has" : "s have"} no entry for this month yet.</p>}
          </article>

          <article className="panel">
            <div className="panel-heading"><div><h2>Paid history</h2><p>Last 6 months</p></div></div>
            <div className="history-bars">
              {history.map((h) => (
                <button key={h.key} className={`history-bar${h.key === month ? " current" : ""}`} onClick={() => setMonth(h.key)} title={`${monthLabel(h.key)} · ${money(h.amount)}`}>
                  <span className="history-value">{h.amount ? `${Math.round(h.amount / 1000)}k` : "—"}</span>
                  <i style={{ height: `${Math.max(4, (h.amount / historyMax) * 100)}%` }}></i>
                  <span className="history-label">{monthLabel(h.key, true).split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
