/** Small pieces shared by the table popups. */
import { useStore } from "@/app/store.jsx";
import { useNow } from "@/hooks/useNow.js";
import { billableMilliseconds, extraGameMinutes, gameMinutesOf } from "@/lib/domain.js";

export const muted = { display: "block", color: "var(--color-text-muted)", fontSize: 12 };

/** "Single game 15 min + 7 extra min" for game-mode sessions; ticks with the timer. */
export function GameTimeLabel({ session }) {
  const { settings } = useStore();
  const now = useNow();
  const minutes = gameMinutesOf(session, settings);
  return `Single game ${minutes} min + ${extraGameMinutes(billableMilliseconds(session, now), minutes)} extra min`;
}
export const tableChargeLabel = (session, fallback) => (session.billingMode === "game" ? <GameTimeLabel session={session} /> : fallback);
