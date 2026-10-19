import * as actions from "@/app/actions";
import { findTable } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Modal, { FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import { Field, Select } from "@/components/ui";
import { money } from "@/lib/format.js";
import { muted } from "./shared.jsx";

export function AddProductModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const table = findTable(state, tableId);
  const stocked = state.products.filter((p) => p.stock > 0);

  return (
    <Modal title={`Add products · ${table.name}`} subtitle="Add available inventory to this live session bill." error={error}
      onSubmit={(values) => attempt(() => run(actions.addProductToSession, tableId, values.productId, values.qty))} footer={<FormFooter label="Add to session" />}>
      <div className="form-grid">
        <label className="field field-wide"><span>Product</span><Select name="productId" options={stocked.map((p) => [p.id, `${p.name} · ${money(p.price)} · ${p.stock} available`])} /></label>
        <Field label="Quantity" name="qty" type="number" value="1" min="1" step="1" required />
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Inventory is deducted immediately and the item appears on the closing bill.</p>
    </Modal>
  );
}
