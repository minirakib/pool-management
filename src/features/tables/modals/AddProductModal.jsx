import { useState } from "react";
import * as actions from "@/app/actions";
import { findTable, tableSession } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Icon from "@/components/Icon.jsx";
import Modal, { FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import { EmptyState } from "@/components/ui";
import { productIcon } from "@/lib/constants.js";
import { customerName } from "@/lib/domain.js";
import { money } from "@/lib/format.js";

/** Pick a product from a searchable grid, set the quantity, and see the session's products beside it. */
export function AddProductModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  const stocked = state.products.filter((p) => p.stock > 0).sort((a, b) => a.name.localeCompare(b.name));
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState(stocked[0]?.id || "");
  const [qty, setQty] = useState(1);
  const picked = stocked.find((p) => p.id === pickedId);
  const q = query.trim().toLowerCase();
  const shown = stocked.filter((p) => !q || `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(q));
  const pick = (id) => { setPickedId(id); setQty(1); };
  const step = (delta) => setQty((n) => Math.min(picked?.stock || 1, Math.max(1, n + delta)));
  const onBill = session?.products || [];

  return (
    <Modal wide className="add-product-modal" title={`Add products · ${table.name}`} subtitle={session ? `${customerName(state, session)} · items are added to this game's bill.` : "Add items to this game's bill."} error={error}
      onSubmit={(values) => attempt(() => run(actions.addProductToSession, tableId, values.productId, values.qty))}
      footer={<FormFooter label={picked ? <><Icon name="plus" />Add {qty} × {picked.name} · {money(picked.price * qty)}</> : "Add to bill"} />}>
      <input type="hidden" name="productId" value={pickedId} />
      <input type="hidden" name="qty" value={qty} />
      <div className="add-product-layout">
        <section className="pick-main">
          <div className="search-box">
            <span className="search-icon"><Icon name="search" /></span>
            <input type="search" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" data-autofocus
              onKeyDown={(e) => { if (e.key === "Enter" && shown[0] && shown[0].id !== pickedId) { e.preventDefault(); pick(shown[0].id); } }} />
          </div>
          {shown.length ? (
            <div className="pick-grid" role="radiogroup" aria-label="Product">
              {shown.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={p.id === pickedId} className={`pick-tile${p.id === pickedId ? " active" : ""}`} onClick={() => pick(p.id)}>
                  <span className="pick-icon"><Icon name={productIcon(p.category)} /></span>
                  <span className="pick-copy"><strong>{p.name}</strong><small>{p.stock} in stock</small></span>
                  <b>{money(p.price)}</b>
                </button>
              ))}
            </div>
          ) : <EmptyState title={stocked.length ? "No products match" : "No products in stock"} description={stocked.length ? "Try another name." : "Add stock in Inventory first."} />}
        </section>

        <aside className="pick-side">
          <div className="checkout-card">
            <div className="checkout-card-head"><span>Quantity</span>{picked && <small>{picked.stock} available</small>}</div>
            <div className="qty-big">
              <button type="button" onClick={() => step(-1)} disabled={!picked || qty <= 1} aria-label="Less"><Icon name="minus" /></button>
              <strong>{qty}</strong>
              <button type="button" onClick={() => step(1)} disabled={!picked || qty >= picked.stock} aria-label="More"><Icon name="plus" /></button>
            </div>
            {picked && <div className="pick-line"><span>{picked.name} × {qty}</span><strong>{money(picked.price * qty)}</strong></div>}
          </div>
          <div className="checkout-card">
            <div className="checkout-card-head"><span>Already on this bill</span></div>
            {onBill.length ? onBill.map((item) => (
              <div key={item.productId} className="pick-line"><span>{item.name} × {item.qty}</span><strong>{money(item.price * item.qty)}</strong></div>
            )) : <p className="muted pick-empty">No products yet.</p>}
          </div>
          <p className="muted pick-note">Stock is deducted straight away and the items show on the closing bill.</p>
        </aside>
      </div>
    </Modal>
  );
}
