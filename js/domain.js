import { money, todayISO } from "./utils.js";

export function billableMilliseconds(session, now = Date.now()) {
  return session.accumulatedMs + (session.pausedAt ? 0 : Math.max(0, now - session.startedAt));
}

export function calculateTableCharge(rate, elapsedMs, mode = "minute", minimum = 0) {
  const hours = Math.max(0, elapsedMs) / 3_600_000;
  const charge = mode === "hour" ? Math.ceil(hours) * Number(rate) : hours * Number(rate);
  return Math.max(Number(minimum) || 0, charge);
}

export function sessionBreakdown(session, table, settings, now = Date.now(), discount = 0, previousBalance = 0) {
  const elapsed = billableMilliseconds(session, now);
  const segmentElapsed = (session.segmentAccumulatedMs ?? session.accumulatedMs) + (session.pausedAt ? 0 : Math.max(0, now - session.startedAt));
  const tableCharge = (session.tableChargeCarry || 0) + calculateTableCharge(table.rate, segmentElapsed, session.billingMode || settings.billingMode, session.tableChargeCarry ? 0 : settings.minimumCharge);
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
