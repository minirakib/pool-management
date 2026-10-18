import { clothFor } from "../../lib/theme.js";
import { useState } from "react";
import { tableSession } from "../../app/actions.js";
import { useStore } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import { LiveAmount, Timer } from "../../components/Live.jsx";
import SnookerTable, { MiniTable } from "../../components/SnookerTable.jsx";
import TableOverlay from "../../components/TableOverlay.jsx";
import { EmptyState, PageHeading, SearchBox, Select, StatusPill } from "../../components/ui.jsx";
import { categories } from "../../lib/constants.js";
import { csvDownload } from "../../lib/download.js";
import { customerName, dashboardMetrics } from "../../lib/domain.js";
import { money, timeLabel } from "../../lib/format.js";
import { useTableActions } from "./useTableActions.jsx";

// [status, pill label, tone]; COUNT_KEY maps a status to its dashboardMetrics count.
const STATUS_FILTERS = [["all", "All", "primary"], ["occupied", "Playing", "success"], ["available", "Free", "info"], ["paused", "Paused", "warning"], ["maintenance", "Service", "danger"]];
const COUNT_KEY = { occupied: "active", available: "available", paused: "paused", maintenance: "maintenance" };
const tableNumber = (table) => (table.name.match(/\d+/)?.[0] || table.name.slice(0, 2)).padStart(2, "0");

export function TableActionButtons({ table }) {
  const act = useTableActions();
  const id = table.id;
  if (table.status === "available") return (
    <>
      <button className="button button-primary button-sm" onClick={() => act.start(id)}><Icon name="play" />Start game</button>
      <button className="button button-sm" onClick={() => act.details(id)}>Details</button>
      <button className="icon-button" onClick={() => act.edit(id)} aria-label="Edit table"><Icon name="more" /></button>
    </>
  );
  if (table.status === "maintenance") return (
    <>
      <button className="button button-sm" onClick={() => act.details(id)}>Details</button>
      <button className="button button-sm" onClick={() => act.edit(id)}>Edit</button>
      <button className="button button-sm" onClick={() => act.release(id)}><Icon name="check" />Set available</button>
    </>
  );
  return (
    <>
      <button className="button button-sm" onClick={() => act.sessionDetails(id)}>Details</button>
      {table.status === "paused"
        ? <button className="button button-primary button-sm" onClick={() => act.resume(id)}><Icon name="play" />Resume</button>
        : <button className="button button-sm" onClick={() => act.pause(id)}><Icon name="pause" />Pause</button>}
      <button className="button button-sm button-danger" onClick={() => act.end(id)}><Icon name="stop" />End</button>
    </>
  );
}

function mainLabel(table, customer) {
  return { occupied: customer, paused: "Session paused", maintenance: "Service required" }[table.status] || "Ready for a frame";
}

/** Makes a whole card/row open the table details popup; action buttons inside stop the click. */
function useOpenDetails(table) {
  const act = useTableActions();
  const open = () => act.details(table.id);
  return {
    role: "button", tabIndex: 0, "aria-label": `${table.name} details`, onClick: open,
    onKeyDown: (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }
  };
}
const stop = (e) => e.stopPropagation();

function TableCard({ table }) {
  const state = useStore();
  const session = tableSession(state, table);
  const label = mainLabel(table, session ? customerName(state, session) : "");
  return (
    <article className="snooker-card clickable" data-status={table.status} {...useOpenDetails(table)}>
      <div className="snooker-card-top">
        <span className="table-number">{tableNumber(table)}</span>
        <div className="snooker-head"><div className="snooker-title">{table.name}</div><div className="snooker-meta">{table.category} · {money(table.rate)}/hour</div></div>
        <StatusPill status={table.status} />
      </div>
      {/* The running timer sits in the middle of the table; the price stays bottom right. */}
      <SnookerTable cloth={clothFor(table, state.settings)}>{session && <TableOverlay table={table} session={session} />}</SnookerTable>
      <div className="snooker-card-bottom">
        <div className="session-identity">
          <strong>{label}</strong>
          <span>{session
            ? `Started ${timeLabel(session.originalStartedAt || session.startedAt)} · ${session.billingMode === "hour" ? "per started hour" : "per minute"}`
            : table.status === "available" ? "Available now" : "Temporarily out of play"}</span>
        </div>
        <div className="table-charge">
          <strong>{session ? <LiveAmount session={session} table={table} /> : money(table.rate)}</strong>
          <span>{session ? "current bill" : "per hour"}</span>
        </div>
      </div>
      <div className="snooker-actions" onClick={stop} onKeyDown={stop}><TableActionButtons table={table} /></div>
    </article>
  );
}

function CompactTableRow({ table }) {
  const state = useStore();
  const session = tableSession(state, table);
  return (
    <article className="compact-table-row clickable" data-status={table.status} {...useOpenDetails(table)}>
      <div className="compact-ident"><MiniTable cloth={clothFor(table, state.settings)} /><div><strong className="table-primary">{table.name}</strong><span className="table-sub">{table.category} · {money(table.rate)}/hr</span></div></div>
      <div><StatusPill status={table.status} /><span className="table-sub">{mainLabel(table, session ? customerName(state, session) : "")}</span></div>
      <div>
        <strong className="table-primary">{session ? <Timer session={session} className="" /> : "—"}</strong>
        <span className="table-sub">{session ? <LiveAmount session={session} table={table} /> : "No session"}</span>
      </div>
      <div className="table-sub">Rate {money(table.rate)}/hour</div>
      <div className="table-actions" onClick={stop} onKeyDown={stop}><TableActionButtons table={table} /></div>
    </article>
  );
}

export default function TablesPage() {
  const state = useStore();
  const { notify, search, setSearch } = useUi();
  const act = useTableActions();
  const [statusFilter, setStatusFilter] = useState("all");
  const [category, setCategory] = useState("All");
  const [view, setView] = useState("grid");
  const counts = dashboardMetrics(state);

  const filtered = state.tables.filter((t) =>
    (statusFilter === "all" || t.status === statusFilter) &&
    (category === "All" || t.category === category) &&
    `${t.name} ${t.category}`.toLowerCase().includes(search.toLowerCase()));

  const exportCsv = () => {
    csvDownload("cuecore-tables.csv", [["Table", "Category", "Hourly rate BDT", "Status"], ...state.tables.map((t) => [t.name, t.category, t.rate, t.status])]);
    notify("cuecore-tables.csv downloaded.", "success", "Export ready");
  };

  return (
    <>
      {/* The stat pills are also the status filter, so there is no separate filter row. */}
      <PageHeading title="Tables" stats={STATUS_FILTERS.map(([status, label, tone]) => ({
        label, tone, value: status === "all" ? counts.tables : counts[COUNT_KEY[status]],
        active: statusFilter === status, onClick: () => setStatusFilter(statusFilter === status ? "all" : status)
      }))}>
        <Select className="heading-select" aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} options={[["All", "All types"], ...categories]} />
        <div className="segmented">
          <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view" title="Grid view"><Icon name="grid" /></button>
          <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view" title="List view"><Icon name="list" /></button>
        </div>
        <button className="button button-sm" onClick={exportCsv} title="Export CSV"><Icon name="download" /><span className="btn-label">CSV</span></button>
        <button className="button button-primary button-sm" onClick={act.add}><Icon name="plus" />Add table</button>
      </PageHeading>
      <SearchBox className="page-search" placeholder="Search tables…" value={search} onChange={setSearch} />
      {!filtered.length ? <EmptyState title="No tables match these filters" description="Try another status or category." />
        : view === "grid"
          ? <div className="table-grid">{filtered.map((t) => <TableCard key={t.id} table={t} />)}</div>
          : <div className="compact-table-list">{filtered.map((t) => <CompactTableRow key={t.id} table={t} />)}</div>}
    </>
  );
}
