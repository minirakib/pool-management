import { Timer } from "./Live.jsx";

/**
 * The timer centred on the table artwork while a session runs (or is paused).
 * Free and in-service tables show nothing here; the price stays in the card's bottom row.
 * Pass it as SnookerTable's children.
 */
export default function TableOverlay({ table, session }) {
  if (!session) return null;
  return (
    <div className="table-badge" data-state={table.status}>
      <span className="badge-label"><i></i>{table.status === "paused" ? "Paused" : "Live"}</span>
      <Timer session={session} className="badge-time" />
    </div>
  );
}
