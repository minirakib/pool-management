import { useState } from "react";
import * as actions from "../../app/actions.js";
import { deleteConfigs, deleteRecord } from "../../app/actions.js";
import { useStore, useStoreApi } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import Modal, { ConfirmModal, FormFooter, useFormAttempt } from "../../components/Modal.jsx";
import { EmptyState, Field, PageHeading, ReadonlyField, SearchBox, Select, SelectField, StatusPill } from "../../components/ui.jsx";
import { productCategories } from "../../lib/constants.js";
import { csvDownload } from "../../lib/download.js";
import { money } from "../../lib/format.js";

function ProductFormModal({ productId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const product = state.products.find((p) => p.id === productId);
  return (
    <Modal title={product ? "Edit product" : "Add product"} subtitle="Update price and stock details for your product catalog." error={error}
      onSubmit={(values) => attempt(() => run(actions.saveProduct, productId, values))} footer={<FormFooter label={product ? "Save product" : "Add product"} />}>
      <div className="form-grid">
        <Field label="Product name" name="name" value={product?.name || ""} required />
        <Field label="SKU" name="sku" value={product?.sku || `SKU-${String(state.products.length + 1).padStart(3, "0")}`} required />
        <SelectField label="Category" name="category" options={productCategories} value={product?.category || "Soft Drinks"} />
        <Field label="Cost price (BDT)" name="cost" type="number" value={product?.cost ?? 0} min="0" step="1" required />
        <Field label="Selling price (BDT)" name="price" type="number" value={product?.price ?? 0} min="0" step="1" required />
        <Field label="Stock quantity" name="stock" type="number" value={product?.stock ?? 0} min="0" step="1" required />
        <Field label="Low-stock threshold" name="threshold" type="number" value={product?.threshold ?? 5} min="0" step="1" required />
      </div>
    </Modal>
  );
}

function StockAdjustModal({ productId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const product = state.products.find((p) => p.id === productId);
  return (
    <Modal title={`Adjust stock · ${product.name}`} subtitle="Enter a positive or negative quantity adjustment." error={error}
      onSubmit={(values) => attempt(() => run(actions.adjustStock, productId, values.delta))} footer={<FormFooter label="Apply adjustment" />}>
      <div className="form-grid">
        <ReadonlyField label="Current stock" value={`${product.stock} units`} />
        <Field label="Adjustment (+ / −)" name="delta" type="number" value="1" required step="1" />
        <p className="muted field-wide" style={{ fontSize: 13 }}>Stock cannot fall below zero. Current cost value: {money(product.stock * product.cost)}.</p>
      </div>
    </Modal>
  );
}

export default function InventoryPage() {
  const state = useStore();
  const { openModal, notify, perform, search, setSearch } = useUi();
  const [category, setCategory] = useState("All");
  const { products } = state;
  const [stockFilter, setStockFilter] = useState("all");
  const stockMatch = { all: () => true, low: (p) => p.stock > 0 && p.stock <= p.threshold, out: (p) => p.stock === 0 }[stockFilter];
  const matches = products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()) && (category === "All" || p.category === category) && stockMatch(p));
  const value = products.reduce((sum, p) => sum + p.stock * p.cost, 0);
  const low = products.filter((p) => p.stock > 0 && p.stock <= p.threshold).length;
  const out = products.filter((p) => p.stock === 0).length;
  const add = () => openModal(<ProductFormModal />);

  const exportCsv = () => {
    csvDownload("cuecore-inventory.csv", [["Product", "SKU", "Category", "Cost BDT", "Price BDT", "Stock", "Low stock threshold"], ...products.map((p) => [p.name, p.sku, p.category, p.cost, p.price, p.stock, p.threshold])]);
    notify("cuecore-inventory.csv downloaded.", "success", "Export ready");
  };
  const remove = (p) => {
    if (deleteConfigs.product.blocked(state, p)) return notify("This product is referenced by an active session and cannot be removed yet.", "warning");
    openModal(<ConfirmModal title="Delete product?" message={`This will permanently remove ${p.name} from the saved demo data.`} confirmLabel="Delete" danger onConfirm={() => perform(deleteRecord, "product", p.id)} />);
  };

  return (
    <>
      {/* Low / Out pills filter the list, replacing the old alert banner. */}
      <PageHeading title="Inventory" stats={[
        { label: "Products", value: products.length, tone: "primary", active: stockFilter === "all", onClick: () => setStockFilter("all") },
        { label: "Value", value: money(value), tone: "gold", title: "Cost price × stock" },
        { label: "Low", value: low, tone: low ? "warning" : "muted", active: stockFilter === "low", onClick: () => setStockFilter(stockFilter === "low" ? "all" : "low") },
        { label: "Out", value: out, tone: out ? "danger" : "muted", active: stockFilter === "out", onClick: () => setStockFilter(stockFilter === "out" ? "all" : "out") }
      ]}>
        <Select className="heading-select" aria-label="Filter category" value={category} onChange={(e) => setCategory(e.target.value)} options={[["All", "All categories"], ...productCategories]} />
        <button className="button button-sm" onClick={exportCsv} title="Export CSV"><Icon name="download" /><span className="btn-label">CSV</span></button>
        <button className="button button-primary button-sm" onClick={add}><Icon name="plus" />Add product</button>
      </PageHeading>
      <SearchBox className="page-search" placeholder="Search product or SKU…" value={search} onChange={setSearch} />
      <article className="panel">
        {matches.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Category</th><th>Cost</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {matches.map((p) => (
                  <tr key={p.id}>
                    <td><span className="table-primary">{p.name}</span><span className="table-sub">SKU {p.sku}</span></td>
                    <td>{p.category}</td>
                    <td>{money(p.cost)}</td>
                    <td>{money(p.price)}</td>
                    <td><strong className="table-primary">{p.stock}</strong><span className="table-sub">Alert at {p.threshold}</span></td>
                    <td><StatusPill status={p.stock === 0 ? "Out of stock" : p.stock <= p.threshold ? "Low stock" : "In stock"} /></td>
                    <td><div className="table-actions">
                      <button className="button button-sm" onClick={() => openModal(<StockAdjustModal productId={p.id} />)}>Adjust</button>
                      <button className="button button-sm" onClick={() => openModal(<ProductFormModal productId={p.id} />)}>Edit</button>
                      <button className="icon-button" onClick={() => remove(p)} aria-label="Delete product"><Icon name="x" /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No products found" description="Adjust the filters or add a product."><button className="button button-primary" onClick={add}>Add product</button></EmptyState>}
      </article>
    </>
  );
}
