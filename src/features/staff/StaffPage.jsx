import { useState } from "react";
import * as actions from "../../app/actions.js";
import { deleteRecord, toggleStaffStatus } from "../../app/actions.js";
import { useStore, useStoreApi } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import Modal, { ConfirmModal, FormFooter, useFormAttempt } from "../../components/Modal.jsx";
import { Avatar, EmptyState, Field, PageHeading, SearchBox, SelectField, StatusPill } from "../../components/ui.jsx";
import { money, shortDate, todayISO } from "../../lib/format.js";

function StaffFormModal({ staffId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const member = state.staff.find((m) => m.id === staffId);
  return (
    <Modal title={member ? "Edit staff member" : "Add staff member"} subtitle="Maintain your team and shift directory." error={error}
      onSubmit={(values) => attempt(() => run(actions.saveStaff, staffId, values))} footer={<FormFooter label={member ? "Save staff" : "Add staff"} />}>
      <div className="form-grid">
        <Field label="Name" name="name" value={member?.name || ""} required />
        <Field label="Phone" name="phone" type="tel" value={member?.phone || ""} required />
        <Field label="Username" name="username" value={member?.username || ""} required />
        <SelectField label="Role" name="role" options={["Owner", "Manager", "Cashier", "Staff"]} value={member?.role || "Staff"} />
        <SelectField label="Status" name="status" options={["Active", "Inactive"]} value={member?.status || "Active"} />
        <Field label="Joining date" name="joined" type="date" value={member?.joined || todayISO()} required />
        <Field label="Shift" name="shift" value={member?.shift || "09:00 – 18:00"} required />
        <Field label="Monthly salary (BDT)" name="salary" type="number" value={member?.salary ?? 0} min="0" step="1" />
      </div>
    </Modal>
  );
}

export default function StaffPage() {
  const state = useStore();
  const { openModal, perform, setPage, search, setSearch } = useUi();
  const [activeOnly, setActiveOnly] = useState(false);
  const active = state.staff.filter((m) => m.status === "Active");
  const rows = state.staff.filter((m) => (!activeOnly || m.status === "Active") && `${m.name} ${m.username} ${m.role} ${m.phone}`.toLowerCase().includes(search.toLowerCase()));
  const remove = (m) => openModal(<ConfirmModal title="Delete staff member?" message={`This will permanently remove ${m.name} from the saved demo data.`} confirmLabel="Delete" danger onConfirm={() => perform(deleteRecord, "staff", m.id)} />);

  return (
    <>
      <PageHeading title="Staff" stats={[
        { label: "Team", value: state.staff.length, tone: "primary", active: !activeOnly, onClick: () => setActiveOnly(false) },
        { label: "Active", value: active.length, tone: "success", active: activeOnly, onClick: () => setActiveOnly((v) => !v) },
        { label: "Monthly salaries", value: money(active.reduce((s, m) => s + (m.salary || 0), 0)), tone: "gold" }
      ]}>
        <button className="button button-sm" onClick={() => setPage("salary")}><Icon name="cash" /><span className="btn-label">Salary</span></button>
        <button className="button button-primary button-sm" onClick={() => openModal(<StaffFormModal />)}><Icon name="plus" />Add staff</button>
      </PageHeading>
      <SearchBox className="page-search" placeholder="Search staff…" value={search} onChange={setSearch} />
      <article className="panel">
        {rows.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Team member</th><th>Role</th><th>Status</th><th>Shift</th><th>Salary</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar name={m.name} /><div><span className="table-primary">{m.name}</span><span className="table-sub">@{m.username} · {m.phone}</span></div></div></td>
                    <td><span className="role-badge">{m.role}</span></td>
                    <td><StatusPill status={m.status} /></td>
                    <td>{m.shift}</td>
                    <td className="table-primary">{m.salary ? money(m.salary) : "—"}</td>
                    <td>{shortDate(m.joined)}</td>
                    <td><div className="table-actions">
                      <button className="button button-sm" onClick={() => openModal(<StaffFormModal staffId={m.id} />)}>Edit</button>
                      <button className="button button-sm" onClick={() => perform(toggleStaffStatus, m.id)}>{m.status === "Active" ? "Deactivate" : "Activate"}</button>
                      <button className="icon-button" onClick={() => remove(m)} aria-label="Remove staff"><Icon name="x" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No staff found" description="Try a different search term." />}
      </article>
      <p className="muted" style={{ fontSize: 12, marginTop: 11 }}>This local frontend does not provide sign-in, access control, or multi-user synchronization. Add real permissions with the future Python service.</p>
    </>
  );
}
