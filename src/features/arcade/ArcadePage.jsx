import { useState } from "react";
import { saveArcadeSettings, sellArcadeCoins, updateArcadeStock } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { EmptyState, PageHeading, Segmented } from "@/components/ui";
import { paymentMethods } from "@/lib/constants.js";
import { csvDownload } from "@/lib/download.js";
import { money, shortDate, timeLabel, toISODate, todayISO } from "@/lib/format.js";
import "./arcade.css";

const QUICK_COINS = [5, 10, 20, 30, 50];
const SALE_METHODS = paymentMethods.filter((m) => m !== "Customer Credit");
const LOW_STOCK = 10;
const dayOf = (t) => toISODate(new Date(t.date));
const totalsOf = (list) => ({ coins: list.reduce((s, t) => s + (t.coins || 0), 0), amount: list.reduce((s, t) => s + t.amount, 0), count: list.length });

/** Sell coins: quantity × coin price, with the calculation and remaining stock shown live. */
function SellPanel({ stock, price }) {
  const { run } = useStoreApi();
  const { notify } = useUi();
  const [coins, setCoins] = useState("");
  const [method, setMethod] = useState("Cash");
  const [customer, setCustomer] = useState("");
  const qty = Math.max(0, Math.floor(Number(coins) || 0));
  const over = qty > stock;
  const step = (d) => setCoins(String(Math.min(stock, Math.max(0, qty + d)) || ""));

  const sell = (e) => {
    e.preventDefault();
    try {
      const sale = run(sellArcadeCoins, { coins: qty, method, customer });
      notify(`${sale.coins} coins sold · ${money(sale.amount)} via ${sale.method}.`, "success", "Coins sold");
      setCoins("");
      setCustomer("");
    } catch (error) {
      notify(error.message, "warning");
    }
  };

  return (
    <form className="panel arcade-sell" onSubmit={sell}>
      <div className="panel-heading"><div><h2>Sell coins</h2><p>{money(price)} per coin</p></div></div>
      <div className="arcade-qty">
        <button type="button" onClick={() => step(-1)} aria-label="One coin less"><Icon name="minus" /></button>
        <label>
          <input type="number" min="1" max={stock} step="1" inputMode="numeric" placeholder="0" value={coins} onChange={(e) => setCoins(e.target.value)} aria-label="Coins to sell" autoFocus />
          <span>coins</span>
        </label>
        <button type="button" onClick={() => step(1)} aria-label="One coin more"><Icon name="plus" /></button>
      </div>
      <div className="arcade-quick">
        {QUICK_COINS.map((n) => <button key={n} type="button" className={qty === n ? "active" : ""} disabled={n > stock} onClick={() => setCoins(String(n))}>{n}</button>)}
      </div>

      <div className={`arcade-calc${over ? " over" : ""}`}>
        <div className="arcade-calc-line"><span>{qty || 0} coins × {money(price)}</span><strong>{money(qty * price)}</strong></div>
        <div className="arcade-calc-stock">
          <span>Stock</span>
          <b>{stock}</b><Icon name="arrow-right" /><b>{over ? "—" : stock - qty}</b>
          {over && <em>Only {stock} coins left</em>}
        </div>
      </div>

      <label className="field"><span>Customer <em>(optional)</em></span><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" autoComplete="off" /></label>
      <div className="arcade-methods" role="radiogroup" aria-label="Payment method">
        {SALE_METHODS.map((m) => <button key={m} type="button" role="radio" aria-checked={method === m} className={method === m ? "active" : ""} onClick={() => setMethod(m)}>{m}</button>)}
      </div>
      <button type="submit" className="button button-primary arcade-sell-button" disabled={!qty || over}>
        <Icon name="coin" />Sell {qty || ""} coin{qty === 1 ? "" : "s"} · {money(qty * price)}
      </button>
    </form>
  );
}

/** Coin stock: set the total or add new coins; every change is logged. */
function StockPanel({ stock, log }) {
  const { perform, isAdmin } = useUi();
  const [mode, setMode] = useState("add");
  const [coins, setCoins] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (perform(updateArcadeStock, mode, coins)) setCoins("");
  };
  return (
    <article className="panel arcade-stock">
      <div className="panel-heading"><div><h2>Coin stock</h2><p>Coins available to sell</p></div></div>
      <div className={`arcade-stock-big${stock <= LOW_STOCK ? " low" : ""}`}>
        <span className="arcade-coin-mark"><Icon name="coin" /></span>
        <div><strong>{stock}</strong><span>{stock <= LOW_STOCK ? "Low — add coins" : "coins in stock"}</span></div>
      </div>
      <form className="arcade-stock-form" onSubmit={submit}>
        <Segmented label="Stock change" value={mode} onChange={setMode} options={[{ id: "add", label: "Add coins" }, ...(isAdmin ? [{ id: "set", label: "Set total" }] : [])]} />
        <div className="arcade-stock-input">
          <input type="number" min={mode === "add" ? 1 : 0} step="1" required placeholder={mode === "add" ? "Coins to add" : "New total"} value={coins} onChange={(e) => setCoins(e.target.value)} aria-label={mode === "add" ? "Coins to add" : "New total coins"} />
          <button className="button button-primary" type="submit"><Icon name="check" />{mode === "add" ? "Add" : "Set"}</button>
        </div>
        {coins !== "" && Number(coins) >= 0 && <p className="muted arcade-preview">Stock {stock} → {mode === "add" ? stock + Number(coins) : Number(coins)}</p>}
      </form>
      <h3 className="detail-heading">Stock history</h3>
      {log.length ? (
        <ul className="arcade-log">
          {[...log].reverse().slice(0, 6).map((entry) => (
            <li key={entry.id}>
              <span className={`arcade-log-mark ${entry.mode}`}>{entry.mode === "add" ? `+${entry.coins}` : "="}</span>
              <div><strong>{entry.mode === "add" ? `${entry.coins} coins added` : `Total set to ${entry.coins}`}</strong><span>{shortDate(entry.date.slice(0, 10))} · {timeLabel(entry.date)}{entry.note ? ` · ${entry.note}` : ""}</span></div>
              <b>{entry.before} → {entry.after}</b>
            </li>
          ))}
        </ul>
      ) : <p className="muted" style={{ fontSize: 13, margin: 0 }}>No stock changes yet.</p>}
    </article>
  );
}

export default function ArcadePage() {
  const state = useStore();
  const { notify, perform, isAdmin } = useUi();
  const { stock, log } = state.arcade;
  const price = Number(state.settings.arcadeCoinPrice) || 0;
  const [day, setDay] = useState(todayISO());
  const [tab, setTab] = useState("sell"); // "sell" (coins + stock) | "reports" (daily + total)

  const sales = state.transactions.filter((t) => t.type === "arcade").sort((a, b) => b.date.localeCompare(a.date));
  const daySales = sales.filter((t) => dayOf(t) === day);
  const dayTotals = totalsOf(daySales);
  const allTotals = totalsOf(sales);
  const todayTotals = totalsOf(sales.filter((t) => dayOf(t) === todayISO()));
  const byDay = [...sales.reduce((map, t) => map.set(dayOf(t), [...(map.get(dayOf(t)) || []), t]), new Map())]
    .map(([date, list]) => ({ date, ...totalsOf(list) })).sort((a, b) => b.date.localeCompare(a.date));

  const savePrice = (e) => {
    e.preventDefault();
    perform(saveArcadeSettings, { arcadeCoinPrice: new FormData(e.currentTarget).get("arcadeCoinPrice") });
  };
  const exportCsv = () => {
    const filename = `cuecore-arcade-${todayISO()}.csv`;
    csvDownload(filename, [
      ["Arcade coin report"], ["Coin price BDT", price], ["Coins in stock", stock], [],
      ["All time", "Coins sold", allTotals.coins, "Sales", allTotals.count, "Amount BDT", allTotals.amount], [],
      ["Date", "Sales", "Coins sold", "Amount BDT"], ...byDay.map((d) => [d.date, d.count, d.coins, d.amount]), [],
      ["Sales"], ["Date", "Time", "Customer", "Coins", "Coin price BDT", "Amount BDT", "Method"],
      ...sales.map((t) => [dayOf(t), timeLabel(t.date), t.customer, t.coins, t.coinPrice, t.amount, t.method])
    ]);
    notify(`${filename} downloaded.`, "success", "Export ready");
  };

  return (
    <>
      <PageHeading title="Arcade" stats={[
        { label: "In stock", value: `${stock} coins`, tone: stock <= LOW_STOCK ? "warning" : "success" },
        { label: "Coin price", value: money(price), tone: "info" },
        { label: "Today", value: `${todayTotals.coins} · ${money(todayTotals.amount)}`, tone: "gold", title: "Coins sold and amount today" },
        { label: "All time", value: `${allTotals.coins} · ${money(allTotals.amount)}`, tone: "primary", title: "Coins sold and amount, all time" }
      ]}>
        {isAdmin && <form className="arcade-price-form" onSubmit={savePrice} key={price}>
          <label><span>Coin price ৳</span><input name="arcadeCoinPrice" type="number" min="0" step="1" defaultValue={price} required aria-label="Coin price" /></label>
          <button className="button button-sm" type="submit">Save</button>
        </form>}
        <button className="button button-sm" onClick={exportCsv}><Icon name="download" /><span className="btn-label">CSV</span></button>
      </PageHeading>

      <div className="toolbar arcade-tabs">
        <Segmented label="Arcade section" value={tab} onChange={setTab} options={[{ id: "sell", label: "Sell coins", icon: "coin" }, { id: "reports", label: "Reports", icon: "chart" }]} />
      </div>

      {tab === "sell" && <div className="arcade-layout">
        <SellPanel stock={stock} price={price} />
        <StockPanel stock={stock} log={log} />
      </div>}

      {tab === "reports" && <div className="two-col">
        <article className="panel">
          <div className="panel-heading">
            <div><h2>Daily report</h2><p>{shortDate(day)}</p></div>
            <input type="date" value={day} max={todayISO()} onChange={(e) => setDay(e.target.value || todayISO())} aria-label="Report date" />
          </div>
          <div className="report-kpis">
            <div><span>Coins sold</span><strong>{dayTotals.coins}</strong></div>
            <div><span>Sales</span><strong>{dayTotals.count}</strong></div>
            <div><span>Amount</span><strong className="text-gold">{money(dayTotals.amount)}</strong></div>
          </div>
          {daySales.length ? daySales.map((t) => (
            <div key={t.id} className="settings-row">
              <div><strong>{t.coins} coins × {money(t.coinPrice)}</strong><span>{timeLabel(t.date)} · {t.customer} · {t.method}</span></div>
              <strong>{money(t.amount)}</strong>
            </div>
          )) : <EmptyState title="No coin sales" description="Coins sold on this day appear here." />}
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Total report</h2><p>All coin sales by day</p></div></div>
          <div className="report-kpis">
            <div><span>Coins sold</span><strong>{allTotals.coins}</strong></div>
            <div><span>Sales</span><strong>{allTotals.count}</strong></div>
            <div><span>Amount</span><strong className="text-gold">{money(allTotals.amount)}</strong></div>
          </div>
          {byDay.length ? (
            <div className="data-table-wrap">
              <table className="data-table arcade-days">
                <thead><tr><th>Date</th><th>Sales</th><th>Coins</th><th>Amount</th></tr></thead>
                <tbody>
                  {byDay.slice(0, 14).map((d) => (
                    <tr key={d.date} className={d.date === day ? "is-selected" : ""} onClick={() => setDay(d.date)}>
                      <td className="table-primary">{shortDate(d.date)}</td><td>{d.count}</td><td>{d.coins}</td><td className="table-primary">{money(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No coin sales yet" description="Sell coins to start the report." />}
        </article>
      </div>}
    </>
  );
}
