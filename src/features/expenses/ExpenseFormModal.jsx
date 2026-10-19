import * as actions from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Modal, { FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import { Field, SelectField, TextareaField } from "@/components/ui";
import { expenseCategories, expenseMethods } from "@/lib/constants.js";
import { todayISO } from "@/lib/format.js";

export default function ExpenseFormModal({ expenseId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const expense = state.expenses.find((e) => e.id === expenseId);

  return (
    <Modal title={expense ? "Edit expense" : "Record expense"} subtitle="Add an operating cost to the club ledger." error={error}
      onSubmit={(values) => attempt(() => run(actions.saveExpense, expenseId, values))} footer={<FormFooter label="Save expense" />}>
      <div className="form-grid">
        <Field label="Title" name="title" value={expense?.title || ""} required />
        <SelectField label="Category" name="category" options={expenseCategories} value={expense?.category || "Electricity"} />
        <Field label="Amount (BDT)" name="amount" type="number" value={expense?.amount || ""} min="1" step="1" required />
        <Field label="Date" name="date" type="date" value={expense?.date || todayISO()} required />
        <SelectField label="Payment method" name="method" options={expenseMethods} value={expense?.method || "Cash"} />
        <Field label="Recorded by" name="recordedBy" value={expense?.recordedBy || "Admin"} />
        <TextareaField label="Description" name="description" value={expense?.description || ""} />
      </div>
    </Modal>
  );
}
