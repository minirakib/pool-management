import { useState } from "react";
import * as actions from "@/app/actions";
import { findTable, tableSession } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import Modal, { useFormAttempt } from "@/components/Modal.jsx";
import { EmptyState } from "@/components/ui";
import { productIcon } from "@/lib/constants.js";
import { customerName } from "@/lib/domain.js";
import { money } from "@/lib/format.js";
import { PlayersPanel } from "./PlayersPanel.jsx";

/** Pick products into a cart (tap a product again for more), choose who ordered, then add the whole cart to the bill. */
export function AddProductModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { closeModal } = useUi();
  const { error, attempt } = useFormAttempt();
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  const stocked = state.products.filter((p) => p.stock > 0).sort((a, b) => a.name.localeCompare(b.name));
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]); // { productId, player, qty }
  const [player, setPlayer] = useState("");
  const q = query.trim().toLowerCase();
  const shown = stocked.filter((p) => !q || `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(q));
  const product = (id) => state.products.find((p) => p.id === id);
  const inCart = (id) => cart.filter((l) => l.productId === id).reduce((n, l) => n + l.qty, 0);
  const onBill = session?.products || [];

  const change = (productId, who, delta) => setCart((lines) => {
    const p = product(productId);
    const total = lines.filter((l) => l.productId === productId).reduce((n, l) => n + l.qty, 0);
    if (delta > 0 && total >= (p?.stock || 0)) return lines;
    const found = lines.find((l) => l.productId === productId && l.player === who);
    if (!found) return delta > 0 ? [...lines, { productId, player: who, qty: 1 }] : lines;
    return lines.map((l) => (l === found ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0);
  });
  const lineTotal = (l) => (product(l.productId)?.price || 0) * l.qty;
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const total = cart.reduce((sum, l) => sum + lineTotal(l), 0);

  return (
    <Modal wide className="add-product-modal" title={`Add products · ${table.name}`} subtitle={session ? `${customerName(state, session)} · tap products to build the cart, then add them to the bill.` : "Add items to this game's bill."} error={error}
      onSubmit={() => attempt(() => run(actions.addProductsToSession, tableId, cart.map(({ productId, qty, player: who }) => ({ productId, qty, player: who }))))}
      footer={
        <>
          <button className="button" type="button" onClick={closeModal}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={!cart.length}>
            <Icon name="plus" />{cart.length ? `Add ${count} item${count === 1 ? "" : "s"} · ${money(total)}` : "Add to bill"}
          </button>
        </>
      }>
      <div className="add-product-layout">
        <section className="pick-main">
          <div className="search-box">
            <span className="search-icon"><Icon name="search" /></span>
            <input type="search" placeholder="Search products…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" data-autofocus
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (shown[0]) change(shown[0].id, player, 1); } }} />
          </div>
          {shown.length ? (
            <div className="pick-grid" aria-label="Products">
              {shown.map((p) => {
                const n = inCart(p.id);
                return (
                  <button key={p.id} type="button" className={`pick-tile${n ? " active" : ""}`} disabled={n >= p.stock} onClick={() => change(p.id, player, 1)}>
                    <span className="pick-icon"><Icon name={productIcon(p.category)} /></span>
                    <span className="pick-copy"><strong>{p.name}</strong><small>{p.stock - n} in stock</small></span>
                    <b>{money(p.price)}</b>
                    {n > 0 && <span className="pick-badge">{n}</span>}
                  </button>
                );
              })}
            </div>
          ) : <EmptyState title={stocked.length ? "No products match" : "No products in stock"} description={stocked.length ? "Try another name." : "Add stock in Inventory first."} />}
        </section>

        <aside className="pick-side">
          <div className="checkout-card">
            <div className="checkout-card-head"><span>Cart</span>{!!cart.length && <button type="button" className="link-button" onClick={() => setCart([])}>Clear</button>}</div>
            {cart.length ? (
              <div className="pcart-lines">
                {cart.map((l, i) => (
                  <div key={l.productId + l.player} className="pcart-line">
                    <span className="pcart-no">{i + 1}</span>
                    <div className="pcart-name"><strong>{product(l.productId)?.name}</strong>{l.player && <small>{l.player}</small>}</div>
                    <div className="qty-control" aria-label="Quantity">
                      <button type="button" onClick={() => change(l.productId, l.player, -1)} aria-label="Less">−</button>
                      <span>{l.qty}</span>
                      <button type="button" onClick={() => change(l.productId, l.player, 1)} disabled={inCart(l.productId) >= (product(l.productId)?.stock || 0)} aria-label="More">+</button>
                    </div>
                    <strong className="pcart-price">{money(lineTotal(l))}</strong>
                  </div>
                ))}
                <div className="pick-line pcart-total"><span>Cart total</span><strong>{money(total)}</strong></div>
              </div>
            ) : <p className="muted pick-empty">Tap a product to add it. Tap again for more.</p>}
          </div>
          <PlayersPanel tableId={tableId} selected={player} onSelect={setPlayer} />
          <div className="checkout-card">
            <div className="checkout-card-head"><span>Already on this bill</span></div>
            {onBill.length ? onBill.map((item) => (
              <div key={item.productId + (item.player || "")} className="pick-line"><span>{item.name} × {item.qty}{item.player ? ` · ${item.player}` : ""}</span><strong>{money(item.price * item.qty)}</strong></div>
            )) : <p className="muted pick-empty">No products yet.</p>}
          </div>
          <p className="muted pick-note">Stock is deducted straight away and the items show on the closing bill.</p>
        </aside>
      </div>
    </Modal>
  );
}
