import { useState } from "react";
import * as actions from "@/app/actions";
import { findTable } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Icon from "@/components/Icon.jsx";
import Modal, { FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import SnookerTable from "@/components/snooker/SnookerTable.jsx";
import { Avatar, ChoiceGroup } from "@/components/ui";
import { hourTypes } from "@/lib/constants.js";
import { billingLabel, calculateTableCharge, gameMinutesOf, hourTypeLabel, rateFor } from "@/lib/domain.js";
import { money, timeLabel, todayISO } from "@/lib/format.js";
import { clothFor } from "@/lib/theme.js";
import { muted } from "./shared.jsx";

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

  const [mode, setMode] = useState(state.settings.billingMode || "minute");
  const [hourType, setHourType] = useState("ac");
  const rate = rateFor(table, hourType);
  const [query, setQuery] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [picked, setPicked] = useState([]);
  const [names, setNames] = useState([]);
  const [custom, setCustom] = useState("");
  const customerId = picked[0] || "guest";
  const count = picked.length + names.length;

  const members = state.customers.filter((c) => c.id !== "cus-006");
  const q = query.trim().toLowerCase();
  const matches = members
    .filter((c) => !q || `${c.name} ${c.phone} ${c.membership}`.toLowerCase().includes(q) || c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~"))
    .sort((a, b) => b.sessions - a.sessions);
  const selected = members.find((c) => c.id === customerId);
  const shownSet = picked.map((id) => members.find((c) => c.id === id)).filter(Boolean);
  // Keep the chosen member visible even when the search hides them.
  const shown = [...shownSet.filter((c) => !matches.slice(0, MEMBER_LIMIT).includes(c)), ...matches].slice(0, Math.max(MEMBER_LIMIT, shownSet.length));
  const gameMinutes = gameMinutesOf(null, state.settings);
  const estimate = (minutes) => money(calculateTableCharge(rate, minutes * 60_000, mode, state.settings.minimumCharge, gameMinutes));
  const togglePicked = (id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const addName = () => {
    const n = custom.trim();
    if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) setNames([...names, n]);
    setCustom("");
  };
  const bookedName = booking && members.find((c) => c.id === booking.customerId)?.name;

  return (
    <Modal xl className="start-modal" title={`Start game · ${table.name}`} subtitle="Walk-in is ready — press Enter to start, or pick a member." error={error}
      onSubmit={(values) => attempt(() => run(actions.startSession, tableId, values))}
      footer={
        <>
          <span className="footer-hint">{selected ? `${selected.name}` : "Walk-in guest"} · {hourTypeLabel(hourType)} · {billingLabel(mode, gameMinutes).toLowerCase()} · {money(rate)}/hr</span>
          <FormFooter label={<><Icon name="play" />Start game</>} autofocus />
        </>
      }>
      <div className="start-layout">
        <aside className="start-side" data-status="available">
          <SnookerTable cloth={clothFor(table, state.settings)} />
          <div className="start-facts">
            <div><span>{hourTypeLabel(hourType)} rate</span><strong>{money(rate)}<small>/hr</small></strong></div>
            <div><span>Starts</span><strong>{timeLabel(Date.now())}</strong></div>
          </div>
          <div className="field">
            <span>Hour type</span>
            <ChoiceGroup name="hourType" label="Hour type" value={hourType} onChange={setHourType} options={hourTypes.map(([id, text]) => [id, text, `${money(rateFor(table, id))}/hr`])} />
          </div>
          <div className="field">
            <span>Billing</span>
            <ChoiceGroup name="billingMode" label="Billing mode" value={mode} onChange={setMode} options={[["minute", "Per minute", "Exact time"], ["hour", "Per hour", "Started hour"], ["game", "Single game", `${gameMinutes} min + extra`]]} />
          </div>
          <div className="estimate-row" aria-label="Estimated charge">
            {(mode === "game" ? [[gameMinutes, "1 game"], [gameMinutes + 10, "+10 min extra"], [60, "1 hour"]] : [[30, "30 min"], [60, "1 hour"], [120, "2 hours"]]).map(([m, label]) => <div key={m}><span>{label}</span><strong>{estimate(m)}</strong></div>)}
          </div>
        </aside>

        <section className="start-main">
          {bookedName && (
            <button type="button" className={`booking-pick${picked.includes(booking.customerId) ? " active" : ""}`} onClick={() => !picked.includes(booking.customerId) && togglePicked(booking.customerId)}>
              <Icon name="calendar" /><span><strong>Booked {booking.start} · {bookedName}</strong><small>{booking.duration}h · {booking.status} — tap to select</small></span>
            </button>
          )}
          <div className="customer-head">
            <span className="field-label">Who is playing? <em className="player-count">{count} selected</em></span>
            <div className="search-box compact-search">
              <span className="search-icon"><Icon name="search" /></span>
              <input type="search" placeholder="Find member by name or phone" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search members" />
            </div>
          </div>
          <div className="customer-grid" role="group" aria-label="Players">
            <button type="button" className={`customer-tile walk-in${!picked.length ? " active" : ""}`} aria-pressed={!picked.length} onClick={() => setPicked([])}>
              <span className="tile-icon"><Icon name="user" /></span>
              <span className="tile-copy"><strong>Walk-in guest</strong><small>No member account</small></span>
            </button>
            {shown.map((c) => {
              const on = picked.includes(c.id);
              return (
                <button type="button" key={c.id} className={`customer-tile${on ? " active" : ""}`} aria-pressed={on} onClick={() => togglePicked(c.id)}>
                  <Avatar name={c.name} />
                  <span className="tile-copy"><strong>{c.name}</strong><small>{c.membership} · {c.sessions} visits</small></span>
                  {c.balance > 0 && <span className="tile-due" title="Previous balance is added to the bill">Due {money(c.balance)}</span>}
                </button>
              );
            })}
          </div>
          {q && !matches.length && <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>No member matches “{query}”. Add the name below.</p>}
          {matches.length > MEMBER_LIMIT && <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Showing {MEMBER_LIMIT} of {matches.length} — search to narrow down.</p>}

          {q && !matches.length && <p className="muted" style={{ fontSize: 13, margin: "8px 0 0" }}>No member matches “{query}”. Start as a walk-in and add the name below.</p>}
          {matches.length > MEMBER_LIMIT && <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>Showing {MEMBER_LIMIT} of {matches.length} — search to narrow down.</p>}

          <div className="start-extra">
            <input type="hidden" name="customerId" value={customerId} />
            <input type="hidden" name="guestName" value={names[0] || ""} />
            <input type="hidden" name="players" value={JSON.stringify([...picked.map((id) => ({ customerId: id })), ...names.map((name) => ({ name }))])} />
            <div className="field">
              <span>Add a name <em>(optional · guests or friends)</em></span>
              <div className="name-adder">
                <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Type a name and press Enter" autoComplete="off"
                  onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) { e.preventDefault(); addName(); } }} />
                <button type="button" className="button button-sm" disabled={!custom.trim()} onClick={addName}><Icon name="plus" />Add</button>
              </div>
              {!!names.length && (
                <div className="player-chips">
                  {names.map((n, i) => (
                    <span key={n} className="player-chip"><Icon name="user" />{n}<button type="button" onClick={() => setNames(names.filter((_, k) => k !== i))} aria-label={`Remove ${n}`}><Icon name="x" /></button></span>
                  ))}
                </div>
              )}
            </div>
            {selected?.balance > 0 && <p className="balance-note"><Icon name="alert" />{selected.name} has a previous balance of {money(selected.balance)}; it will be added to this bill.</p>}
            <button type="button" className="link-button" onClick={() => setShowNotes((v) => !v)} aria-expanded={showNotes}><Icon name={showNotes ? "x" : "plus"} />{showNotes ? "Hide note" : "Add a note"}</button>
            <label className="field" hidden={!showNotes}><span>Session note</span><textarea name="notes" rows="2" placeholder="e.g. tournament practice, paid deposit…" /></label>
          </div>
        </section>
      </div>
    </Modal>
  );
}
