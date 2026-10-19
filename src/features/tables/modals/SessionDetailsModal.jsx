import { findTable, tableSession } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import Icon from "@/components/Icon.jsx";
import { LiveAmount, Timer } from "@/components/Live.jsx";
import Modal from "@/components/Modal.jsx";
import { AnalyticsStrip, Avatar, StatusPill } from "@/components/ui";
import { billingLabel, customerName, gameMinutesOf, hourTypeLabel, rateFor, sessionBreakdown } from "@/lib/domain.js";
import { money, timeLabel } from "@/lib/format.js";
import { useTableActions } from "../useTableActions.jsx";
import { muted, tableChargeLabel } from "./shared.jsx";

export function SessionDetailsModal({ tableId }) {
  const state = useStore();
  const act = useTableActions();
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  if (!session) return null;
  const previousBalance = state.customers.find((c) => c.id === session.customerId)?.balance || 0;
  const name = customerName(state, session);
  const bill = sessionBreakdown(session, table, state.settings, Date.now(), 0, previousBalance);

  return (
    <Modal title={`${table.name} · Live bill`} subtitle="Session detail · billable time excludes any paused periods." wide
      footer={
        <>
          <button className="button" onClick={() => act.switchTable(table.id)}>Switch table</button>
          <button className="button" onClick={() => act.addProduct(table.id)}><Icon name="plus" />Add product</button>
          {table.status === "paused"
            ? <button className="button button-primary" onClick={() => act.resume(table.id)}>Resume</button>
            : <button className="button" onClick={() => act.pause(table.id)}>Pause</button>}
          <button className="button button-danger" onClick={() => act.end(table.id)}>End game</button>
        </>
      }>
      <div className="profile-hero" style={{ marginBottom: 13 }}>
        <Avatar name={name} />
        <div><strong>{name}</strong><span style={muted}>{table.category} table · {hourTypeLabel(session.hourType)} · {money(rateFor(table, session.hourType))}/hour</span></div>
        <StatusPill status={table.status} />
      </div>
      <AnalyticsStrip items={[
        ["Started", timeLabel(session.originalStartedAt || session.startedAt)],
        ["Billable duration", <Timer session={session} className="" />],
        ["Billing mode", `${hourTypeLabel(session.hourType)} · ${billingLabel(session.billingMode, gameMinutesOf(session, state.settings))}`],
        ["Live total", <LiveAmount session={session} table={table} previousBalance={previousBalance} />]
      ]} />
      <div className="breakdown-list">
        <div className="breakdown-row"><span>{tableChargeLabel(session, "Table charge")}</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
        <div className="breakdown-row"><span>Product charges</span><strong>{money(bill.products)}</strong></div>
        <div className="breakdown-row total"><span>Estimated total</span><strong><LiveAmount session={session} table={table} previousBalance={previousBalance} /></strong></div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 13 }}>{session.notes ? `Notes: ${session.notes}` : "No session notes."}</p>
    </Modal>
  );
}
