import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import Modal from "@/components/Modal.jsx";
import Receipt from "@/components/Receipt.jsx";
import { durationLabel, money, timeLabel } from "@/lib/format.js";

/**
 * Shown right after a payment: what was paid, and the receipt as it will print.
 * receipt: the details object saved with the transaction (same shape Receipt prints).
 */
export default function ReceiptModal({ receipt, title = "Payment complete" }) {
  const { settings } = useStore();
  const { closeModal, printReceipt } = useUi();
  const split = receipt.split?.length > 1 ? receipt.split : null;

  return (
    <Modal wide className="receipt-modal" title={title} subtitle={`${receipt.tableName} · ${receipt.customer}`}
      footer={
        <>
          <button className="button" onClick={() => printReceipt(receipt)}><Icon name="printer" />Print receipt</button>
          <button className="button button-primary" onClick={closeModal} data-autofocus><Icon name="check" />Done</button>
        </>
      }>
      <div className="receipt-layout">
        <div className="receipt-summary">
          <div className="paid-badge">
            <span className="paid-check"><Icon name="check" /></span>
            <div><span>Paid via {receipt.method}</span><strong>{money(receipt.total)}</strong></div>
          </div>
          <div className="receipt-facts">
            <div><span>Table</span><strong>{receipt.tableName}</strong></div>
            <div><span>Customer</span><strong>{receipt.customer}</strong></div>
            {receipt.startedAt && <div><span>Played</span><strong>{timeLabel(receipt.startedAt)} – {timeLabel(receipt.endedAt)}</strong></div>}
            {receipt.duration ? <div><span>Duration</span><strong>{durationLabel(receipt.duration)}</strong></div> : null}
            {receipt.discount ? <div><span>Discount</span><strong>−{money(receipt.discount)}</strong></div> : null}
            <div><span>Closed</span><strong>{timeLabel(receipt.endedAt)}</strong></div>
          </div>
          {split && (
            <div className="receipt-split">
              <span>Split between {split.length} players</span>
              <div>{split.map((amount, i) => <span key={i}>Player {i + 1}<b>{money(amount)}</b></span>)}</div>
            </div>
          )}
          <p className="muted receipt-note"><Icon name="check" />The table is free again and this payment is saved in Transactions.</p>
        </div>
        <div className="receipt-paper-wrap">
          <div className="receipt-paper" aria-label="Receipt preview"><Receipt details={receipt} settings={settings} /></div>
        </div>
      </div>
    </Modal>
  );
}
