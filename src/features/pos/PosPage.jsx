import { useState } from "react";
import { completeSale } from "../../app/actions.js";
import { useStore, useStoreApi } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import { LiveAmount, Timer } from "../../components/Live.jsx";
import { EmptyState, PageHeading, SearchBox, Select, StatusPill } from "../../components/ui.jsx";
import { paymentMethods, productCategories } from "../../lib/constants.js";
import { customerName, sessionBreakdown } from "../../lib/domain.js";
import { useNow } from "../../hooks/useNow.js";
import { money, shortDate, timeLabel, todayISO } from "../../lib/format.js";
import { useTableActions } from "../tables/useTableActions.jsx";

const PRODUCT_ICON = { Water: "droplet", "Tea & Coffee": "cup", Accessories: "cue", Snacks: "cookie" };

/** Sum of every open table bill; ticks every second. */
function LiveTotal({ sessions }) {
  const { settings } = useStore();
  const now = useNow();
  return money(sessions.reduce((sum, { session, table }) => sum + sessionBreakdown(session, table, settings, now).total, 0));
}

function LiveBillCard({ session, table }) {
  const state = useStore();
  const act = useTableActions();
  const bill = sessionBreakdown(session, table, state.settings);
  return (
    <article className="panel live-bill-card" data-status={table.status}>
      <div className="panel-heading">
        <div><h3>{table.name} <span className="muted">· {table.category}</span></h3><p>{customerName(state, session)} · <Timer session={session} /></p></div>
        <StatusPill status={table.status} />
      </div>
      <div className="bill-current">
        <div><span>Table charge</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
        <div><span>Products · {session.products.reduce((n, i) => n + i.qty, 0)} items</span><strong>{money(bill.products)}</strong></div>
        <div><span>Current total</span><strong><LiveAmount session={session} table={table} /></strong></div>
      </div>
      <div className="snooker-actions">
        <button className="button button-sm" onClick={() => act.sessionDetails(table.id)}>View bill</button>
        <button className="button button-sm" onClick={() => act.addProduct(table.id)}><Icon name="plus" />Add product</button>
        <button className="button button-primary button-sm" onClick={() => act.end(table.id)}>Close session</button>
      </div>
    </article>
  );
}

export default function PosPage() {
  const state = useStore();
  const { run } = useStoreApi();
  const { setPage, notify, printReceipt, search, setSearch, cart, setCart } = useUi();
  const act = useTableActions();
  const [category, setCategory] = useState("All");
  const [discount, setDiscount] = useState("0");
  const [method, setMethod] = useState("Cash");

  const products = state.products.filter((p) => (category === "All" || p.category === category) && `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase()));
  const cartTotal = cart.reduce((sum, l) => sum + l.price * l.qty, 0);
  const cartDiscount = Math.min(cartTotal, Math.max(0, Number(discount) || 0));
  const payable = Math.max(0, Math.round(cartTotal - cartDiscount));
  const activeSessions = state.sessions.map((session) => ({ session, table: state.tables.find((t) => t.id === session.tableId) })).filter((e) => e.table);
  const todaySales = state.transactions.filter((t) => t.date.slice(0, 10) === todayISO()).reduce((sum, t) => sum + (t.revenueAmount ?? t.amount), 0);
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  const addToCart = (product) => {
    const line = cart.find((l) => l.productId === product.id);
    if (product.stock <= (line?.qty || 0)) return notify("Not enough stock for this quantity.", "warning");
    setCart(line ? cart.map((l) => (l === line ? { ...l, qty: l.qty + 1 } : l)) : [...cart, { productId: product.id, name: product.name, price: product.price, qty: 1 }]);
  };
  const changeQty = (line, step) => {
    const product = state.products.find((p) => p.id === line.productId);
    const next = line.qty + step;
    if (next <= 0) setCart(cart.filter((l) => l !== line));
    else if (next <= (product?.stock ?? 0)) setCart(cart.map((l) => (l === line ? { ...l, qty: next } : l)));
    else notify("Not enough stock for this quantity.", "warning");
  };
  const checkout = () => {
    try {
      const { amount } = run(completeSale, cart, cartDiscount, method);
      setCart([]);
      setDiscount("0");
      notify(`${money(amount)} sale recorded via ${method}.`);
    } catch (error) {
      notify(error.message, error.message.includes("stock") ? "error" : "warning");
    }
  };
  const printSaved = (t) => printReceipt(t.receipt || { tableName: t.description, customer: t.customer, endedAt: t.date, tableCharge: 0, products: [], previousBalance: 0, total: t.amount, method: t.method });

  return (
    <>
      <PageHeading title="POS" stats={[
        { label: "Live bills", value: activeSessions.length, tone: "success" },
        { label: "Open total", value: <LiveTotal sessions={activeSessions} />, tone: "gold", title: "Running total of all open table bills" },
        { label: "Sales today", value: money(todaySales), tone: "primary" },
        { label: "Cart", value: cart.reduce((n, l) => n + l.qty, 0), tone: cart.length ? "info" : "muted" }
      ]}>
        <button className="button button-sm" onClick={() => setPage("inventory")}><Icon name="box" /><span className="btn-label">Products</span></button>
      </PageHeading>
      <div className="section-heading compact"><div className="eyebrow">Live table bills</div></div>
      {activeSessions.length
        ? <div className="table-grid">{activeSessions.map(({ session, table }) => <LiveBillCard key={session.id} session={session} table={table} />)}</div>
        : <article className="panel"><EmptyState title="No active table sessions" description="Start a game to track table time and products."><button className="button button-primary" onClick={act.quickStart}>Start a table</button></EmptyState></article>}

      <div className="section-heading compact"><div className="eyebrow">Counter sale</div></div>
      <div className="pos-layout">
        <section>
          <SearchBox className="page-search" placeholder="Search products…" value={search} onChange={setSearch} />
          <div className="category-bar">
            {["All", ...productCategories].map((c) => <button key={c} className={`filter-pill${category === c ? " active" : ""}`} onClick={() => setCategory(c)}>{c}</button>)}
          </div>
          {products.length ? (
            <div className="product-grid">
              {products.map((p) => (
                <article key={p.id} className="product-card">
                  <span className="product-glyph"><Icon name={PRODUCT_ICON[p.category] || "bottle"} /></span>
                  <strong>{p.name}</strong>
                  <span>{p.category} · {p.stock} in stock</span>
                  <div className="product-foot"><b>{money(p.price)}</b><button className="button button-sm button-primary" onClick={() => addToCart(p)} disabled={p.stock <= 0}><Icon name="plus" />Add</button></div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="No products found" description="Search a different name or category." />}
        </section>
        <aside className="panel cart-panel">
          <div className="panel-heading"><div><h2>Sale cart</h2><p>{cart.reduce((s, l) => s + l.qty, 0)} items</p></div><button className="panel-link" onClick={() => setCart([])}>Clear</button></div>
          {cart.length ? cart.map((line) => (
            <div key={line.productId} className="cart-line">
              <div className="cart-line-copy"><strong>{line.name}</strong><span>{money(line.price)} each</span></div>
              <div className="qty-control">
                <button onClick={() => changeQty(line, -1)} aria-label="Decrease quantity">−</button>
                <span>{line.qty}</span>
                <button onClick={() => changeQty(line, 1)} aria-label="Increase quantity">+</button>
              </div>
            </div>
          )) : <EmptyState title="Cart is empty" description="Add items to create a counter sale." />}
          {cart.length > 0 && (
            <div className="cart-totals">
              <div className="cart-total-row"><span>Subtotal</span><strong>{money(cartTotal)}</strong></div>
              <label className="field"><span>Discount (BDT)</span><input type="number" min="0" max={cartTotal} step="1" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
              <div className="cart-total-row"><span>Discount</span><strong>−{money(cartDiscount)}</strong></div>
              <div className="cart-total-row final"><span>Total</span><strong>{money(payable)}</strong></div>
              <label className="field"><span>Payment method</span><Select value={method} onChange={(e) => setMethod(e.target.value)} options={paymentMethods} /></label>
              <button className="button button-primary" style={{ width: "100%" }} onClick={checkout}>Complete sale · <span>{money(payable)}</span></button>
            </div>
          )}
        </aside>
      </div>

      <article className="panel" style={{ marginTop: 16 }}>
        <div className="panel-heading">
          <div><h2>Recent transactions</h2><p>Saved local payments and counter sales</p></div>
          <button className="panel-link" onClick={() => setPage("reports")}>Open reports <Icon name="arrow-right" /></button>
        </div>
        {recent.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Transaction</th><th>Customer</th><th>Time</th><th>Payment</th><th>Amount</th><th></th></tr></thead>
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td><span className="table-primary">{t.description}</span><span className="table-sub">{t.type === "session" ? "Table session" : "Product sale"}</span></td>
                    <td>{t.customer}</td>
                    <td>{shortDate(t.date.slice(0, 10))} · {timeLabel(t.date)}</td>
                    <td>{t.method}</td>
                    <td className="table-primary">{money(t.amount)}</td>
                    <td><button className="button button-sm" onClick={() => printSaved(t)}><Icon name="printer" />Print receipt</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState title="No transactions yet" description="Completed sessions and sales will be listed here." />}
      </article>
    </>
  );
}
