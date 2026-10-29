import { useState } from "react";
import * as actions from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";

/**
 * Players at a table (1–4): pick a saved customer or type a custom name.
 * When `selected`/`onSelect` are given, a player chip also works as a picker (used for ordering).
 */
export function PlayersPanel({ tableId, selected, onSelect }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { notify } = useUi();
  const [custom, setCustom] = useState("");
  const session = state.sessions.find((s) => s.tableId === tableId);
  if (!session) return null;
  const players = session.players || [];
  const taken = new Set(players.map((p) => p.customerId).filter(Boolean));
  const members = state.customers.filter((c) => c.id !== "cus-006" && !taken.has(c.id));

  const apply = (action, ...args) => {
    try { return run(action, tableId, ...args); }
    catch (err) { notify(err.message, "error", "Players"); return null; }
  };
  const add = (value) => { if (apply(actions.addPlayerToSession, value) !== null) { setCustom(""); } };
  const remove = (p) => { if (apply(actions.removePlayerFromSession, p.id) !== null && selected === p.name) onSelect?.(""); };

  const addMember = (id) => { if (id) add({ customerId: id }); };

  return (
    <div className="players-panel">
      <div className="players-head">
        <span><Icon name="user" />Players</span>
        <b className="players-count">{players.length}</b>
      </div>
      <div className="players-list">
        {onSelect && (
          <button type="button" className={`player-pick${!selected ? " active" : ""}`} aria-pressed={!selected} onClick={() => onSelect("")}>Whole table</button>
        )}
        {players.map((p) => (
          <span key={p.id} className={`player-pick has-remove${onSelect && selected === p.name ? " active" : ""}`}>
            <button type="button" className="player-pick-main" onClick={() => onSelect?.(p.name)} disabled={!onSelect}>
              <i className="player-dot">{p.name.trim().slice(0, 1).toUpperCase()}</i>{p.name}
            </button>
            <button type="button" className="player-remove" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}><Icon name="x" /></button>
          </span>
        ))}
        {!players.length && !onSelect && <p className="muted players-empty">No players added yet.</p>}
      </div>
      <div className="players-add">
        <select value="" onChange={(e) => addMember(e.target.value)} aria-label="Add a customer">
          <option value="">+ Add a customer…</option>
          {members.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="name-adder">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or type a name" aria-label="Custom player name" autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (custom.trim()) add({ name: custom }); } }} />
          <button type="button" className="button button-sm" disabled={!custom.trim()} onClick={() => add({ name: custom })}><Icon name="plus" />Add</button>
        </div>
      </div>
    </div>
  );
}
