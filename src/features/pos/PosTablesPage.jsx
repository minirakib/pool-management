import { useState } from "react";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { LiveAmount, Timer } from "@/components/Live.jsx";
import { EmptyState, PageHeading, Segmented, StatusPill } from "@/components/ui";
import { useNow } from "@/hooks/useNow.js";
import { customerName, sessionBreakdown } from "@/lib/domain.js";
import { money, todayISO } from "@/lib/format.js";
import { useTableActions } from "@/features/tables/useTableActions.jsx";
import PosTransactions, { transactionCount } from "./PosTransactions.jsx";

/** Sum of every open table bill; ticks every second. */
function LiveTotal({ sessions }) {
  const { settings } = useStore();
  const now = useNow();
  return money(sessions.reduce((sum, { session, table }) => sum + sessionBreakdown(session, table, settings, now).total, 0));
}

function LiveBillCard({ session, table }) {
  const state = useStore();
  const act = useTableActions();
  const bill = sessionBreakdown(session, table, state.settings);
  return (
    <article className="panel live-bill-card" data-status={table.status}>
      <div className="panel-heading">
        <div><h3>{table.name} <span className="muted">· {table.category}</span></h3><p>{customerName(state, session)} · <Timer session={session} /></p></div>
        <StatusPill status={table.status} />
      </div>
      <div className="bill-current">
        <div><span>Table charge</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
        <div><span>Products · {session.products.reduce((n, i) => n + i.qty, 0)} items</span><strong>{money(bill.products)}</strong></div>
        <div><span>Current total</span><strong><LiveAmount session={session} table={table} /></strong></div>
      </div>
      <div className="snooker-actions">
        <button className="button button-sm" onClick={() => act.sessionDetails(table.id)}>View bill</button>
        <button className="button button-sm" onClick={() => act.addProduct(table.id)}><Icon name="plus" />Add product</button>
        <button className="button button-primary button-sm" onClick={() => act.end(table.id)}>Close session</button>
      </div>
    </article>
  );
}

/** POS → Table, in two tabs: Live bills (open tables, ready to close and pay) and Transactions (closed table bills). */
export default function PosTablesPage() {
  const state = useStore();
  const { setPage } = useUi();
  const act = useTableActions();
  const [tab, setTab] = useState("live");
  const activeSessions = state.sessions.map((session) => ({ session, table: state.tables.find((t) => t.id === session.tableId) })).filter((e) => e.table);
  const today = todayISO();
  const billsToday = state.transactions.filter((t) => t.type === "session" && t.date.slice(0, 10) === today);

  return (
    <>
      <PageHeading title="POS Table" stats={[
        { label: "Live bills", value: activeSessions.length, tone: "success" },
        { label: "Open total", value: <LiveTotal sessions={activeSessions} />, tone: "gold", title: "Running total of all open table bills" },
        { label: "Closed today", value: billsToday.length, tone: "info" },
        { label: "Collected today", value: money(billsToday.reduce((s, t) => s + (t.revenueAmount ?? t.amount), 0)), tone: "primary" }
      ]}>
        <button className="button button-sm" onClick={() => setPage("tables")}><Icon name="table" /><span className="btn-label">Tables</span></button>
        <button className="button button-sm button-primary" onClick={act.quickStart}><Icon name="play" /><span className="btn-label">Start game</span></button>
      </PageHeading>
      <div className="toolbar pos-tabs">
        <Segmented label="POS Table section" value={tab} onChange={setTab} options={[
          { id: "live", label: "Live bills", icon: "table", count: activeSessions.length },
          { id: "transactions", label: "Transactions", icon: "receipt", count: transactionCount(state, "tables") }
        ]} />
      </div>
      {tab === "transactions" ? <PosTransactions kind="tables" />
        : activeSessions.length
          ? <div className="table-grid">{activeSessions.map(({ session, table }) => <LiveBillCard key={session.id} session={session} table={table} />)}</div>
          : <article className="panel"><EmptyState title="No active table sessions" description="Start a game to track table time and products."><button className="button button-primary" onClick={act.quickStart}>Start a table</button></EmptyState></article>}
    </>
  );
}
