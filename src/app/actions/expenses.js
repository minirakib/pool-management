/** Expense records. */
import { uid } from "../../lib/format.js";

export function saveExpense(s, expenseId, values) {
  const expense = s.expenses.find((entry) => entry.id === expenseId);
  const saved = { ...(expense || { id: uid("exp") }), title: values.title.trim(), category: values.category, amount: Number(values.amount), date: values.date, method: values.method, recordedBy: values.recordedBy.trim() || "Admin", description: values.description.trim() };
  if (expense) Object.assign(expense, saved);
  else s.expenses.push(saved);
  return "Expense record saved.";
}

/* ---------- Product categories ---------- */
