import { useEffect, useRef, useState } from "react";
import { completeSale } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { MiniStats, Segmented } from "@/components/ui";
import { paymentMethods, productIcon } from "@/lib/constants.js";
import { money, todayISO } from "@/lib/format.js";
import { useDragScroll } from "@/hooks/useDragScroll.js";
import PosTransactions, { transactionCount } from "./PosTransactions.jsx";
import "./pos.css";

// A counter sale has no member account, so Customer Credit is not offered here.
const SALE_METHODS = paymentMethods.filter((m) => m !== "Customer Credit");
const QUICK_DISCOUNTS = [5, 10, 15];

function ProductCard({ product, inCart, onAdd }) {
  const out = product.stock <= 0;
  const low = !out && product.stock <= product.threshold;
  const left = product.stock - inCart;
  return (
    <button type="button" className={`pos-product${inCart ? " in-cart" : ""}`} onClick={() => onAdd(product)} disabled={out || left <= 0}
      aria-label={`Add ${product.name}, ${money(product.price)}`}>
      {inCart > 0 && <span className="pos-product-qty">{inCart}</span>}
      <span className="pos-product-glyph"><Icon name={productIcon(product.category)} /></span>
      <span className="pos-product-name">{product.name}</span>
      <span className="pos-product-cat">{product.category}</span>
      <span className="pos-product-foot">
        <b>{money(product.price)}</b>
        <span className={`pos-stock${out ? " out" : low ? " low" : ""}`}>{out ? "Sold out" : `${product.stock} left`}</span>
      </span>
      {!out && <span className="pos-product-add"><Icon name="plus" /></span>}
    </button>
  );
}

function CartLine({ line, onStep, onRemove }) {
  return (
    <li className="pos-line">
      <span className="pos-line-glyph"><Icon name={productIcon(line.category)} /></span>
      <div className="pos-line-copy">
        <strong>{line.name}</strong>
        <span>{money(line.price)} each</span>
      </div>
      <div className="pos-stepper" aria-label={`${line.name} quantity`}>
        <button type="button" onClick={() => onStep(line, -1)} aria-label="Decrease quantity"><Icon name="minus" /></button>
        <span>{line.qty}</span>
        <button type="button" onClick={() => onStep(line, 1)} aria-label="Increase quantity"><Icon name="plus" /></button>
      </div>
      <b className="pos-line-total">{money(line.price * line.qty)}</b>
      <button type="button" className="pos-line-remove" onClick={() => onRemove(line)} aria-label={`Remove ${line.name}`}><Icon name="x" /></button>
    </li>
  );
}

/** POS → Sales, in two tabs: Sell (products + cart) and Transactions (saved counter sales). */
export default function PosSalesPage() {
  const state = useStore();
  const [tab, setTab] = useState("sell");
  return (
    <>
      <div className="toolbar pos-tabs">
        <Segmented label="POS Sales section" value={tab} onChange={setTab} options={[
          { id: "sell", label: "Sell", icon: "cart" },
          { id: "transactions", label: "Transactions", icon: "receipt", count: transactionCount(state, "sales") }
        ]} />
      </div>
      {tab === "sell" ? <SellTab /> : <PosTransactions kind="sales" />}
    </>
  );
}

/** Product list as the main focus, with the cart fixed full-height on the right. */
function SellTab() {
  const state = useStore();
  const { run } = useStoreApi();
  const { notify, search, setSearch, cart, setCart } = useUi();
  const [category, setCategory] = useState("All");
  const [discount, setDiscount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [cartOpen, setCartOpen] = useState(false); // small screens: cart is a drawer
  const searchRef = useRef(null);
  const categoryRef = useDragScroll();

  // The fixed cart takes the right edge of the screen; the rest of the app shell makes room for it.
  useEffect(() => {
    document.body.classList.add("pos-cart-layout");
    return () => document.body.classList.remove("pos-cart-layout");
  }, []);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const q = search.trim().toLowerCase();
  const inCategory = (p) => category === "All" || p.category === category;
  const products = state.products
    .filter((p) => inCategory(p) && (!q || `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q)))
    .sort((a, b) => (a.stock <= 0) - (b.stock <= 0) || a.name.localeCompare(b.name));
  const qtyInCart = (id) => cart.find((l) => l.productId === id)?.qty || 0;

  const itemCount = cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const cartDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const payable = Math.max(0, Math.round(subtotal - cartDiscount));
  const salesToday = state.transactions.filter((t) => t.type === "sale" && t.date.slice(0, 10) === todayISO());

  const addToCart = (product) => {
    const line = cart.find((l) => l.productId === product.id);
    if (product.stock <= (line?.qty || 0)) return notify(`Only ${product.stock} ${product.name} in stock.`, "warning");
    setCart(line ? cart.map((l) => (l === line ? { ...l, qty: l.qty + 1 } : l)) : [...cart, { productId: product.id, name: product.name, category: product.category, price: product.price, qty: 1 }]);
  };
  const step = (line, delta) => {
    const product = state.products.find((p) => p.id === line.productId);
    const next = line.qty + delta;
    if (next <= 0) setCart(cart.filter((l) => l !== line));
    else if (next <= (product?.stock ?? 0)) setCart(cart.map((l) => (l === line ? { ...l, qty: next } : l)));
    else notify(`Only ${product?.stock ?? 0} ${line.name} in stock.`, "warning");
  };
  const remove = (line) => setCart(cart.filter((l) => l !== line));
  const clear = () => { setCart([]); setDiscount(""); };
  const checkout = () => {
    try {
      const { amount } = run(completeSale, cart, cartDiscount, method);
      clear();
      setCartOpen(false);
      notify(`${money(amount)} sale recorded via ${method}.`, "success", "Sale complete");
      searchRef.current?.focus();
    } catch (error) {
      notify(error.message, error.message.includes("stock") ? "error" : "warning");
    }
  };
  // Enter in the search box adds the first matching product: scan or type, then Enter.
  const onSearchKey = (e) => {
    if (e.key !== "Enter") return;
    const first = products.find((p) => p.stock > qtyInCart(p.id));
    if (first) { addToCart(first); setSearch(""); }
  };

  return (
    <div className="pos-sales">
      <section className="panel pos-catalog" aria-label="Products">
        <div className="pos-catalog-top">
          <div className="search-box pos-search">
            <span className="search-icon"><Icon name="search" /></span>
            <input ref={searchRef} type="search" placeholder="Search product, SKU or category — Enter adds the first match" value={search}
              onChange={(e) => setSearch(e.target.value)} onKeyDown={onSearchKey} aria-label="Search products" />
          </div>
          <MiniStats label="Today" items={[
            { label: "Sales today", value: money(salesToday.reduce((s, t) => s + t.amount, 0)), tone: "gold" },
            { label: "Orders", value: salesToday.length, tone: "primary" }
          ]} />
        </div>
        <div ref={categoryRef} className="pos-categories" role="tablist" aria-label="Product category">
          {["All", ...state.productCategories].map((c) => (
            <button key={c} role="tab" aria-selected={category === c} className={`pos-category${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>
              {c !== "All" && <Icon name={productIcon(c)} />}{c}<span>{state.products.filter((p) => c === "All" || p.category === c).length}</span>
            </button>
          ))}
        </div>
        {products.length ? (
          <div className="pos-product-grid">
            {products.map((p) => <ProductCard key={p.id} product={p} inCart={qtyInCart(p.id)} onAdd={addToCart} />)}
          </div>
        ) : (
          <div className="pos-empty">
            <span><Icon name="search" /></span>
            <strong>No products found</strong>
            <p>Try another name or category.</p>
            {(q || category !== "All") && <button className="button button-sm" onClick={() => { setSearch(""); setCategory("All"); }}>Show all products</button>}
          </div>
        )}
      </section>

      {/* Small screens: a bottom bar opens the cart as a drawer. */}
      <button type="button" className="pos-cart-bar" onClick={() => setCartOpen(true)} aria-label="Open cart">
        <span className="pos-cart-bar-icon"><Icon name="cart" />{itemCount > 0 && <i>{itemCount}</i>}</span>
        <span>{itemCount ? `${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart is empty"}</span>
        <b>{money(payable)}</b>
      </button>
      {cartOpen && <div className="pos-cart-scrim" onClick={() => setCartOpen(false)} aria-hidden="true"></div>}

      <aside className={`pos-cart${cartOpen ? " open" : ""}`} aria-label="Sale cart">
        {/* Drawer close: only shown on small screens */}
        <button type="button" className="icon-button pos-cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart"><Icon name="x" /></button>

        {cart.length ? (
          <ul className="pos-lines">{cart.map((line) => <CartLine key={line.productId} line={line} onStep={step} onRemove={remove} />)}</ul>
        ) : (
          <div className="pos-cart-empty">
            <span><Icon name="cart" /></span>
            <strong>Cart is empty</strong>
            <p>Tap a product to add it to this sale.</p>
          </div>
        )}

        <footer className="pos-cart-foot">
          <div className="pos-sum-row"><span>Subtotal{itemCount > 0 && ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`}</span><strong>{money(subtotal)}</strong></div>
          <div className="pos-discount">
            <label><span>Discount</span>
              <span className="pos-discount-input"><b>৳</b><input type="number" min="0" max={subtotal} step="1" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} disabled={!cart.length} /></span>
            </label>
            <div className="pos-discount-quick">
              {QUICK_DISCOUNTS.map((pct) => (
                <button key={pct} type="button" disabled={!cart.length} className={cartDiscount && cartDiscount === Math.round((subtotal * pct) / 100) ? "active" : ""}
                  onClick={() => setDiscount(String(Math.round((subtotal * pct) / 100)))}>{pct}%</button>
              ))}
            </div>
          </div>
          {cartDiscount > 0 && <div className="pos-sum-row discount"><span>Discount</span><strong>−{money(cartDiscount)}</strong></div>}
          <div className="pos-sum-row total"><span>Total</span><strong>{money(payable)}</strong></div>
          <div className="pos-methods" role="radiogroup" aria-label="Payment method">
            {SALE_METHODS.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={method === m} className={method === m ? "active" : ""} onClick={() => setMethod(m)}>{m}</button>
            ))}
          </div>
          <div className="pos-actions">
            <button type="button" className="button pos-cart-clear" onClick={clear} disabled={!cart.length} aria-label="Clear cart" title="Clear cart"><Icon name="trash" />Clear</button>
            <button type="button" className="button button-primary pos-charge" onClick={checkout} disabled={!cart.length}>
              <Icon name="check" />Charge {money(payable)}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
