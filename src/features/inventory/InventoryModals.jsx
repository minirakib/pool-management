import { useState } from "react";
import * as actions from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import Modal, { CloseFooter, FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import { productIcon } from "@/lib/constants.js";
import { money } from "@/lib/format.js";

const NEW = "__new__";
export const marginOf = (cost, price) => (price > 0 ? Math.round(((price - cost) / price) * 100) : 0);

export function ProductFormModal({ productId = "", category: presetCategory = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const product = state.products.find((p) => p.id === productId);
  const cats = state.productCategories;
  const [category, setCategory] = useState(product?.category || (cats.includes(presetCategory) ? presetCategory : cats[0] || NEW));
  const [newCategory, setNewCategory] = useState("");
  const [cost, setCost] = useState(String(product?.cost ?? ""));
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const profit = (Number(price) || 0) - (Number(cost) || 0);
  const margin = marginOf(Number(cost) || 0, Number(price) || 0);
  const shownCategory = category === NEW ? newCategory.trim() || "New category" : category;

  return (
    <Modal wide className="product-modal" title={product ? `Edit ${product.name}` : "Add product"} subtitle="Details, pricing and stock for the counter and table sales." error={error}
      onSubmit={(values) => attempt(() => run(actions.saveProduct, productId, values))} footer={<FormFooter label={<><Icon name="check" />{product ? "Save product" : "Add product"}</>} />}>
      <div className="product-form">
        <section className="product-form-section">
          <h3><Icon name={productIcon(shownCategory)} />Details</h3>
          <div className="form-grid">
            <label className="field field-wide"><span>Product name</span><input name="name" defaultValue={product?.name || ""} required maxLength={60} placeholder="e.g. Mineral Water 500ml" /></label>
            <label className="field"><span>SKU</span><input name="sku" defaultValue={product?.sku || `SKU-${String(state.products.length + 1).padStart(3, "0")}`} required /></label>
            <label className="field">
              <span>Category</span>
              <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value={NEW}>+ New category…</option>
              </select>
            </label>
            {category === NEW && (
              <label className="field field-wide new-category-field">
                <span>New category name</span>
                <input name="newCategory" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required maxLength={30} placeholder="e.g. Energy Drinks" autoFocus />
              </label>
            )}
          </div>
        </section>

        <section className="product-form-section">
          <h3><Icon name="coin" />Pricing</h3>
          <div className="form-grid">
            <label className="field"><span>Cost price (BDT)</span><input name="cost" type="number" min="0" step="1" value={cost} onChange={(e) => setCost(e.target.value)} required /></label>
            <label className="field"><span>Selling price (BDT)</span><input name="price" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
          </div>
          <div className={`margin-preview${profit < 0 ? " loss" : ""}`}>
            <div><span>Profit / unit</span><strong>{money(profit)}</strong></div>
            <div><span>Margin</span><strong>{margin}%</strong></div>
            <div className="margin-bar" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}></i></div>
          </div>
        </section>

        <section className="product-form-section">
          <h3><Icon name="box" />Stock</h3>
          <div className="form-grid">
            <label className="field"><span>{product ? "Stock on hand" : "Opening stock"}</span><input name="stock" type="number" min="0" step="1" defaultValue={product?.stock ?? 0} required /></label>
            <label className="field"><span>Low-stock alert at</span><input name="threshold" type="number" min="0" step="1" defaultValue={product?.threshold ?? 5} required /></label>
          </div>
        </section>
      </div>
    </Modal>
  );
}

const QUICK = [-10, -5, -1, 1, 5, 10, 24];

export function StockAdjustModal({ productId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const product = state.products.find((p) => p.id === productId);
  const [delta, setDelta] = useState("12");
  if (!product) return null;
  const next = product.stock + (Number(delta) || 0);
  return (
    <Modal title="Adjust stock" subtitle={`${product.name} · ${product.sku}`} error={error}
      onSubmit={(values) => attempt(() => run(actions.adjustStock, productId, values.delta))} footer={<FormFooter label="Apply" autofocus />}>
      <div className="stock-adjust">
        <div><span>Now</span><strong>{product.stock}</strong></div>
        <Icon name="arrow-right" />
        <div className={next < 0 ? "bad" : next <= product.threshold ? "warn" : "good"}><span>After</span><strong>{next}</strong></div>
      </div>
      <label className="field">
        <span>Add (+) or remove (−) units</span>
        <input name="delta" type="number" step="1" value={delta} onChange={(e) => setDelta(e.target.value)} required />
      </label>
      <div className="quick-deltas">
        {QUICK.map((q) => <button key={q} type="button" className="filter-pill" onClick={() => setDelta(String(q))}>{q > 0 ? `+${q}` : q}</button>)}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: "12px 0 0" }}>Stock cannot go below zero. Low-stock alert at {product.threshold}.</p>
    </Modal>
  );
}

/** Add, rename and delete product categories. */
export function CategoryManagerModal() {
  const state = useStore();
  const { perform } = useUi();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const count = (c) => state.products.filter((p) => p.category === c).length;
  const add = (e) => { e.preventDefault(); if (perform(actions.addProductCategory, name)) setName(""); };
  const rename = (from) => { if (draft.trim() === from || perform(actions.renameProductCategory, from, draft)) setEditing(null); };

  return (
    <Modal title="Product categories" subtitle="Used for the inventory and the POS product filters." footer={<CloseFooter label="Done" />}>
      <form className="category-add" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" maxLength={30} aria-label="New category name" />
        <button className="button button-primary button-sm" type="submit" disabled={!name.trim()}><Icon name="plus" />Add</button>
      </form>
      <div className="category-list">
        {state.productCategories.map((c) => (
          <div key={c} className="category-item">
            <span className="category-glyph"><Icon name={productIcon(c)} /></span>
            {editing === c ? (
              <form className="category-rename" onSubmit={(e) => { e.preventDefault(); rename(c); }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={30} autoFocus aria-label={`Rename ${c}`} onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setEditing(null); } }} />
                <button className="icon-button" type="submit" aria-label="Save name"><Icon name="check" /></button>
                <button className="icon-button" type="button" onClick={() => setEditing(null)} aria-label="Cancel"><Icon name="x" /></button>
              </form>
            ) : (
              <>
                <div className="category-copy"><strong>{c}</strong><span>{count(c)} product{count(c) === 1 ? "" : "s"}</span></div>
                <button className="icon-button" onClick={() => { setEditing(c); setDraft(c); }} aria-label={`Rename ${c}`}><Icon name="edit" /></button>
                <button className="icon-button" onClick={() => perform(actions.deleteProductCategory, c)} disabled={count(c) > 0} title={count(c) ? "Move its products to another category first" : "Delete category"} aria-label={`Delete ${c}`}><Icon name="x" /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}
