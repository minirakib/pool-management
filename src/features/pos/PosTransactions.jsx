import { useState } from "react";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { EmptyState, Segmented } from "@/components/ui";
import { money, shortDate, timeLabel } from "@/lib/format.js";

const TABS = [
  ["sales", "receipt", "POS sales", (t) => t.type === "sale", "Completed counter sales will be listed here."],
  ["tables", "table", "Table bills", (t) => t.type === "session", "Closed table sessions will be listed here."]
];
const LIMIT = 10;

/** Recent transactions with a tab per kind. Both POS pages use it, each opening on its own tab. */
export default function PosTransactions({ defaultTab = "sales" }) {
  const state = useStore();
  const { setPage, printReceipt, can } = useUi();
  const [tab, setTab] = useState(defaultTab);
  const [, , , match, empty] = TABS.find(([id]) => id === tab);
  const sorted = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));
  const rows = sorted.filter(match).slice(0, LIMIT);
  const printSaved = (t) => printReceipt(t.receipt || { tableName: t.description, customer: t.customer, endedAt: t.date, tableCharge: 0, products: [], previousBalance: 0, total: t.amount, method: t.method });

  return (
    <article className="panel pos-transactions">
      <div className="panel-heading">
        <div><h2>Recent transactions</h2><p>Latest {LIMIT} saved payments</p></div>
        <Segmented label="Transaction type" value={tab} onChange={setTab} options={TABS.map(([id, icon, label, fn]) => ({ id, icon, label, count: sorted.filter(fn).length }))} />
        {can("reports") && <button className="panel-link" onClick={() => setPage("reports")}>Reports <Icon name="arrow-right" /></button>}
      </div>
      {rows.length ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Transaction</th><th>Customer</th><th>Time</th><th>Payment</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td><span className="table-primary">{t.description}</span><span className="table-sub">{t.type === "session" ? "Table session" : "Counter sale"}</span></td>
                  <td>{t.customer}</td>
                  <td>{shortDate(t.date.slice(0, 10))} · {timeLabel(t.date)}</td>
                  <td>{t.method}</td>
                  <td className="table-primary">{money(t.amount)}</td>
                  <td><button className="button button-sm" onClick={() => printSaved(t)}><Icon name="printer" />Receipt</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="No transactions yet" description={empty} />}
    </article>
  );
}
