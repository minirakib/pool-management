/** Generic delete with per-type rules (blocked deletes, cleanups). */
import { unpaySalary } from "./salary.js";

export const deleteConfigs = {
  customer: { list: "customers", field: "name", label: "customer", blocked: (s, r) => s.sessions.some((x) => x.customerId === r.id) },
  booking: { list: "bookings", field: "id", label: "booking" },
  product: { list: "products", field: "name", label: "product", blocked: (s, r) => s.sessions.some((x) => x.products.some((i) => i.productId === r.id)) },
  // A salary's expense goes with it; deleting a salary expense returns the salary to pending.
  expense: { list: "expenses", field: "title", label: "expense", cleanup: (s, r) => { if (r.salaryId) unpaySalary(s, r.salaryId); } },
  staff: { list: "staff", field: "name", label: "staff member" },
  salary: { list: "salaries", field: "staffName", label: "salary entry", cleanup: (s, r) => { if (r.expenseId) s.expenses = s.expenses.filter((e) => e.id !== r.expenseId); } }
};

export function deleteRecord(s, kind, id) {
  const config = deleteConfigs[kind];
  const record = s[config.list].find((entry) => entry.id === id);
  if (record) config.cleanup?.(s, record);
  s[config.list] = s[config.list].filter((entry) => entry.id !== id);
  return `${config.label[0].toUpperCase() + config.label.slice(1)} deleted.`;
}
