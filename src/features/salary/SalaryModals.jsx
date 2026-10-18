import { useState } from "react";
import * as actions from "../../app/actions.js";
import { deleteRecord, unpaySalary } from "../../app/actions.js";
import { useStore, useStoreApi } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import Modal, { CloseFooter, ConfirmModal, FormFooter, useFormAttempt } from "../../components/Modal.jsx";
import { Avatar, Field, SelectField, StatusPill, TextareaField } from "../../components/ui.jsx";
import { salaryMethods } from "../../lib/constants.js";
import { salaryNet } from "../../lib/domain.js";
import { money, monthISO, monthLabel, shortDate, todayISO } from "../../lib/format.js";

const AMOUNT_FIELDS = [
  ["base", "Base salary", "earning"], ["bonus", "Bonus", "earning"], ["overtime", "Overtime", "earning"],
  ["deduction", "Deduction", "deduction"], ["advance", "Advance paid", "deduction"]
];
const gross = (r) => (r.base || 0) + (r.bonus || 0) + (r.overtime || 0);
const totalDeductions = (r) => (r.deduction || 0) + (r.advance || 0);

export function SalaryFormModal({ salaryId = "", staffId = "", month = monthISO() }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const record = state.salaries.find((r) => r.id === salaryId);
  const staff = state.staff.filter((m) => m.status === "Active" || m.id === record?.staffId);
  const initialStaff = record?.staffId || staffId || staff.find((m) => m.salary > 0)?.id || staff[0]?.id || "";
  const [values, setValues] = useState(() => ({
    staffId: initialStaff,
    ...Object.fromEntries(AMOUNT_FIELDS.map(([key]) => [key, String(record?.[key] ?? (key === "base" ? state.staff.find((m) => m.id === initialStaff)?.salary || "" : 0))]))
  }));
  const numbers = Object.fromEntries(AMOUNT_FIELDS.map(([key]) => [key, Math.max(0, Number(values[key]) || 0)]));
  const net = salaryNet(numbers);
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const changeStaff = (e) => {
    const member = state.staff.find((m) => m.id === e.target.value);
    setValues((v) => ({ ...v, staffId: e.target.value, base: record ? v.base : String(member?.salary || "") }));
  };

  return (
    <Modal title={record ? "Edit salary" : "Add salary"} subtitle={record ? `${record.staffName} · ${monthLabel(record.month)}` : "Record one staff member's pay for a month."} wide error={error}
      onSubmit={(form) => attempt(() => run(actions.saveSalary, salaryId, form))} footer={<FormFooter label={record ? "Save salary" : "Add salary"} />}>
      <div className="form-grid">
        <label className="field">
          <span>Staff member</span>
          <select name="staffId" value={values.staffId} onChange={changeStaff} required>
            {staff.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
        </label>
        <Field label="Salary month" name="month" type="month" value={record?.month || month} required />
      </div>
      <div className="salary-form-split">
        {[["earning", "Earnings"], ["deduction", "Deductions"]].map(([kind, heading]) => (
          <fieldset key={kind} className={`salary-fieldset ${kind}`}>
            <legend>{heading}</legend>
            {AMOUNT_FIELDS.filter(([, , k]) => k === kind).map(([key, label]) => (
              <label key={key} className="field">
                <span>{label} (BDT)</span>
                <input name={key} type="number" min="0" step="1" value={values[key]} onChange={set(key)} required={key === "base"} />
              </label>
            ))}
          </fieldset>
        ))}
      </div>
      <div className={`salary-net-preview${net < 0 ? " negative" : ""}`}>
        <div><span>Gross</span><strong>{money(gross(numbers))}</strong></div>
        <div><span>Deductions</span><strong>−{money(totalDeductions(numbers))}</strong></div>
        <div className="net"><span>Net pay</span><strong>{money(net)}</strong></div>
      </div>
      <div className="form-grid" style={{ marginTop: 14 }}>
        <TextareaField label="Notes" name="notes" value={record?.notes || ""} />
      </div>
    </Modal>
  );
}

export function PaySalaryModal({ salaryId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const record = state.salaries.find((r) => r.id === salaryId);
  if (!record) return null;
  return (
    <Modal title="Pay salary" subtitle={`${record.staffName} · ${monthLabel(record.month)}`} error={error}
      onSubmit={(form) => attempt(() => run(actions.paySalary, salaryId, form))} footer={<FormFooter label="Confirm payment" />}>
      <div className="pay-amount">
        <span>Net pay</span>
        <strong>{money(salaryNet(record))}</strong>
        <small>Gross {money(gross(record))} · deductions {money(totalDeductions(record))}</small>
      </div>
      <div className="form-grid">
        <SelectField label="Payment method" name="method" options={salaryMethods} value="Cash" />
        <Field label="Payment date" name="paidOn" type="date" value={todayISO()} required />
      </div>
      <p className="muted" style={{ fontSize: 12, margin: "12px 0 0" }}>The net amount is added to Expenses under “Staff Salary”.</p>
    </Modal>
  );
}

const SlipRow = ({ label, value, className = "" }) => <div className={`slip-row ${className}`}><span>{label}</span><strong>{value}</strong></div>;

export function PayslipModal({ salaryId }) {
  const state = useStore();
  const { openModal, perform, printReceipt } = useUi();
  const record = state.salaries.find((r) => r.id === salaryId);
  if (!record) return null;
  const member = state.staff.find((m) => m.id === record.staffId);
  const paid = record.status === "Paid";
  const net = salaryNet(record);

  const print = () => printReceipt({ payslip: true, ...record, net, phone: member?.phone || "" });
  const remove = () => openModal(<ConfirmModal title="Delete salary entry?" message={`This removes ${record.staffName}'s ${monthLabel(record.month)} entry${paid ? " and its expense record" : ""}.`} confirmLabel="Delete" danger onConfirm={() => perform(deleteRecord, "salary", record.id)} />);
  const undo = () => openModal(<ConfirmModal title="Undo payment?" message={`${record.staffName}'s salary goes back to pending and its expense record is removed.`} confirmLabel="Undo payment" onConfirm={() => perform(unpaySalary, record.id)} />);

  return (
    <Modal title="Payslip" subtitle={`${monthLabel(record.month)} · ${state.settings.clubName}`} wide
      footer={
        <CloseFooter>
          <button className="button button-danger" onClick={remove}><Icon name="x" />Delete</button>
          <button className="button" onClick={() => openModal(<SalaryFormModal salaryId={record.id} />)}><Icon name="edit" />Edit</button>
          <button className="button" onClick={print}><Icon name="printer" />Print</button>
          {paid
            ? <button className="button" onClick={undo}><Icon name="undo" />Undo payment</button>
            : <button className="button button-primary" onClick={() => openModal(<PaySalaryModal salaryId={record.id} />)}><Icon name="cash" />Pay now</button>}
        </CloseFooter>
      }>
      <div className="profile-hero">
        <Avatar name={record.staffName} />
        <div><strong>{record.staffName}</strong><span style={{ display: "block", color: "var(--color-text-muted)", fontSize: 12 }}>{record.role}{member?.phone ? ` · ${member.phone}` : ""}{member?.joined ? ` · joined ${shortDate(member.joined)}` : ""}</span></div>
        <StatusPill status={record.status} />
      </div>
      <div className="slip-columns">
        <section className="slip-card earning">
          <h3>Earnings</h3>
          <SlipRow label="Base salary" value={money(record.base)} />
          <SlipRow label="Bonus" value={money(record.bonus)} />
          <SlipRow label="Overtime" value={money(record.overtime)} />
          <SlipRow label="Gross pay" value={money(gross(record))} className="sum" />
        </section>
        <section className="slip-card deduction">
          <h3>Deductions</h3>
          <SlipRow label="Deduction" value={money(record.deduction)} />
          <SlipRow label="Advance paid" value={money(record.advance)} />
          <SlipRow label="Total deductions" value={money(totalDeductions(record))} className="sum" />
        </section>
      </div>
      <div className="slip-net">
        <div><span>Net pay</span><small>{paid ? `Paid ${shortDate(record.paidOn)} · ${record.method}` : "Awaiting payment"}</small></div>
        <strong>{money(net)}</strong>
      </div>
      {record.notes && <p className="muted" style={{ fontSize: 13, margin: "12px 0 0" }}>Notes: {record.notes}</p>}
    </Modal>
  );
}
