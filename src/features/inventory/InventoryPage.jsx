import { useState } from "react";
import * as actions from "@/app/actions";
import { deleteConfigs, deleteRecord } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { ConfirmModal } from "@/components/Modal.jsx";
import { EmptyState, PageHeading, SearchBox, StatusPill } from "@/components/ui";
import { productIcon } from "@/lib/constants.js";
import { csvDownload } from "@/lib/download.js";
import { money } from "@/lib/format.js";
import { CategoryManagerModal, marginOf, ProductFormModal, StockAdjustModal } from "./InventoryModals.jsx";
import "./inventory.css";

const stockState = (p) => (p.stock === 0 ? "out" : p.stock <= p.threshold ? "low" : "ok");
const STOCK_LABEL = { out: "Out of stock", low: "Low stock", ok: "In stock" };
const SORTS = [["name", "Name"], ["stock", "Lowest stock"], ["value", "Stock value"], ["margin", "Margin"]];
const stop = (e) => e.stopPropagation();

export default function InventoryPage() {
  const state = useStore();
  const { openModal, notify, perform, search, setSearch } = useUi();
  const { products, productCategories: categories } = state;
  const [category, setCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState("name");

  const inCategory = category === "All" || !categories.includes(category) ? products : products.filter((p) => p.category === category);
  const matches = inCategory
    .filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => stockFilter === "all" || stockState(p) === stockFilter)
    .sort({
      name: (a, b) => a.name.localeCompare(b.name),
      stock: (a, b) => a.stock / Math.max(1, a.threshold) - b.stock / Math.max(1, b.threshold),
      value: (a, b) => b.stock * b.cost - a.stock * a.cost,
      margin: (a, b) => marginOf(b.cost, b.price) - marginOf(a.cost, a.price)
    }[sort]);
  const value = products.reduce((sum, p) => sum + p.stock * p.cost, 0);
  const retail = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const low = products.filter((p) => stockState(p) === "low").length;
  const out = products.filter((p) => stockState(p) === "out").length;
  const add = () => openModal(<ProductFormModal category={category} />);
  const edit = (p) => openModal(<ProductFormModal productId={p.id} />);

  const exportCsv = () => {
    csvDownload("cuecore-inventory.csv", [["Product", "SKU", "Category", "Cost BDT", "Price BDT", "Margin %", "Stock", "Low stock alert", "Stock value BDT"],
      ...matches.map((p) => [p.name, p.sku, p.category, p.cost, p.price, marginOf(p.cost, p.price), p.stock, p.threshold, p.stock * p.cost])]);
    notify("cuecore-inventory.csv downloaded.", "success", "Export ready");
  };
  const remove = (p) => {
    if (deleteConfigs.product.blocked(state, p)) return notify("This product is referenced by an active session and cannot be removed yet.", "warning");
    openModal(<ConfirmModal title="Delete product?" message={`This will permanently remove ${p.name} from the saved demo data.`} confirmLabel="Delete" danger onConfirm={() => perform(deleteRecord, "product", p.id)} />);
  };

  return (
    <>
      {/* Low / Out pills filter the list. */}
      <PageHeading title="Inventory" stats={[
        { label: "Products", value: products.length, tone: "primary", active: stockFilter === "all", onClick: () => setStockFilter("all") },
        { label: "Value", value: money(value), tone: "gold", title: `Cost × stock · retail value ${money(retail)}` },
        { label: "Low", value: low, tone: low ? "warning" : "muted", active: stockFilter === "low", onClick: () => setStockFilter(stockFilter === "low" ? "all" : "low") },
        { label: "Out", value: out, tone: out ? "danger" : "muted", active: stockFilter === "out", onClick: () => setStockFilter(stockFilter === "out" ? "all" : "out") }
      ]}>
        <button className="button button-sm" onClick={exportCsv} title="Export the products shown"><Icon name="download" /><span className="btn-label">CSV</span></button>
        <button className="button button-primary button-sm" onClick={add}><Icon name="plus" />Add product</button>
      </PageHeading>

      <div className="inventory-bar">
        <div className="category-tabs" role="tablist" aria-label="Product category">
          {[["All", products.length], ...categories.map((c) => [c, products.filter((p) => p.category === c).length])].map(([c, n]) => (
            <button key={c} role="tab" aria-selected={category === c} className={`category-tab${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>
              {c !== "All" && <Icon name={productIcon(c)} />}{c}<b>{n}</b>
            </button>
          ))}
          <button className="category-tab manage" onClick={() => openModal(<CategoryManagerModal />)} title="Add, rename or delete categories"><Icon name="plus" />Category</button>
        </div>
        <label className="sort-select">
          <span>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">{SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        </label>
      </div>
      <SearchBox className="page-search" placeholder="Search product or SKU…" value={search} onChange={setSearch} />

      <article className="panel inventory-panel">
        {matches.length ? (
          <div className="data-table-wrap">
            <table className="data-table inventory-table">
              <thead><tr><th>Product</th><th className="num">Price</th><th className="num">Margin</th><th>Stock</th><th className="num">Value</th><th></th></tr></thead>
              <tbody>
                {matches.map((p) => {
                  const st = stockState(p);
                  const margin = marginOf(p.cost, p.price);
                  return (
                    <tr key={p.id} className="clickable-row" data-stock={st} tabIndex={0} onClick={() => edit(p)} onKeyDown={(e) => { if (e.target === e.currentTarget && e.key === "Enter") edit(p); }}>
                      <td>
                        <div className="product-cell">
                          <span className="product-chip"><Icon name={productIcon(p.category)} /></span>
                          <div><span className="table-primary">{p.name}</span><span className="table-sub">{p.category} · {p.sku}</span></div>
                        </div>
                      </td>
                      <td className="num"><span className="table-primary">{money(p.price)}</span><span className="table-sub">cost {money(p.cost)}</span></td>
                      <td className="num"><span className={`margin-tag${margin < 20 ? " thin" : ""}`}>{margin}%</span></td>
                      <td onClick={stop}>
                        <div className="stock-cell">
                          <div className="stock-stepper">
                            <button type="button" onClick={() => perform(actions.adjustStock, p.id, -1)} disabled={!p.stock} aria-label={`Remove one ${p.name}`}>−</button>
                            <strong title={`Alert at ${p.threshold}`}>{p.stock}</strong>
                            <button type="button" onClick={() => perform(actions.adjustStock, p.id, 1)} aria-label={`Add one ${p.name}`}>+</button>
                          </div>
                          <div className="stock-meter" title={`${p.stock} in stock · alert at ${p.threshold}`}><i style={{ width: `${Math.min(100, (p.stock / Math.max(1, p.threshold * 3)) * 100)}%` }}></i></div>
                          <StatusPill status={STOCK_LABEL[st]} />
                        </div>
                      </td>
                      <td className="num">{money(p.stock * p.cost)}</td>
                      <td onClick={stop}><div className="table-actions">
                        <button className="button button-sm" onClick={() => openModal(<StockAdjustModal productId={p.id} />)} title="Add or remove several units"><Icon name="box" />Restock</button>
                        <button className="icon-button" onClick={() => edit(p)} aria-label={`Edit ${p.name}`}><Icon name="edit" /></button>
                        <button className="icon-button" onClick={() => remove(p)} aria-label="Delete product"><Icon name="x" /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No products found" description={inCategory.length ? "Try another stock filter or search." : "This category is empty."}><button className="button button-primary" onClick={add}><Icon name="plus" />Add product</button></EmptyState>}
      </article>
    </>
  );
}
