/** Payroll: salary entries, payment and the matching expense. */
import { salaryNet } from "../../lib/domain.js";
import { uid } from "../../lib/format.js";
import { fail } from "./helpers.js";

const salaryAmounts = (values) => Object.fromEntries(["base", "bonus", "overtime", "deduction", "advance"].map((key) => [key, Math.max(0, Math.round(Number(values[key]) || 0))]));

/** Keeps the expense created by a paid salary in step with the salary record. */
function syncSalaryExpense(s, record) {
  const expense = s.expenses.find((entry) => entry.id === record.expenseId);
  if (!expense) return;
  Object.assign(expense, { title: `Salary · ${record.staffName}`, amount: salaryNet(record), date: record.paidOn, method: record.method, description: `Payroll for ${record.month}` });
}

export function saveSalary(s, salaryId, values) {
  const member = s.staff.find((entry) => entry.id === values.staffId);
  if (!member) fail("Choose a staff member.");
  if (!/^\d{4}-\d{2}$/.test(values.month || "")) fail("Choose a salary month.");
  const record = s.salaries.find((entry) => entry.id === salaryId);
  if (s.salaries.some((entry) => entry.id !== record?.id && entry.staffId === member.id && entry.month === values.month)) fail(`${member.name} already has a salary entry for this month.`);
  const amounts = salaryAmounts(values);
  if (!amounts.base) fail("Base salary must be more than zero.");
  if (salaryNet(amounts) < 0) fail("Deductions and advance cannot be more than the gross salary.");
  const saved = { ...(record || { id: uid("sal"), status: "Pending", paidOn: "", method: "", expenseId: "" }), staffId: member.id, staffName: member.name, role: member.role, month: values.month, ...amounts, notes: (values.notes || "").trim() };
  if (record) { Object.assign(record, saved); syncSalaryExpense(s, record); }
  else s.salaries.push(saved);
  return `Salary for ${member.name} ${record ? "updated" : "added"}.`;
}

/** Creates pending salary entries for every active staff member with a monthly salary. */
export function generatePayroll(s, month) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) fail("Choose a salary month.");
  const missing = s.staff.filter((m) => m.status === "Active" && m.salary > 0 && !s.salaries.some((r) => r.staffId === m.id && r.month === month));
  if (!missing.length) fail("Every active staff member with a salary already has an entry for this month.");
  missing.forEach((m) => s.salaries.push({ id: uid("sal"), staffId: m.id, staffName: m.name, role: m.role, month, base: m.salary, bonus: 0, overtime: 0, deduction: 0, advance: 0, status: "Pending", paidOn: "", method: "", expenseId: "", notes: "" }));
  return `Payroll created for ${missing.length} staff member${missing.length === 1 ? "" : "s"}.`;
}

/** Marks a salary paid and records the net amount as a "Staff Salary" expense. */
export function paySalary(s, salaryId, values) {
  const record = s.salaries.find((entry) => entry.id === salaryId);
  if (!record) fail("This salary entry no longer exists.");
  if (record.status === "Paid") fail("This salary has already been paid.");
  if (!values.paidOn) fail("Choose the payment date.");
  Object.assign(record, { status: "Paid", paidOn: values.paidOn, method: values.method || "Cash", expenseId: uid("exp") });
  s.expenses.push({ id: record.expenseId, title: "", category: "Staff Salary", amount: 0, date: "", method: "", description: "", recordedBy: "Admin", salaryId: record.id });
  syncSalaryExpense(s, record);
  return `${record.staffName}'s salary of ${salaryNet(record).toLocaleString("en-BD")} BDT marked paid.`;
}

/** Reverses a payment: the salary goes back to pending and its expense is removed. */
export function unpaySalary(s, salaryId) {
  const record = s.salaries.find((entry) => entry.id === salaryId);
  if (!record || record.status !== "Paid") return null;
  s.expenses = s.expenses.filter((entry) => entry.id !== record.expenseId);
  Object.assign(record, { status: "Pending", paidOn: "", method: "", expenseId: "" });
  return `${record.staffName}'s salary moved back to pending.`;
}
