import * as actions from "../../app/actions.js";
import { useStore, useStoreApi } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import Modal, { CloseFooter, FormFooter, useFormAttempt } from "../../components/Modal.jsx";
import { AnalyticsStrip, Avatar, Field, SelectField, TextareaField } from "../../components/ui.jsx";
import { billableMilliseconds, sessionBreakdown } from "../../lib/domain.js";
import { durationLabel, money, shortDate } from "../../lib/format.js";

const MEMBERSHIPS = ["Regular", "Silver", "Gold", "VIP"];

export function CustomerFormModal({ customerId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const customer = state.customers.find((c) => c.id === customerId);

  return (
    <Modal title={customer ? "Edit customer" : "Add customer"} subtitle="Keep customer contact and membership details up to date." error={error}
      onSubmit={(values) => attempt(() => run(actions.saveCustomer, customerId, values))} footer={<FormFooter label={customer ? "Save customer" : "Add customer"} />}>
      <div className="form-grid">
        <Field label="Full name" name="name" value={customer?.name || ""} required />
        <Field label="Phone number" name="phone" type="tel" value={customer?.phone || ""} required placeholder="e.g. +880 1712 345 678" />
        <Field label="Email (optional)" name="email" type="email" value={customer?.email || ""} />
        <SelectField label="Membership" name="membership" options={MEMBERSHIPS} value={customer?.membership || "Regular"} />
        <TextareaField label="Notes" name="notes" value={customer?.notes || ""} />
      </div>
    </Modal>
  );
}

export function CustomerProfileModal({ customerId }) {
  const state = useStore();
  const { openModal } = useUi();
  const customer = state.customers.find((c) => c.id === customerId);
  if (!customer) return null;
  const transactions = state.transactions.filter((t) => t.customer === customer.name).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const sessions = state.sessions.filter((s) => s.customerId === customer.id);
  const tier = `role-badge tier-${customer.membership.toLowerCase()}`;

  return (
    <Modal title={customer.name} subtitle="Customer profile and recent activity." wide
      footer={<CloseFooter><button className="button" onClick={() => openModal(<CustomerFormModal customerId={customer.id} />)}>Edit customer</button></CloseFooter>}>
      <div className="profile-hero">
        <Avatar name={customer.name} />
        <div style={{ flex: 1 }}><strong>{customer.phone}</strong><span style={{ display: "block", color: "var(--color-text-muted)", fontSize: 12 }}>{customer.email || "No email"} · {customer.membership} member</span></div>
        <span className={tier}>{customer.membership}</span>
      </div>
      <AnalyticsStrip style={{ marginTop: 12 }} items={[
        ["Sessions", customer.sessions], ["Total spending", money(customer.spending)],
        ["Outstanding", money(customer.balance)], ["Registered", shortDate(customer.registered)]
      ]} />
      <h3 style={{ margin: "13px 0 7px" }}>Active session</h3>
      {sessions.length ? sessions.map((session) => {
        const table = state.tables.find((t) => t.id === session.tableId);
        return (
          <div key={session.id} className="notification-item">
            <span><Icon name="target" /></span>
            <div><strong>{table?.name || "Table"} · {durationLabel(billableMilliseconds(session))}</strong><span>Estimated live charge {money(sessionBreakdown(session, table, state.settings).total)}</span></div>
          </div>
        );
      }) : <p className="muted" style={{ fontSize: 13 }}>No active table session.</p>}
      <h3 style={{ margin: "13px 0 7px" }}>Recent transactions</h3>
      {transactions.length ? transactions.map((t) => (
        <div key={t.id} className="settings-row"><div><strong>{t.description}</strong><span>{shortDate(t.date.slice(0, 10))} · {t.method}</span></div><strong>{money(t.amount)}</strong></div>
      )) : <p className="muted" style={{ fontSize: 13 }}>No saved transaction history yet.</p>}
      {customer.notes && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Notes: {customer.notes}</p>}
    </Modal>
  );
}
