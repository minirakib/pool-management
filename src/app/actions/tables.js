/** Tables and live sessions: start, pause/resume, switch, add products, close and pay. */
import { customerName, rateFor, sessionBreakdown, splitShares } from "../../lib/domain.js";
import { uid } from "../../lib/format.js";
import { fail, findTable, tableSession } from "./helpers.js";

export function startSession(s, tableId, values) {
  const table = findTable(s, tableId);
  if (!table || table.status !== "available" || tableSession(s, table)) fail("This table is no longer available.");
  const guest = values.customerId === "guest";
  const guestName = guest ? values.guestName.trim() || "Walk-in guest" : "";
  const now = Date.now();
  s.sessions.push({ id: uid("ses"), tableId: table.id, customerId: guest ? null : values.customerId, guestName, startedAt: now, originalStartedAt: now, accumulatedMs: 0, segmentAccumulatedMs: 0, tableChargeCarry: 0, pausedAt: null, billingMode: values.billingMode, ...(values.billingMode === "game" ? { gameMinutes: s.settings.singleGameMinutes ?? 15 } : {}), hourType: values.hourType === "nonac" ? "nonac" : "ac", products: [], notes: values.notes.trim() });
  table.status = "occupied";
  return `${table.name} is now in play.`;
}

export function setSessionStatus(s, tableId, nextStatus) {
  const table = findTable(s, tableId);
  const session = tableSession(s, table);
  if (!table || !session) return null;
  const now = Date.now();
  if (nextStatus === "paused" && table.status === "occupied") {
    const elapsed = Math.max(0, now - session.startedAt);
    session.accumulatedMs += elapsed;
    session.segmentAccumulatedMs = (session.segmentAccumulatedMs || 0) + elapsed;
    session.pausedAt = now;
  } else if (nextStatus === "occupied" && table.status === "paused") {
    session.startedAt = now;
    session.pausedAt = null;
  } else return null;
  table.status = nextStatus;
  return `${table.name} session ${nextStatus === "paused" ? "paused" : "resumed"}.`;
}

export function closeSession(s, tableId, values) {
  const table = findTable(s, tableId);
  const session = tableSession(s, table);
  if (!table || !session) fail("This session has already been closed.");
  if (s.transactions.some((entry) => entry.sessionId === session.id)) fail("A payment has already been recorded for this session.");
  const discount = Math.max(0, Number(values.discount) || 0);
  const linkedCustomer = s.customers.find((entry) => entry.id === session.customerId);
  const previousBalance = linkedCustomer?.balance || 0;
  const closedAt = Date.now();
  const bill = sessionBreakdown(session, table, s.settings, closedAt, discount, previousBalance);
  const customer = customerName(s, session);
  const revenueAmount = Math.max(0, bill.total - previousBalance);
  const method = values.paymentMethod || "Cash";
  const receipt = { tableName: table.name, category: table.category, customer, startedAt: session.originalStartedAt || session.startedAt, endedAt: closedAt, duration: bill.elapsed, hourType: session.hourType || "ac", rate: rateFor(table, session.hourType), billingMode: session.billingMode, gameMinutes: session.gameMinutes, tableCharge: bill.tableCharge, products: session.products.map(({ name, qty, price }) => ({ name, qty, price })), previousBalance, discount, total: bill.total, split: Number(values.splitCount) > 1 ? splitShares(bill.total, Number(values.splitCount)) : null, method };
  s.transactions.push({ id: uid("tx"), sessionId: session.id, type: "session", description: `${table.name} · Session`, customer, amount: bill.total, revenueAmount, previousBalance, method, date: new Date(closedAt).toISOString(), tableId: table.id, discount, receipt });
  if (linkedCustomer) {
    linkedCustomer.sessions += 1;
    linkedCustomer.spending += revenueAmount;
    linkedCustomer.balance = method === "Customer Credit" ? bill.total : 0;
  }
  table.status = "available";
  s.sessions = s.sessions.filter((entry) => entry.id !== session.id);
  return { bill, method, receipt };
}

export function releaseMaintenance(s, tableId) {
  const table = findTable(s, tableId);
  if (!table) return null;
  table.status = "available";
  return `${table.name} marked available.`;
}

export function saveTable(s, tableId, values) {
  if (s.tables.some((t) => t.name.toLowerCase() === values.name.trim().toLowerCase() && t.id !== tableId)) fail("Each table must have a unique name.");
  const table = findTable(s, tableId);
  const cloth = values.cloth || table?.cloth || s.settings.defaultCloth || "green";
  const saved = { id: table?.id || uid("tbl"), name: values.name.trim(), category: values.category, rate: Number(values.rate), nonAcRate: Number(values.nonAcRate), status: values.status, cloth, notes: values.notes.trim() };
  if (table) Object.assign(table, saved);
  else s.tables.push(saved);
  return `${saved.name} ${table ? "updated" : "added"}.`;
}

export function switchSession(s, sourceId, targetId) {
  const source = findTable(s, sourceId);
  const target = findTable(s, targetId);
  const session = tableSession(s, source);
  if (!target || target.status !== "available" || tableSession(s, target)) fail("The selected table is no longer available.");
  if (!session) fail("This session is no longer active.");
  const now = Date.now();
  session.tableChargeCarry = sessionBreakdown(session, source, s.settings, now).tableCharge;
  session.segmentAccumulatedMs = 0;
  session.tableId = target.id;
  if (!session.pausedAt) session.startedAt = now;
  source.status = "available";
  target.status = session.pausedAt ? "paused" : "occupied";
  return `Session moved to ${target.name}; previous table charges are preserved.`;
}

export function addProductToSession(s, tableId, productId, qtyValue) {
  const product = s.products.find((entry) => entry.id === productId);
  const session = s.sessions.find((entry) => entry.tableId === tableId);
  const qty = Number(qtyValue);
  if (!product || !session || !Number.isInteger(qty) || qty < 1 || qty > product.stock) fail("Choose a valid quantity that is available in stock.");
  const line = session.products.find((entry) => entry.productId === product.id);
  if (line) line.qty += qty;
  else session.products.push({ productId: product.id, name: product.name, qty, price: product.price });
  product.stock -= qty;
  return `${qty} × ${product.name} added to the session.`;
}
