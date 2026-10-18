import { useState } from "react";
import { deleteConfigs, deleteRecord } from "../../app/actions.js";
import { useStore } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import { ConfirmModal } from "../../components/Modal.jsx";
import { EmptyState, PageHeading, SearchBox, Select } from "../../components/ui.jsx";
import { csvDownload } from "../../lib/download.js";
import { money, shortDate } from "../../lib/format.js";
import { CustomerFormModal, CustomerProfileModal } from "./CustomerModals.jsx";

export default function CustomersPage() {
  const state = useStore();
  const { openModal, notify, perform, search, setSearch } = useUi();
  const [membership, setMembership] = useState("All memberships");
  const [dueOnly, setDueOnly] = useState(false);
  const members = state.customers.filter((c) => c.id !== "cus-006");
  const withBalance = members.filter((c) => c.balance > 0);

  const matches = state.customers.filter((c) =>
    `${c.name} ${c.phone} ${c.email} ${c.membership}`.toLowerCase().includes(search.toLowerCase()) &&
    (membership === "All memberships" || c.membership === membership) &&
    (!dueOnly || c.balance > 0));
  const add = () => openModal(<CustomerFormModal />);

  const exportCsv = () => {
    csvDownload("cuecore-customers.csv", [["Customer ID", "Name", "Phone", "Email", "Membership", "Sessions", "Spending BDT", "Balance BDT"], ...state.customers.map((c) => [c.id, c.name, c.phone, c.email, c.membership, c.sessions, c.spending, c.balance])]);
    notify("cuecore-customers.csv downloaded.", "success", "Export ready");
  };

  const remove = (c) => {
    if (deleteConfigs.customer.blocked(state, c)) return notify("This customer is referenced by an active session and cannot be removed yet.", "warning");
    openModal(<ConfirmModal title="Delete customer?" message={`This will permanently remove ${c.name} from the saved demo data.`} confirmLabel="Delete" danger onConfirm={() => perform(deleteRecord, "customer", c.id)} />);
  };

  return (
    <>
      <PageHeading title="Customers" stats={[
        { label: "Members", value: members.length, tone: "primary" },
        { label: "VIP & Gold", value: members.filter((c) => ["VIP", "Gold"].includes(c.membership)).length, tone: "gold" },
        { label: "Total spent", value: money(members.reduce((s, c) => s + c.spending, 0)), tone: "success" },
        { label: "Due", value: money(withBalance.reduce((s, c) => s + c.balance, 0)), tone: withBalance.length ? "warning" : "muted", active: dueOnly, onClick: () => setDueOnly((v) => !v), title: "Show customers with an unpaid balance" }
      ]}>
        <Select className="heading-select" aria-label="Filter membership" value={membership} onChange={(e) => setMembership(e.target.value)} options={["All memberships", "Regular", "Silver", "Gold", "VIP"]} />
        <button className="button button-sm" onClick={exportCsv} title="Export CSV"><Icon name="download" /><span className="btn-label">CSV</span></button>
        <button className="button button-primary button-sm" onClick={add}><Icon name="plus" />Add customer</button>
      </PageHeading>
      <SearchBox className="page-search" placeholder="Search name, phone, email…" value={search} onChange={setSearch} />
      <article className="panel">
        {matches.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Customer</th><th>Membership</th><th>Sessions</th><th>Total spent</th><th>Balance</th><th>Registered</th><th></th></tr></thead>
              <tbody>
                {matches.map((c) => (
                  <tr key={c.id}>
                    <td><span className="table-primary">{c.name}</span><span className="table-sub">{c.phone}{c.email ? ` · ${c.email}` : ""}</span></td>
                    <td><span className={`role-badge tier-${c.membership.toLowerCase()}`}>{c.membership}</span></td>
                    <td>{c.sessions}</td>
                    <td>{money(c.spending)}</td>
                    <td className={c.balance ? "text-warning" : ""}>{money(c.balance)}</td>
                    <td>{shortDate(c.registered)}</td>
                    <td><div className="table-actions">
                      <button className="button button-sm" onClick={() => openModal(<CustomerProfileModal customerId={c.id} />)}>Profile</button>
                      <button className="button button-sm" onClick={() => openModal(<CustomerFormModal customerId={c.id} />)}>Edit</button>
                      <button className="icon-button" onClick={() => remove(c)} aria-label="Delete customer"><Icon name="x" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No customers match" description="Try another name or add a new customer."><button className="button button-primary" onClick={add}>Add customer</button></EmptyState>
        )}
      </article>
    </>
  );
}
