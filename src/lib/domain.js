import { money, todayISO } from "./format.js";

export function billableMilliseconds(session, now = Date.now()) {
  return session.accumulatedMs + (session.pausedAt ? 0 : Math.max(0, now - session.startedAt));
}

/** Hourly rate for an AC / Non-AC game. `rate` is the AC rate; `nonAcRate` the Non-AC one. */
export const rateFor = (table, hourType = "ac") => Number(hourType === "nonac" ? table.nonAcRate ?? table.rate : table.rate) || 0;
export const hourTypeLabel = (hourType) => (hourType === "nonac" ? "Non-AC" : "AC");
export const ratesLabel = (table) => `AC ${money(rateFor(table, "ac"))} · Non-AC ${money(rateFor(table, "nonac"))}`;

/** Single game: the first N minutes are always charged; every minute after that is added at the per-minute rate. */
export const SINGLE_GAME_MINUTES = 15;
export const gameMinutesOf = (session, settings) => session?.gameMinutes ?? settings?.singleGameMinutes ?? SINGLE_GAME_MINUTES;
export const billingLabel = (mode, gameMinutes = SINGLE_GAME_MINUTES) =>
  mode === "hour" ? "Per started hour" : mode === "game" ? `Single game ${gameMinutes} min + extra min` : "Per minute";
/** Whole extra minutes played beyond a single game. */
export const extraGameMinutes = (elapsedMs, gameMinutes = SINGLE_GAME_MINUTES) => Math.max(0, Math.floor((elapsedMs - gameMinutes * 60_000) / 60_000));

export function calculateTableCharge(rate, elapsedMs, mode = "minute", minimum = 0, gameMinutes = SINGLE_GAME_MINUTES) {
  const hours = Math.max(0, elapsedMs) / 3_600_000;
  const charge = mode === "hour" ? Math.ceil(hours) * Number(rate)
    : mode === "game" ? Math.max(hours, gameMinutes / 60) * Number(rate)
    : hours * Number(rate);
  return Math.max(Number(minimum) || 0, charge);
}

/** Even shares of a bill; leftover taka go to the first players so the shares add up exactly. */
export function splitShares(total, players) {
  const base = Math.floor(total / players);
  return Array.from({ length: players }, (_, i) => base + (i < total - base * players ? 1 : 0));
}

export function sessionBreakdown(session, table, settings, now = Date.now(), discount = 0, previousBalance = 0) {
  const elapsed = billableMilliseconds(session, now);
  const segmentElapsed = (session.segmentAccumulatedMs ?? session.accumulatedMs) + (session.pausedAt ? 0 : Math.max(0, now - session.startedAt));
  // After a table switch the carried charge already covers the single game, so the new segment only adds time.
  const carried = !!session.tableChargeCarry;
  const tableCharge = (session.tableChargeCarry || 0) + calculateTableCharge(rateFor(table, session.hourType), segmentElapsed, session.billingMode || settings.billingMode, carried ? 0 : settings.minimumCharge, carried ? 0 : gameMinutesOf(session, settings));
  const products = session.products.reduce((sum, product) => sum + product.qty * product.price, 0);
  const gross = tableCharge + products;
  return {
    elapsed, tableCharge, products, discount: Math.max(0, Number(discount) || 0),
    previousBalance: Math.max(0, Number(previousBalance) || 0),
    total: Math.max(0, Math.round(gross - Math.max(0, Number(discount) || 0) + Math.max(0, Number(previousBalance) || 0)))
  };
}

export function dashboardMetrics(state) {
  const today = todayISO();
  const revenue = state.transactions.filter((entry) => entry.date.slice(0, 10) === today).reduce((sum, entry) => sum + (entry.revenueAmount ?? entry.amount), 0);
  const expenses = state.expenses.filter((entry) => entry.date === today).reduce((sum, entry) => sum + Number(entry.amount), 0);
  const active = state.tables.filter((table) => table.status === "occupied").length;
  const paused = state.tables.filter((table) => table.status === "paused").length;
  const available = state.tables.filter((table) => table.status === "available").length;
  const liveBills = state.sessions.reduce((sum, session) => {
    const table = state.tables.find((entry) => entry.id === session.tableId);
    return table ? sum + sessionBreakdown(session, table, state.settings).total : sum;
  }, 0);
  return {
    tables: state.tables.length, active, paused, available, maintenance: state.tables.filter((table) => table.status === "maintenance").length,
    revenue: revenue + liveBills, settledRevenue: revenue, expenses, profit: revenue + liveBills - expenses
  };
}

export function customerName(state, session) {
  return session.guestName || state.customers.find((customer) => customer.id === session.customerId)?.name || "Walk-in guest";
}

export function monthlyExpense(state) {
  const month = todayISO().slice(0, 7);
  return state.expenses.filter((entry) => entry.date.startsWith(month)).reduce((sum, entry) => sum + Number(entry.amount), 0);
}

export const currency = money;

/** Net pay for a salary entry: base + bonus + overtime − deduction − advance. */
export const salaryNet = (r) => (r.base || 0) + (r.bonus || 0) + (r.overtime || 0) - (r.deduction || 0) - (r.advance || 0);
