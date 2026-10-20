import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { EmptyState } from "@/components/ui";
import { money, shortDate, timeLabel } from "@/lib/format.js";

// kind → [transaction type, panel title, row label, empty message]
const KINDS = {
  sales: ["sale", "Sales transactions", "Counter sale", "Completed counter sales will be listed here."],
  tables: ["session", "Table transactions", "Table session", "Closed table sessions will be listed here."]
};
const LIMIT = 50;

export const transactionCount = (state, kind) => state.transactions.filter((t) => t.type === KINDS[kind][0]).length;

/** Saved payments of one kind: counter sales (POS Sales page) or table bills (POS Table page). */
export default function PosTransactions({ kind = "sales" }) {
  const state = useStore();
  const { setPage, printReceipt, can } = useUi();
  const [type, title, rowLabel, empty] = KINDS[kind];
  const all = state.transactions.filter((t) => t.type === type).sort((a, b) => b.date.localeCompare(a.date));
  const rows = all.slice(0, LIMIT);
  const printSaved = (t) => printReceipt(t.receipt || { tableName: t.description, customer: t.customer, endedAt: t.date, tableCharge: 0, products: [], previousBalance: 0, total: t.amount, method: t.method });

  return (
    <article className="panel pos-transactions">
      <div className="panel-heading">
        <div><h2>{title}</h2><p>{all.length > LIMIT ? `Latest ${LIMIT} of ${all.length} saved payments` : `${all.length} saved payment${all.length === 1 ? "" : "s"}`}</p></div>
        {can("reports") && <button className="panel-link" onClick={() => setPage("reports")}>Reports <Icon name="arrow-right" /></button>}
      </div>
      {rows.length ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Transaction</th><th>Customer</th><th>Time</th><th>Payment</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td><span className="table-primary">{t.description}</span><span className="table-sub">{rowLabel}</span></td>
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
