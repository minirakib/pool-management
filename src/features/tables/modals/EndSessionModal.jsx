import { useState } from "react";
import * as actions from "@/app/actions";
import { findTable, tableSession } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { LiveAmount, Timer } from "@/components/Live.jsx";
import Modal, { useFormAttempt } from "@/components/Modal.jsx";
import { AnalyticsStrip, Avatar, Segmented, Select, StatusPill } from "@/components/ui";
import { useNow } from "@/hooks/useNow.js";
import { paymentMethods } from "@/lib/constants.js";
import { customerName, gameMinutesOf, hourTypeLabel, rateFor, sessionBreakdown, splitShares } from "@/lib/domain.js";
import { money, timeLabel } from "@/lib/format.js";
import { muted, tableChargeLabel } from "./shared.jsx";

/** Bill split calculator on the close-bill screen. Follows the live total, discount included. */
function SplitCalculator({ session, table, discount, previousBalance, players, setPlayers }) {
  const { settings } = useStore();
  const now = useNow();
  const total = sessionBreakdown(session, table, settings, now, discount, previousBalance).total;
  const shares = splitShares(total, players);
  const even = shares.every((s) => s === shares[0]);
  return (
    <div className="split-calc">
      <input type="hidden" name="splitCount" value={players} />
      <div className="split-head">
        <span>Split bill</span>
        <Segmented role="radiogroup" label="Split between players" value={players} onChange={setPlayers} options={[1, 2, 3, 4].map((n) => ({ id: n, label: n === 1 ? "No split" : `÷ ${n}` }))} />
        <div className="qty-control" aria-label="Number of players">
          <button type="button" onClick={() => setPlayers(Math.max(1, players - 1))} aria-label="Fewer players">−</button>
          <span>{players}</span>
          <button type="button" onClick={() => setPlayers(Math.min(20, players + 1))} aria-label="More players">+</button>
        </div>
      </div>
      {players > 1 && (
        <div className="split-result">
          <div className="split-each"><span>Each player pays</span><strong>{even ? money(shares[0]) : `${money(shares[shares.length - 1])} – ${money(shares[0])}`}</strong></div>
          <div className="split-players">
            {shares.map((amount, i) => <div key={i}><span>Player {i + 1}</span><strong>{money(amount)}</strong></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

export function EndSessionModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { closeModal, printReceipt } = useUi();
  const { error, attempt } = useFormAttempt();
  const [discount, setDiscount] = useState("0");
  const [players, setPlayers] = useState(1);
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  if (!session) return null;

  const previousBalance = state.customers.find((c) => c.id === session.customerId)?.balance || 0;
  const name = customerName(state, session);
  const started = session.originalStartedAt || session.startedAt;

  const printCurrent = () => {
    const now = Date.now();
    const current = sessionBreakdown(session, table, state.settings, now, 0, previousBalance);
    printReceipt({ tableName: table.name, category: table.category, customer: name, startedAt: started, endedAt: now, duration: current.elapsed, hourType: session.hourType, rate: rateFor(table, session.hourType), billingMode: session.billingMode, gameMinutes: gameMinutesOf(session, state.settings), tableCharge: current.tableCharge, products: session.products, previousBalance, total: current.total, split: players > 1 ? splitShares(current.total, players) : null, method: "Pending" });
  };

  const confirm = (values) => attempt(() => {
    const { bill: paid, method } = run(actions.closeSession, tableId, values);
    return `${money(paid.total)} recorded via ${method}. Receipt is ready to print.`;
  });

  return (
    <Modal title={`Close session · ${table.name}`} subtitle="Review the bill and record a demo payment." wide error={error} onSubmit={confirm}
      footer={
        <>
          <button className="button" type="button" onClick={closeModal}>Cancel</button>
          <button className="button" type="button" onClick={printCurrent}><Icon name="printer" />Print receipt</button>
          <button className="button button-primary" type="submit">Confirm payment</button>
        </>
      }>
      <div className="profile-hero" style={{ marginBottom: 14 }}>
        <Avatar name={name} />
        <div><strong>{table.name} · {name}</strong><span style={muted}>{table.category} · {hourTypeLabel(session.hourType)} · {money(rateFor(table, session.hourType))}/hour</span></div>
        <StatusPill status={table.status} />
      </div>
      <AnalyticsStrip items={[
        ["Started", timeLabel(started)],
        ["Ended", timeLabel(Date.now())],
        ["Billable time", <Timer session={session} className="" />],
        [`${hourTypeLabel(session.hourType)} hourly rate`, money(rateFor(table, session.hourType))]
      ]} />
      <div className="breakdown-list">
        <div className="breakdown-row"><span>{tableChargeLabel(session, "Table charges")}</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
        {session.products.length
          ? session.products.map((item) => <div key={item.productId} className="breakdown-row"><span>{item.name} × {item.qty}</span><strong>{money(item.price * item.qty)}</strong></div>)
          : <div className="breakdown-row"><span>Added products</span><strong>{money(0)}</strong></div>}
        {previousBalance > 0 && <div className="breakdown-row"><span>Previous balance</span><strong>{money(previousBalance)}</strong></div>}
        <label className="field" style={{ gridTemplateColumns: "1fr 130px", alignItems: "center" }}>
          <span>Discount (BDT)</span>
          <input name="discount" type="number" min="0" step="1" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <div className="breakdown-row total"><span>Final total</span><strong><LiveAmount session={session} table={table} discount={discount} previousBalance={previousBalance} /></strong></div>
        <SplitCalculator session={session} table={table} discount={discount} previousBalance={previousBalance} players={players} setPlayers={setPlayers} />
        <label className="field"><span>Payment method</span><Select name="paymentMethod" options={paymentMethods} defaultValue="Cash" /></label>
      </div>
    </Modal>
  );
}
