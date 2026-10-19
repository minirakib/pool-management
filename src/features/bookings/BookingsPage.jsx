import { useState } from "react";
import { cycleBookingStatus, deleteRecord } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { ConfirmModal } from "@/components/Modal.jsx";
import { EmptyState, PageHeading, SearchBox, Select, StatusPill } from "@/components/ui";
import { shortDate, todayISO } from "@/lib/format.js";
import BookingFormModal from "./BookingFormModal.jsx";

const STATUSES = ["All statuses", "Pending", "Confirmed", "Completed", "Cancelled"];
const STATUS_TONE = { Confirmed: "success", Pending: "warning", Completed: "info", Cancelled: "danger" };

function ViewToggle({ view, setView }) {
  return (
    <div className="segmented">
      <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><Icon name="list" />List</button>
      <button className={view === "schedule" ? "active" : ""} onClick={() => setView("schedule")}><Icon name="calendar" />Schedule</button>
    </div>
  );
}

export default function BookingsPage() {
  const state = useStore();
  const { openModal, perform, search, setSearch } = useUi();
  const [status, setStatus] = useState("All statuses");
  const [date, setDate] = useState(todayISO());
  const [tableFilter, setTableFilter] = useState("All tables");
  const [view, setView] = useState("list");

  const customer = (id) => state.customers.find((c) => c.id === id)?.name || "Guest";
  const table = (id) => state.tables.find((t) => t.id === id)?.name || "Any table";
  const rows = state.bookings
    .filter((b) => (status === "All statuses" || b.status === status)
      && (!date || b.date === date)
      && (tableFilter === "All tables" || b.tableId === state.tables.find((t) => t.name === tableFilter)?.id)
      && `${state.customers.find((c) => c.id === b.customerId)?.name || ""} ${b.phone} ${state.tables.find((t) => t.id === b.tableId)?.name || ""}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const onDate = state.bookings.filter((b) => !date || b.date === date);
  const todayBookings =rows.filter((b) => b.date === todayISO()).sort((a, b) => a.start.localeCompare(b.start));
  const newBooking = () => openModal(<BookingFormModal />);
  const remove = (b) => openModal(<ConfirmModal title="Delete booking?" message={`This will permanently remove ${b.id} from the saved demo data.`} confirmLabel="Delete" danger onConfirm={() => perform(deleteRecord, "booking", b.id)} />);

  return (
    <>
      <PageHeading title="Bookings" stats={[
        { label: date === todayISO() ? "Today" : date ? shortDate(date) : "All dates", value: onDate.length, tone: "primary", active: status === "All statuses", onClick: () => setStatus("All statuses") },
        ...STATUSES.slice(1).map((s) => ({ label: s, value: onDate.filter((b) => b.status === s).length, tone: STATUS_TONE[s], active: status === s, onClick: () => setStatus(status === s ? "All statuses" : s) }))
      ]}>
        <input type="date" className="heading-select" aria-label="Filter booking date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select className="heading-select" aria-label="Filter booking table" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} options={["All tables", ...state.tables.map((t) => t.name)]} />
        <button className="button button-primary button-sm" onClick={newBooking}><Icon name="plus" />New booking</button>
      </PageHeading>
      <SearchBox className="page-search" placeholder="Search customer or table…" value={search} onChange={setSearch} />
      <div className="two-col">
        <article className="panel" style={view === "schedule" ? { display: "none" } : undefined}>
          <div className="panel-heading"><div><h2>Reservations</h2><p>{rows.length} bookings found</p></div><ViewToggle view={view} setView={setView} /></div>
          {rows.length ? (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Table / date</th><th>Time</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td><span className="table-primary">{customer(b.customerId)}</span><span className="table-sub">{b.phone}</span></td>
                      <td>{table(b.tableId)}<span className="table-sub">{shortDate(b.date)} · {b.duration}h</span></td>
                      <td>{b.start}</td>
                      <td><button className="filter-pill" onClick={() => perform(cycleBookingStatus, b.id)}><StatusPill status={b.status} /></button></td>
                      <td><div className="table-actions">
                        <button className="button button-sm" onClick={() => openModal(<BookingFormModal bookingId={b.id} />)}>Edit</button>
                        <button className="icon-button" onClick={() => remove(b)} aria-label="Delete booking"><Icon name="x" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No bookings found" description="Create a booking or adjust your filters."><button className="button button-primary" onClick={newBooking}>New booking</button></EmptyState>
          )}
        </article>
        <article className="panel" style={view === "list" ? { display: "none" } : undefined}>
          <div className="panel-heading">
            <div><h2>Today's schedule</h2><p>{shortDate(todayISO())} · {todayBookings.length} reservation{todayBookings.length === 1 ? "" : "s"}</p></div>
            <ViewToggle view={view} setView={setView} />
          </div>
          {todayBookings.length ? (
            <div className="schedule-grid">
              {todayBookings.map((b) => (
                <div key={b.id} className="schedule-row">
                  <div className="schedule-time">{b.start}</div>
                  <div className="schedule-slot"><strong>{customer(b.customerId)} · {table(b.tableId)}</strong><span>{b.duration} hour{b.duration === 1 ? "" : "s"} · {b.status}</span></div>
                </div>
              ))}
            </div>
          ) : <EmptyState title="Nothing scheduled today" description="New bookings will appear in this schedule." />}
        </article>
      </div>
      <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>Confirmed bookings are checked for table/time overlap. Times use this device's local timezone.</p>
    </>
  );
}
