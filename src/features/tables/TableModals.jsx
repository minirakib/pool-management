import { clothFor } from "../../lib/theme.js";
import { useState } from "react";
import * as actions from "../../app/actions.js";
import { findTable, tableSession } from "../../app/actions.js";
import { useStore, useStoreApi } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import Icon from "../../components/Icon.jsx";
import { LiveAmount, Timer } from "../../components/Live.jsx";
import Modal, { CloseFooter, FormFooter, useFormAttempt } from "../../components/Modal.jsx";
import SnookerTable, { ClothPicker } from "../../components/SnookerTable.jsx";
import { AnalyticsStrip, Avatar, Field, ReadonlyField, Select, StatusPill } from "../../components/ui.jsx";
import { categories, clothColors, paymentMethods } from "../../lib/constants.js";
import { calculateTableCharge, customerName, sessionBreakdown } from "../../lib/domain.js";
import { money, shortDate, timeLabel, todayISO } from "../../lib/format.js";
import { useTableActions } from "./useTableActions.jsx";

const muted = { display: "block", color: "var(--color-text-muted)", fontSize: 12 };

/** Radio buttons styled as a segmented control; works with FormData through `name`. */
function ChoiceGroup({ name, options, value, onChange, label }) {
  return (
    <div className="choice-group" role="radiogroup" aria-label={label}>
      {options.map(([id, text, sub]) => (
        <label key={id} className={`choice${value === id ? " active" : ""}`}>
          <input type="radio" name={name} value={id} checked={value === id} onChange={() => onChange(id)} />
          <strong>{text}</strong>{sub && <small>{sub}</small>}
        </label>
      ))}
    </div>
  );
}

const MEMBER_LIMIT = 8;

/**
 * Built for speed: Walk-in is pre-selected and the Start button has focus, so opening the
 * popup and pressing Enter starts the game. Members are one click (or a quick search) away,
 * and a booking for this table today is offered as a one-click pick.
 */
export function StartSessionModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const table = findTable(state, tableId);
  const today = todayISO();
  const booking = state.bookings
    .filter((b) => b.tableId === tableId && b.date === today && ["Confirmed", "Pending"].includes(b.status) && b.customerId)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const [customerId, setCustomerId] = useState("guest");
  const [mode, setMode] = useState(state.settings.billingMode || "minute");
  const [query, setQuery] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const members = state.customers.filter((c) => c.id !== "cus-006");
  const q = query.trim().toLowerCase();
  const matches = members
    .filter((c) => !q || `${c.name} ${c.phone} ${c.membership}`.toLowerCase().includes(q) || c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~"))
    .sort((a, b) => b.sessions - a.sessions);
  const selected = members.find((c) => c.id === customerId);
  // Keep the chosen member visible even when the search hides them.
  const shown = [...(selected && !matches.slice(0, MEMBER_LIMIT).includes(selected) ? [selected] : []), ...matches].slice(0, MEMBER_LIMIT);
  const estimate = (minutes) => money(calculateTableCharge(table.rate, minutes * 60_000, mode, state.settings.minimumCharge));
  const bookedName = booking && members.find((c) => c.id === booking.customerId)?.name;

  return (
    <Modal xl className="start-modal" title={`Start game · ${table.name}`} subtitle="Walk-in is ready — press Enter to start, or pick a member." error={error}
      onSubmit={(values) => attempt(() => run(actions.startSession, tableId, values))}
      footer={
        <>
          <span className="footer-hint">{selected ? `${selected.name}` : "Walk-in guest"} · {mode === "hour" ? "per started hour" : "per minute"} · {money(table.rate)}/hr</span>
          <FormFooter label={<><Icon name="play" />Start game</>} autofocus />
        </>
      }>
      <div className="start-layout">
        <aside className="start-side" data-status="available">
          <SnookerTable cloth={clothFor(table, state.settings)} />
          <div className="start-facts">
            <div><span>Rate</span><strong>{money(table.rate)}<small>/hr</small></strong></div>
            <div><span>Starts</span><strong>{timeLabel(Date.now())}</strong></div>
          </div>
          <div className="field">
            <span>Billing</span>
            <ChoiceGroup name="billingMode" label="Billing mode" value={mode} onChange={setMode} options={[["minute", "Per minute", "Exact time"], ["hour", "Per hour", "Started hour"]]} />
          </div>
          <div className="estimate-row" aria-label="Estimated charge">
            {[[30, "30 min"], [60, "1 hour"], [120, "2 hours"]].map(([m, label]) => <div key={m}><span>{label}</span><strong>{estimate(m)}</strong></div>)}
          </div>
        </aside>

        <section className="start-main">
          {bookedName && (
            <button type="button" className={`booking-pick${customerId === booking.customerId ? " active" : ""}`} onClick={() => setCustomerId(booking.customerId)}>
              <Icon name="calendar" /><span><strong>Booked {booking.start} · {bookedName}</strong><small>{booking.duration}h · {booking.status} — tap to select</small></span>
            </button>
          )}
          <div className="customer-head">
            <span className="field-label">Who is playing?</span>
            <div className="search-box compact-search">
              <span className="search-icon"><Icon name="search" /></span>
              <input type="search" placeholder="Find member by name or phone" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search members" />
            </div>
          </div>
          <div className="customer-grid" role="radiogroup" aria-label="Customer">
            <label className={`customer-tile walk-in${customerId === "guest" ? " active" : ""}`}>
              <input type="radio" name="customerId" value="guest" checked={customerId === "guest"} onChange={() => setCustomerId("guest")} />
              <span className="tile-icon"><Icon name="user" /></span>
              <span className="tile-copy"><strong>Walk-in guest</strong><small>No member account</small></span>
            </label>
            {shown.map((c) => (
              <label key={c.id} className={`customer-tile${customerId === c.id ? " active" : ""}`}>
                <input type="radio" name="customerId" value={c.id} checked={customerId === c.id} onChange={() => setCustomerId(c.id)} />
                <Avatar name={c.name} />
                <span className="tile-copy"><strong>{c.name}</strong><small>{c.membership} · {c.sessions} visits</small></span>
                {c.balance > 0 && <span className="tile-due" title="Previous balance is added to the bill">Due {money(c.balance)}</span>}
              </label>
            ))}
          </div>
          {q && !matches.length && <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>No member matches “{query}”. Start as a walk-in and add the name below.</p>}
          {matches.length > MEMBER_LIMIT && <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Showing {MEMBER_LIMIT} of {matches.length} — search to narrow down.</p>}

          <div className="start-extra">
            {customerId === "guest" && (
              <label className="field">
                <span>Guest name <em>(optional)</em></span>
                <input name="guestName" placeholder="Walk-in guest" autoComplete="off" />
              </label>
            )}
            {selected?.balance > 0 && <p className="balance-note"><Icon name="alert" />{selected.name} has a previous balance of {money(selected.balance)}; it will be added to this bill.</p>}
            <button type="button" className="link-button" onClick={() => setShowNotes((v) => !v)} aria-expanded={showNotes}><Icon name={showNotes ? "x" : "plus"} />{showNotes ? "Hide note" : "Add a note"}</button>
            <label className="field" hidden={!showNotes}><span>Session note</span><textarea name="notes" rows="2" placeholder="e.g. tournament practice, paid deposit…" /></label>
          </div>
        </section>
      </div>
    </Modal>
  );
}

const RATE_PRESETS = [150, 200, 250, 300, 400, 500];

/** Add / edit a table, with a live preview card of how it will look on the floor. */
export function TableFormModal({ tableId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const table = findTable(state, tableId);
  const [name, setName] = useState(table?.name || `Table ${String(state.tables.length + 1).padStart(2, "0")}`);
  const [category, setCategory] = useState(table?.category || "Standard");
  const [rate, setRate] = useState(String(table?.rate ?? state.settings.defaultRate));
  const [status, setStatus] = useState(table?.status === "maintenance" ? "maintenance" : "available");
  const [cloth, setCloth] = useState(clothFor(table, state.settings));
  const number = (name.match(/\d+/)?.[0] || name.slice(0, 2) || "–").padStart(2, "0");

  return (
    <Modal xl className="table-form-modal" title={table ? `Edit ${table.name}` : "Add a table"} subtitle={table ? "Changes apply to new sessions straight away." : "Name it, set the price and pick a board colour."} error={error}
      onSubmit={(values) => attempt(() => run(actions.saveTable, tableId, values))} footer={<FormFooter label={<><Icon name="check" />{table ? "Save table" : "Add table"}</>} />}>
      <div className="table-form-layout">
        <aside className="table-form-preview">
          <span className="field-label">Preview</span>
          <article className="snooker-card preview-card" data-status={status}>
            <div className="snooker-card-top">
              <span className="table-number">{number}</span>
              <div className="snooker-head"><div className="snooker-title">{name || "Untitled"}</div><div className="snooker-meta">{category} · {money(Number(rate) || 0)}/hour</div></div>
              <StatusPill status={status} />
            </div>
            <SnookerTable cloth={cloth} />
          </article>
          <ClothPicker value={cloth} preview={false} compact onChange={setCloth} />
        </aside>

        <section className="table-form-fields">
          <label className="field">
            <span>Table name</span>
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} />
          </label>
          <div className="field">
            <span>Category</span>
            <ChoiceGroup name="category" label="Category" value={category} onChange={setCategory} options={categories.map((c) => [c, c])} />
          </div>
          <div className="field">
            <span>Hourly rate (BDT)</span>
            <div className="rate-input">
              <b>৳</b>
              <input name="rate" type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)} required />
              <small>per hour</small>
            </div>
            <div className="rate-presets">
              {RATE_PRESETS.map((r) => <button key={r} type="button" className={`filter-pill${Number(rate) === r ? " active" : ""}`} onClick={() => setRate(String(r))}>{r}</button>)}
            </div>
          </div>
          <div className="field">
            <span>Status</span>
            <ChoiceGroup name="status" label="Status" value={status} onChange={setStatus} options={[["available", "Available", "Ready for play"], ["maintenance", "Maintenance", "Out of service"]]} />
          </div>
          <label className="field">
            <span>Notes <em>(optional)</em></span>
            <textarea name="notes" rows="3" defaultValue={table?.notes || ""} placeholder="e.g. new cushions fitted, near the window…" />
          </label>
        </section>
      </div>
    </Modal>
  );
}

export function TableDetailsModal({ tableId }) {
  const state = useStore();
  const act = useTableActions();
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  if (!table) return null;
  const name = session && customerName(state, session);
  const previousBalance = session ? state.customers.find((c) => c.id === session.customerId)?.balance || 0 : 0;
  const today = todayISO();
  const todays = state.transactions.filter((t) => t.tableId === table.id && t.date.slice(0, 10) === today);
  const upcoming = state.bookings
    .filter((b) => b.tableId === table.id && b.date >= today && ["Confirmed", "Pending"].includes(b.status))
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)).slice(0, 3);
  const cloth = clothColors.find((c) => c.id === clothFor(table, state.settings));

  const statusControls = {
    available: <button className="button button-primary" onClick={() => act.start(table.id)}><Icon name="play" />Start game</button>,
    maintenance: <button className="button" onClick={() => act.release(table.id)}><Icon name="check" />Set available</button>,
    paused: <button className="button button-primary" onClick={() => act.resume(table.id)}><Icon name="play" />Resume</button>,
    occupied: <><button className="button" onClick={() => act.pause(table.id)}><Icon name="pause" />Pause</button><button className="button button-danger" onClick={() => act.end(table.id)}><Icon name="stop" />End game</button></>
  }[table.status];

  return (
    <Modal title={table.name} subtitle={`${table.category} · ${money(table.rate)}/hour`} wide
      footer={
        <CloseFooter>
          {session
            ? <><button className="button" onClick={() => act.switchTable(table.id)}><Icon name="swap" />Switch</button><button className="button" onClick={() => act.addProduct(table.id)}><Icon name="plus" />Products</button></>
            : <button className="button" onClick={() => act.edit(table.id)}><Icon name="edit" />Edit</button>}
          {statusControls}
        </CloseFooter>
      }>
      <div className="table-detail-hero" data-status={table.status}>
        <SnookerTable cloth={clothFor(table, state.settings)} />
        <div className="table-detail-facts">
          <StatusPill status={table.status} />
          <div className="detail-fact"><span>Rate</span><strong>{money(table.rate)}<small>/hr</small></strong></div>
          <div className="detail-fact"><span>Category</span><strong>{table.category}</strong></div>
          <div className="detail-fact"><span>Board</span><strong>{cloth?.name || "Classic green"}</strong></div>
          {table.notes && <p className="muted detail-note">{table.notes}</p>}
        </div>
      </div>

      {session ? (
        <section className="detail-section">
          <div className="profile-hero">
            <Avatar name={name} />
            <div><strong>{name}</strong><span style={muted}>Started {timeLabel(session.originalStartedAt || session.startedAt)} · {session.billingMode === "hour" ? "Started hour" : "Per minute"}</span></div>
            <div className="detail-live"><Timer session={session} /><strong><LiveAmount session={session} table={table} previousBalance={previousBalance} /></strong></div>
          </div>
          <div className="breakdown-list">
            <div className="breakdown-row"><span>Table charge</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
            {session.products.map((item) => (
              <div key={item.productId} className="breakdown-row"><span>{item.name} × {item.qty}</span><strong>{money(item.qty * item.price)}</strong></div>
            ))}
            {previousBalance > 0 && <div className="breakdown-row"><span>Previous balance</span><strong>{money(previousBalance)}</strong></div>}
            <div className="breakdown-row total"><span>Live total</span><strong><LiveAmount session={session} table={table} previousBalance={previousBalance} /></strong></div>
          </div>
          {session.notes && <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>Notes: {session.notes}</p>}
        </section>
      ) : (
        <p className="muted detail-empty">{table.status === "maintenance" ? "Out of play for service." : "No active session — ready for a frame."}</p>
      )}

      <div className="detail-columns">
        <section>
          <h3 className="detail-heading">Today</h3>
          <div className="detail-mini-grid">
            <div><span>Sessions closed</span><strong>{todays.length}</strong></div>
            <div><span>Revenue</span><strong>{money(todays.reduce((sum, t) => sum + (t.revenueAmount ?? t.amount), 0))}</strong></div>
          </div>
        </section>
        <section>
          <h3 className="detail-heading">Upcoming bookings</h3>
          {upcoming.length ? upcoming.map((b) => (
            <div key={b.id} className="detail-booking">
              <span className="detail-booking-time">{b.start}</span>
              <div><strong>{state.customers.find((c) => c.id === b.customerId)?.name || "Guest"}</strong><span>{b.date === today ? "Today" : shortDate(b.date)} · {b.duration}h</span></div>
              <StatusPill status={b.status} />
            </div>
          )) : <p className="muted" style={{ fontSize: 13, margin: 0 }}>No upcoming bookings.</p>}
        </section>
      </div>
    </Modal>
  );
}

export function SessionDetailsModal({ tableId }) {
  const state = useStore();
  const act = useTableActions();
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  if (!session) return null;
  const previousBalance = state.customers.find((c) => c.id === session.customerId)?.balance || 0;
  const name = customerName(state, session);
  const bill = sessionBreakdown(session, table, state.settings, Date.now(), 0, previousBalance);

  return (
    <Modal title={`${table.name} · Live bill`} subtitle="Session detail · billable time excludes any paused periods." wide
      footer={
        <>
          <button className="button" onClick={() => act.switchTable(table.id)}>Switch table</button>
          <button className="button" onClick={() => act.addProduct(table.id)}><Icon name="plus" />Add product</button>
          {table.status === "paused"
            ? <button className="button button-primary" onClick={() => act.resume(table.id)}>Resume</button>
            : <button className="button" onClick={() => act.pause(table.id)}>Pause</button>}
          <button className="button button-danger" onClick={() => act.end(table.id)}>End game</button>
        </>
      }>
      <div className="profile-hero" style={{ marginBottom: 13 }}>
        <Avatar name={name} />
        <div><strong>{name}</strong><span style={muted}>{table.category} table · {money(table.rate)}/hour</span></div>
        <StatusPill status={table.status} />
      </div>
      <AnalyticsStrip items={[
        ["Started", timeLabel(session.originalStartedAt || session.startedAt)],
        ["Billable duration", <Timer session={session} className="" />],
        ["Billing mode", session.billingMode === "hour" ? "Started hour" : "Per minute"],
        ["Live total", <LiveAmount session={session} table={table} previousBalance={previousBalance} />]
      ]} />
      <div className="breakdown-list">
        <div className="breakdown-row"><span>Table charge</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
        <div className="breakdown-row"><span>Product charges</span><strong>{money(bill.products)}</strong></div>
        <div className="breakdown-row total"><span>Estimated total</span><strong><LiveAmount session={session} table={table} previousBalance={previousBalance} /></strong></div>
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: 13 }}>{session.notes ? `Notes: ${session.notes}` : "No session notes."}</p>
    </Modal>
  );
}

export function EndSessionModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { closeModal, printReceipt } = useUi();
  const { error, attempt } = useFormAttempt();
  const [discount, setDiscount] = useState("0");
  const table = findTable(state, tableId);
  const session = tableSession(state, table);
  if (!session) return null;

  const previousBalance = state.customers.find((c) => c.id === session.customerId)?.balance || 0;
  const name = customerName(state, session);
  const started = session.originalStartedAt || session.startedAt;

  const printCurrent = () => {
    const now = Date.now();
    const current = sessionBreakdown(session, table, state.settings, now, 0, previousBalance);
    printReceipt({ tableName: table.name, category: table.category, customer: name, startedAt: started, endedAt: now, duration: current.elapsed, rate: table.rate, tableCharge: current.tableCharge, products: session.products, previousBalance, total: current.total, method: "Pending" });
  };

  const confirm = (values) => attempt(() => {
    const { bill: paid, method } = run(actions.closeSession, tableId, values);
    return `${money(paid.total)} recorded via ${method}. Receipt is ready to print.`;
  });

  return (
    <Modal title={`Close session · ${table.name}`} subtitle="Review the bill and record a demo payment." wide error={error} onSubmit={confirm}
      footer={
        <>
          <button className="button" type="button" onClick={closeModal}>Cancel</button>
          <button className="button" type="button" onClick={printCurrent}><Icon name="printer" />Print receipt</button>
          <button className="button button-primary" type="submit">Confirm payment</button>
        </>
      }>
      <div className="profile-hero" style={{ marginBottom: 14 }}>
        <Avatar name={name} />
        <div><strong>{table.name} · {name}</strong><span style={muted}>{table.category} · {money(table.rate)}/hour</span></div>
        <StatusPill status={table.status} />
      </div>
      <AnalyticsStrip items={[
        ["Started", timeLabel(started)],
        ["Ended", timeLabel(Date.now())],
        ["Billable time", <Timer session={session} className="" />],
        ["Hourly rate", money(table.rate)]
      ]} />
      <div className="breakdown-list">
        <div className="breakdown-row"><span>Table charges</span><strong><LiveAmount session={session} table={table} field="tableCharge" /></strong></div>
        {session.products.length
          ? session.products.map((item) => <div key={item.productId} className="breakdown-row"><span>{item.name} × {item.qty}</span><strong>{money(item.price * item.qty)}</strong></div>)
          : <div className="breakdown-row"><span>Added products</span><strong>{money(0)}</strong></div>}
        {previousBalance > 0 && <div className="breakdown-row"><span>Previous balance</span><strong>{money(previousBalance)}</strong></div>}
        <label className="field" style={{ gridTemplateColumns: "1fr 130px", alignItems: "center" }}>
          <span>Discount (BDT)</span>
          <input name="discount" type="number" min="0" step="1" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
        <div className="breakdown-row total"><span>Final total</span><strong><LiveAmount session={session} table={table} discount={discount} previousBalance={previousBalance} /></strong></div>
        <label className="field"><span>Payment method</span><Select name="paymentMethod" options={paymentMethods} defaultValue="Cash" /></label>
      </div>
    </Modal>
  );
}

export function SwitchSessionModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const source = findTable(state, tableId);
  const targets = state.tables.filter((t) => t.id !== source.id && t.status === "available");

  return (
    <Modal title="Switch session table" subtitle={`Move the current session from ${source.name}. Only available tables can be selected.`} error={error}
      onSubmit={(values) => attempt(() => run(actions.switchSession, tableId, values.targetId))} footer={<FormFooter label="Move session" />}>
      <div className="form-grid">
        <ReadonlyField label="Current table" value={`${source.name} · ${money(source.rate)}/hr`} />
        <label className="field"><span>Move to</span><Select name="targetId" required options={targets.map((t) => [t.id, `${t.name} · ${t.category} · ${money(t.rate)}/hr`])} /></label>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Elapsed session time and product charges move with the customer. The new table rate is used from now onward.</p>
    </Modal>
  );
}

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

