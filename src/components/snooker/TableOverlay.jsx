import { useStore } from "@/app/store.jsx";
import { customerName } from "@/lib/domain.js";
import { initials } from "@/lib/format.js";
import Icon from "@/components/Icon.jsx";
import { Timer } from "@/components/Live.jsx";

/**
 * The live badge centred on the table artwork while a session runs (or is paused):
 * status, timer and who is playing. Free and in-service tables show nothing here.
 * Pass it as SnookerTable's children.
 */
export default function TableOverlay({ table, session }) {
  const state = useStore();
  if (!session) return null;
  const name = customerName(state, session);
  const member = !!session.customerId;
  return (
    <div className="table-badge" data-state={table.status}>
      <span className="badge-label"><i></i>{table.status === "paused" ? "Paused" : "Live"}</span>
      <Timer session={session} className="badge-time" />
      <span className="badge-player" title={member ? `Member · ${name}` : name}>
        <span className="badge-player-mark">{member ? initials(name) : <Icon name="user" />}</span>
        <span className="badge-player-name">{name}</span>
      </span>
    </div>
  );
}
