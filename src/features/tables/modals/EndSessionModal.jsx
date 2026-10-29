import { useState } from "react";
import * as actions from "@/app/actions";
import { findTable, tableSession } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { LiveAmount, Timer } from "@/components/Live.jsx";
import Modal from "@/components/Modal.jsx";
import ReceiptModal from "@/components/ReceiptModal.jsx";
import { AnalyticsStrip, Avatar, Segmented, StatusPill } from "@/components/ui";
import { useNow } from "@/hooks/useNow.js";
import { paymentMethods } from "@/lib/constants.js";
import { customerName, gameMinutesOf, hourTypeLabel, rateFor, sessionBreakdown, splitShares } from "@/lib/domain.js";
import { money, timeLabel } from "@/lib/format.js";
import { muted, tableChargeLabel } from "./shared.jsx";

const METHOD_ICONS = { Cash: "cash", bKash: "bolt", Nagad: "bolt", Rocket: "bolt", Upay: "bolt", "Bank transfer": "wallet", Card: "wallet", "Customer Credit": "user" };
const QUICK_DISCOUNTS = [5, 10, 15];

/** Bill split calculator on the payment side. Follows the live total, discount included. */
function SplitCalculator({ session, table, discount, previousBalance, players, setPlayers }) {
  const { settings } = useStore();
  const now = useNow();
  const total = sessionBreakdown(session, table, settings, now, discount, previousBalance).total;
  const shares = splitShares(total, players);
  const even = shares.every((s) => s === shares[0]);
  return (
    <div className="checkout-card split-calc">
      <input type="hidden" name="splitCount" value={players} />
      <div className="checkout-card-head">
        <span>Split bill</span>
        <div className="qty-control" aria-label="Number of players">
          <button type="button" onClick={() => setPlayers(Math.max(1, players - 1))} aria-label="Fewer players">−</button>
          <span>{players}</span>
          <button type="button" onClick={() => setPlayers(Math.min(20, players + 1))} aria-label="More players">+</button>
        </div>
      </div>
      <Segmented role="radiogroup" label="Split between players" className="split-presets" value={players} onChange={setPlayers}
        options={[1, 2, 3, 4].map((n) => ({ id: n, label: n === 1 ? "No split" : `÷ ${n}` }))} />
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

/** Close a game: the bill on the left, discount / split / payment on the right; confirming opens the receipt. */
export function EndSessionModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { closeModal, openModal, notify, printReceipt } = useUi();
  const [error, setError] = useState("");
  const [discount, setDiscount] = useState("");
  const [players, setPlayers] = useState(1);
  const [method, setMethod] = useState("Cash");
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  if (!session) return null;

  const member = !!session.customerId;
  const previousBalance = state.customers.find((c) => c.id === session.customerId)?.balance || 0;
  const name = customerName(state, session);
  const started = session.originalStartedAt || session.startedAt;
  const subtotal = sessionBreakdown(session, table, state.settings, Date.now(), 0, previousBalance).total;

  const printBill = () => {
    const now = Date.now();
    const current = sessionBreakdown(session, table, state.settings, now, discount, previousBalance);
    printReceipt({ tableName: table.name, category: table.category, customer: name, startedAt: started, endedAt: now, duration: current.elapsed, hourType: session.hourType, rate: rateFor(table, session.hourType), billingMode: session.billingMode, gameMinutes: gameMinutesOf(session, state.settings), tableCharge: current.tableCharge, products: session.products, previousBalance, discount: current.discount, total: current.total, split: players > 1 ? splitShares(current.total, players) : null, method: "Pending" });
  };

  const confirm = (values) => {
    try {
      const { bill, method: paidWith, receipt } = run(actions.closeSession, tableId, values);
      openModal(<ReceiptModal receipt={receipt} />);
      notify(`${money(bill.total)} recorded via ${paidWith}.`, "success", "Payment complete");
    } catch (err) {
      setError(err.message);
      notify(err.message, "error", "Check the bill");
    }
  };

  return (
    <Modal xl className="checkout-modal" title={`Close session · ${table.name}`} subtitle="Review the bill, then take the payment." error={error} onSubmit={confirm}
      footer={
        <>
          <span className="footer-hint">The receipt opens after payment.</span>
          <button className="button" type="button" onClick={closeModal}>Cancel</button>
          <button className="button" type="button" onClick={printBill}><Icon name="printer" />Print bill</button>
          <button className="button button-primary" type="submit"><Icon name="check" />Confirm payment</button>
        </>
      }>
      <div className="checkout-layout">
        <section className="checkout-bill" aria-label="Bill">
          <div className="profile-hero">
            <Avatar name={name} />
            <div><strong>{name}</strong><span style={muted}>{table.category} · {hourTypeLabel(session.hourType)} · {money(rateFor(table, session.hourType))}/hour</span></div>
            <StatusPill status={table.status} />
          </div>
          <AnalyticsStrip items={[
            ["Started", timeLabel(started)],
            ["Ends", timeLabel(Date.now())],
            ["Billable time", <Timer session={session} className="" />],
            ["Hourly rate", money(rateFor(table, session.hourType))]
          ]} />
          <div className="breakdown-list">
            <div className="breakdown-row"><span>{tableChargeLabel(session, "Table charges")}</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
            {session.products.length
              ? session.products.map((item) => <div key={item.productId + (item.player || "")} className="breakdown-row"><span>{item.name} × {item.qty}{item.player ? ` · ${item.player}` : ""}</span><strong>{money(item.price * item.qty)}</strong></div>)
              : <div className="breakdown-row muted-row"><span>No products added</span><strong>{money(0)}</strong></div>}
            {previousBalance > 0 && <div className="breakdown-row"><span>Previous balance</span><strong>{money(previousBalance)}</strong></div>}
            <div className="breakdown-row subtotal"><span>Subtotal</span><strong><LiveAmount session={session} table={table} previousBalance={previousBalance} /></strong></div>
          </div>
        </section>

        <aside className="checkout-pay" aria-label="Payment">
          <div className="checkout-card">
            <div className="checkout-card-head"><span>Discount</span></div>
            <div className="discount-row">
              <span className="money-input"><b>৳</b><input name="discount" type="number" min="0" step="1" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} aria-label="Discount in BDT" data-autofocus /></span>
              {QUICK_DISCOUNTS.map((pct) => {
                const value = String(Math.round((subtotal * pct) / 100));
                return <button key={pct} type="button" className={`chip-button${discount === value && value !== "0" ? " active" : ""}`} onClick={() => setDiscount(value)}>{pct}%</button>;
              })}
            </div>
          </div>

          <div className="amount-due">
            <span>Amount due</span>
            <strong><LiveAmount session={session} table={table} discount={discount} previousBalance={previousBalance} /></strong>
            {Number(discount) > 0 && <small>after {money(Number(discount))} discount</small>}
          </div>

          <SplitCalculator session={session} table={table} discount={discount} previousBalance={previousBalance} players={players} setPlayers={setPlayers} />

          <div className="checkout-card">
            <div className="checkout-card-head"><span>Payment method</span></div>
            <div className="pay-methods" role="radiogroup" aria-label="Payment method">
              {paymentMethods.map((m) => {
                const disabled = m === "Customer Credit" && !member;
                return (
                  <label key={m} className={`pay-method${method === m ? " active" : ""}${disabled ? " disabled" : ""}`} title={disabled ? "Only for member customers" : undefined}>
                    <input type="radio" name="paymentMethod" value={m} checked={method === m} disabled={disabled} onChange={() => setMethod(m)} />
                    <Icon name={METHOD_ICONS[m] || "wallet"} /><span>{m === "Customer Credit" ? "Credit" : m}</span>
                  </label>
                );
              })}
            </div>
            {method === "Customer Credit" && <p className="balance-note"><Icon name="alert" />The full amount is added to {name}'s balance.</p>}
          </div>
        </aside>
      </div>
    </Modal>
  );
}
