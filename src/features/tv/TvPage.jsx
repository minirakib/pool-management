import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { tableSession } from "@/app/actions";
import { useStorageSync, useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { Timer } from "@/components/Live.jsx";
import SnookerTable from "@/components/snooker/SnookerTable.jsx";
import { useNow } from "@/hooks/useNow.js";
import { customerName, hourTypeLabel } from "@/lib/domain.js";
import { dateLabel, initials, timeLabel } from "@/lib/format.js";
import { clothFor } from "@/lib/theme.js";
import "./tv.css";

/** Card height / width. Must match the card layout in tv.css (header + 2:1 table artwork). */
const CARD_RATIO = 0.8;
const STATUS_TEXT = { occupied: "Playing", paused: "Paused", available: "Free", maintenance: "Service" };
const tableNumber = (table) => (table.name.match(/\d+/)?.[0] || table.name.slice(0, 2)).padStart(2, "0");

/**
 * Picks the column count that makes every card as large as possible inside the grid box,
 * so any number of tables fills the screen without scrolling.
 */
function useFitGrid(count) {
  const ref = useRef(null);
  const [fit, setFit] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const gap = Math.round(Math.max(8, Math.min(width, height) * 0.018));
      let best = { cols: 1, width: 0 };
      for (let cols = 1; cols <= Math.max(1, count); cols++) {
        const rows = Math.ceil(count / cols);
        const cardWidth = Math.min((width - gap * (cols - 1)) / cols, (height - gap * (rows - 1)) / rows / CARD_RATIO);
        if (cardWidth > best.width) best = { cols, width: cardWidth };
      }
      setFit({ cols: best.cols, width: Math.floor(best.width), gap });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);
  return [ref, fit];
}

/** Keeps the TV from dimming or sleeping while the display is open (where the browser supports it). */
function useWakeLock() {
  useEffect(() => {
    let lock = null;
    let active = true;
    const take = async () => {
      if (document.visibilityState !== "visible" || !navigator.wakeLock) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (active) lock = next; else next.release().catch(() => {});
      } catch { /* not allowed (battery saver, insecure origin): the screen may sleep */ }
    };
    take();
    document.addEventListener("visibilitychange", take);
    return () => { active = false; document.removeEventListener("visibilitychange", take); lock?.release().catch(() => {}); };
  }, []);
}

/** True while the mouse has moved in the last few seconds; the controls and cursor hide otherwise. */
function usePointerAwake(delay = 3000) {
  const [awake, setAwake] = useState(true);
  useEffect(() => {
    let timer = setTimeout(() => setAwake(false), delay);
    const wake = () => { setAwake(true); clearTimeout(timer); timer = setTimeout(() => setAwake(false), delay); };
    window.addEventListener("pointermove", wake);
    window.addEventListener("keydown", wake);
    return () => { clearTimeout(timer); window.removeEventListener("pointermove", wake); window.removeEventListener("keydown", wake); };
  }, [delay]);
  return awake;
}

function Clock() {
  const now = useNow(1000);
  return (
    <div className="tv-clock">
      <strong>{timeLabel(now)}</strong>
      <span>{dateLabel(new Date(now))}</span>
    </div>
  );
}

/** Bottom strip: who is playing and since when, or that the table is free / closed. */
function TvFooter({ table, session }) {
  const state = useStore();
  if (!session) return (
    <footer className="tv-card-foot tv-foot-idle">
      <span className="tv-avatar"><Icon name={table.status === "maintenance" ? "alert" : "check"} /></span>
      <div className="tv-who">
        <strong>{table.status === "maintenance" ? "Out of service" : "Ready to play"}</strong>
        <span>{table.status === "maintenance" ? "Please use another table" : "Ask at the counter"}</span>
      </div>
    </footer>
  );
  const name = customerName(state, session);
  return (
    <footer className="tv-card-foot">
      <span className="tv-avatar">{session.customerId ? initials(name) : <Icon name="user" />}</span>
      <div className="tv-who">
        <strong>{name}</strong>
        <span>Started {timeLabel(session.originalStartedAt || session.startedAt)} · {hourTypeLabel(session.hourType)}</span>
      </div>
    </footer>
  );
}

function TvCard({ table }) {
  const state = useStore();
  const session = tableSession(state, table);
  return (
    <article className="tv-card" data-status={table.status}>
      <header className="tv-card-top">
        <span className="tv-number">{tableNumber(table)}</span>
        <div className="tv-title"><strong>{table.name}</strong><span>{table.category}</span></div>
        <span className="tv-status"><i></i>{STATUS_TEXT[table.status] || table.status}</span>
      </header>
      <SnookerTable cloth={clothFor(table, state.settings)}>
        {session && (
          <div className="tv-live">
            <span className="tv-live-label">{table.status === "paused" ? "Paused" : "Live"}</span>
            <Timer session={session} className="tv-live-time" />
          </div>
        )}
      </SnookerTable>
      <TvFooter table={table} session={session} />
    </article>
  );
}

/**
 * Full-screen board for a TV in the club: every table with its live time and player.
 * Read-only; open it in its own window and it follows changes made at the counter.
 */
export default function TvPage() {
  const state = useStore();
  const { reload } = useStoreApi();
  const { setPage } = useUi();
  const [gridRef, fit] = useFitGrid(state.tables.length);
  const awake = usePointerAwake();
  const [fullscreen, setFullscreen] = useState(() => !!document.fullscreenElement);

  useStorageSync(reload);
  useWakeLock();

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    const onKey = (e) => { if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFullscreen(); };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onChange); window.removeEventListener("keydown", onKey); };
  }, [toggleFullscreen]);

  const exit = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setPage("tables");
  };

  return (
    <div className={`tv-screen${awake ? "" : " idle"}${fullscreen ? " fullscreen" : ""}`}>
      <header className="tv-bar">
        <div className="tv-brand">
          <div className="brand-mark"><span>C</span></div>
          <div><div className="brand-name">CUE<b>CORE</b></div><div className="tv-club">{state.settings.clubName}</div></div>
        </div>
        <Clock />
        {/* In full screen this floats over the top-right corner, shown on mouse move or while hovering the corner. */}
        <div className="tv-corner">
          <div className="tv-controls">
            <button className="button button-sm" onClick={toggleFullscreen} title="Full screen (F)">
              <Icon name="expand" /><span>{fullscreen ? "Exit full screen" : "Full screen"}</span>
            </button>
            <button className="icon-button" onClick={exit} aria-label="Close TV display" title="Close TV display"><Icon name="x" /></button>
          </div>
        </div>
      </header>
      <main className="tv-grid" ref={gridRef}
        style={fit ? { "--card-w": `${fit.width}px`, gap: `${fit.gap}px`, gridTemplateColumns: `repeat(${fit.cols}, var(--card-w))` } : undefined}>
        {!state.tables.length
          ? <div className="tv-empty"><Icon name="cue" /><strong>No tables yet</strong><span>Add tables on the Tables page.</span></div>
          : fit && state.tables.map((t) => <TvCard key={t.id} table={t} />)}
      </main>
    </div>
  );
}
