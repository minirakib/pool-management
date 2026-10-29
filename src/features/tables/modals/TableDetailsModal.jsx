import { findTable, tableSession } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import Icon from "@/components/Icon.jsx";
import { LiveAmount, Timer } from "@/components/Live.jsx";
import Modal, { CloseFooter } from "@/components/Modal.jsx";
import SnookerTable from "@/components/snooker/SnookerTable.jsx";
import TableOverlay from "@/components/snooker/TableOverlay.jsx";
import { Avatar, StatusPill } from "@/components/ui";
import { clothColors } from "@/lib/constants.js";
import { billingLabel, customerName, gameMinutesOf, hourTypeLabel, rateFor, ratesLabel } from "@/lib/domain.js";
import { money, shortDate, timeLabel, todayISO } from "@/lib/format.js";
import { clothFor } from "@/lib/theme.js";
import { useTableActions } from "../useTableActions.jsx";
import { PlayersPanel } from "./PlayersPanel.jsx";
import { muted, tableChargeLabel } from "./shared.jsx";

export function TableDetailsModal({ tableId }) {
  const state = useStore();
  const act = useTableActions();
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  if (!table) return null;
  const name = session && customerName(state, session);
  const previousBalance = session ? state.customers.find((c) => c.id === session.customerId)?.balance || 0 : 0;
  const today = todayISO();
  const todays = state.transactions.filter((t) => t.tableId === table.id && t.date.slice(0, 10) === today);
  const upcoming = state.bookings
    .filter((b) => b.tableId === table.id && b.date >= today && ["Confirmed", "Pending"].includes(b.status))
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)).slice(0, 3);
  const cloth = clothColors.find((c) => c.id === clothFor(table, state.settings));

  const statusControls = {
    available: <button className="button button-primary" onClick={() => act.start(table.id)}><Icon name="play" />Start game</button>,
    maintenance: <button className="button" onClick={() => act.release(table.id)}><Icon name="check" />Set available</button>,
    paused: <button className="button button-primary" onClick={() => act.resume(table.id)}><Icon name="play" />Resume</button>,
    occupied: <><button className="button" onClick={() => act.pause(table.id)}><Icon name="pause" />Pause</button><button className="button button-danger" onClick={() => act.end(table.id)}><Icon name="stop" />End game</button></>
  }[table.status];

  return (
    <Modal title={table.name} subtitle={`${table.category} · ${ratesLabel(table)}/hr`} wide
      footer={
        <CloseFooter>
          {session
            ? <><button className="button" onClick={() => act.switchTable(table.id)}><Icon name="swap" />Switch</button><button className="button" onClick={() => act.addProduct(table.id)}><Icon name="plus" />Products</button></>
            : act.canEdit && <button className="button" onClick={() => act.edit(table.id)}><Icon name="edit" />Edit</button>}
          {statusControls}
        </CloseFooter>
      }>
      <div className="table-detail-hero" data-status={table.status}>
        <SnookerTable cloth={clothFor(table, state.settings)}>{session && <TableOverlay table={table} session={session} />}</SnookerTable>
        <div className="table-detail-facts">
          <StatusPill status={table.status} />
          <div className="detail-fact"><span>AC rate</span><strong>{money(rateFor(table, "ac"))}<small>/hr</small></strong></div>
          <div className="detail-fact"><span>Non-AC rate</span><strong>{money(rateFor(table, "nonac"))}<small>/hr</small></strong></div>
          <div className="detail-fact"><span>Category</span><strong>{table.category}</strong></div>
          <div className="detail-fact"><span>Board</span><strong>{cloth?.name || "Classic green"}</strong></div>
          {table.notes && <p className="muted detail-note">{table.notes}</p>}
        </div>
      </div>

      {session ? (
        <section className="detail-section session-grid">
          <div className="session-main">
          <div className="profile-hero">
            <Avatar name={name} />
            <div><strong>{name}</strong><span style={muted}>Started {timeLabel(session.originalStartedAt || session.startedAt)} · {hourTypeLabel(session.hourType)} {money(rateFor(table, session.hourType))}/hr · {billingLabel(session.billingMode, gameMinutesOf(session, state.settings))}</span></div>
          </div>
          <div className="breakdown-list">
            <div className="breakdown-row"><span>{table.status === "paused" ? "Played (paused)" : "Playing time"}</span><strong><Timer session={session} className="" /></strong></div>
            <div className="breakdown-row"><span>{tableChargeLabel(session, "Table charge")}</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
            {session.products.map((item) => (
              <div key={item.productId + (item.player || "")} className="breakdown-row"><span>{item.name} × {item.qty}{item.player ? ` · ${item.player}` : ""}</span><strong>{money(item.qty * item.price)}</strong></div>
            ))}
            {previousBalance > 0 && <div className="breakdown-row"><span>Previous balance</span><strong>{money(previousBalance)}</strong></div>}
            <div className="breakdown-row total"><span>Live total</span><strong><LiveAmount session={session} table={table} previousBalance={previousBalance} /></strong></div>
          </div>
          {session.notes && <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>Notes: {session.notes}</p>}
          </div>
          <PlayersPanel tableId={table.id} />
        </section>
      ) : (
        <p className="muted detail-empty">{table.status === "maintenance" ? "Out of play for service." : "No active session."}</p>
      )}

      <div className="detail-columns">
        <section>
          <h3 className="detail-heading">Today</h3>
          <div className="detail-mini-grid">
            <div><span>Sessions closed</span><strong>{todays.length}</strong></div>
            <div><span>Revenue</span><strong>{money(todays.reduce((sum, t) => sum + (t.revenueAmount ?? t.amount), 0))}</strong></div>
          </div>
        </section>
        <section>
          <h3 className="detail-heading">Upcoming bookings</h3>
          {upcoming.length ? upcoming.map((b) => (
            <div key={b.id} className="detail-booking">
              <span className="detail-booking-time">{b.start}</span>
              <div><strong>{state.customers.find((c) => c.id === b.customerId)?.name || "Guest"}</strong><span>{b.date === today ? "Today" : shortDate(b.date)} · {b.duration}h</span></div>
              <StatusPill status={b.status} />
            </div>
          )) : <p className="muted" style={{ fontSize: 13, margin: 0 }}>No upcoming bookings.</p>}
        </section>
      </div>
    </Modal>
  );
}
