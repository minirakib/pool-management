import { useStore } from "../app/store.jsx";
import { useNow } from "../hooks/useNow.js";
import { billableMilliseconds, sessionBreakdown } from "../lib/domain.js";
import { durationLabel, money } from "../lib/format.js";

// Small components that tick every second. Only they re-render, not the whole page.

/** Pass className="" to render bare text (inside chips whose CSS styles every nested span as a label). */
export function Timer({ session, className = "timer-text" }) {
  const now = useNow();
  const text = durationLabel(billableMilliseconds(session, now));
  return className ? <span className={className}>{text}</span> : text;
}

/** Live bill for a session. field: "total" | "tableCharge" */
export function LiveAmount({ session, table, field = "total", discount = 0, previousBalance = 0 }) {
  const { settings } = useStore();
  const now = useNow();
  return money(sessionBreakdown(session, table, settings, now, discount, previousBalance)[field]);
}
