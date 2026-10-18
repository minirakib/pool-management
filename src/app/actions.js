/**
 * Business operations, ported 1:1 from the original app.js.
 * Each function mutates a *draft copy* of state (the store clones before calling) and
 * throws an Error with a user-facing message when the operation is not allowed.
 */
import { customerName, salaryNet, sessionBreakdown } from "../lib/domain.js";
import { todayISO, uid } from "../lib/format.js";

export const findTable = (s, id) => s.tables.find((t) => t.id === id);
export const tableSession = (s, table) => table && s.sessions.find((session) => session.tableId === table.id);
export const lowStockCount = (s) => s.products.filter((p) => p.stock <= p.threshold).length;
const fail = (message) => { throw new Error(message); };

export function startSession(s, tableId, values) {
  const table = findTable(s, tableId);
  if (!table || table.status !== "available" || tableSession(s, table)) fail("This table is no longer available.");
  const guest = values.customerId === "guest";
  const guestName = guest ? values.guestName.trim() || "Walk-in guest" : "";
  const now = Date.now();
  s.sessions.push({ id: uid("ses"), tableId: table.id, customerId: guest ? null : values.customerId, guestName, startedAt: now, originalStartedAt: now, accumulatedMs: 0, segmentAccumulatedMs: 0, tableChargeCarry: 0, pausedAt: null, billingMode: values.billingMode, products: [], notes: values.notes.trim() });
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
  const receipt = { tableName: table.name, category: table.category, customer, startedAt: session.originalStartedAt || session.startedAt, endedAt: closedAt, duration: bill.elapsed, rate: table.rate, tableCharge: bill.tableCharge, products: session.products.map(({ name, qty, price }) => ({ name, qty, price })), previousBalance, discount, total: bill.total, method };
  s.transactions.push({ id: uid("tx"), sessionId: session.id, type: "session", description: `${table.name} · Session`, customer, amount: bill.total, revenueAmount, previousBalance, method, date: new Date(closedAt).toISOString(), tableId: table.id, discount, receipt });
  if (linkedCustomer) {
    linkedCustomer.sessions += 1;
    linkedCustomer.spending += revenueAmount;
    linkedCustomer.balance = method === "Customer Credit" ? bill.total : 0;
  }
  table.status = "available";
  s.sessions = s.sessions.filter((entry) => entry.id !== session.id);
  return { bill, method };
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
  const saved = { id: table?.id || uid("tbl"), name: values.name.trim(), category: values.category, rate: Number(values.rate), status: values.status, cloth, notes: values.notes.trim() };
  if (table) Object.assign(table, saved);
  else s.tables.push(saved);
  return `${saved.name} ${table ? "updated" : "added"}.`;
}

export function saveCustomer(s, customerId, values) {
  const phone = values.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15 || !/^[+()\d\s.-]+$/.test(phone)) fail("Enter a valid phone number using 7–15 digits.");
  const customer = s.customers.find((entry) => entry.id === customerId);
  if (s.customers.some((entry) => entry.id !== customer?.id && entry.phone.replace(/\D/g, "") === digits)) fail("A customer with this phone number already exists.");
  const saved = { ...(customer || { id: uid("cus"), registered: todayISO(), sessions: 0, spending: 0, balance: 0 }), name: values.name.trim(), phone, email: values.email.trim(), membership: values.membership, notes: values.notes.trim() };
  if (customer) Object.assign(customer, saved);
  else s.customers.push(saved);
  return `${saved.name} ${customer ? "updated" : "added"}.`;
}

const minutes = (hhmm) => hhmm.split(":").reduce((h, m) => h * 60 + Number(m), 0);
export function bookingOverlaps(s, candidate, skipId = "") {
  if (candidate.status !== "Confirmed" || !candidate.tableId) return false;
  const start = minutes(candidate.start);
  const end = start + Number(candidate.duration) * 60;
  return s.bookings.some((booking) => {
    if (booking.id === skipId || booking.status !== "Confirmed" || booking.date !== candidate.date || booking.tableId !== candidate.tableId) return false;
    const otherStart = minutes(booking.start);
    return start < otherStart + Number(booking.duration) * 60 && otherStart < end;
  });
}

export function saveBooking(s, bookingId, values) {
  const customer = s.customers.find((entry) => entry.id === values.customerId);
  const candidate = { id: bookingId || uid("bok"), customerId: values.customerId, tableId: values.tableId || "", date: values.date, start: values.start, duration: Number(values.duration), phone: values.phone.trim(), status: values.status, notes: values.notes.trim() };
  if (bookingOverlaps(s, candidate, bookingId)) fail("That table already has a confirmed booking during this time.");
  const previous = s.bookings.find((entry) => entry.id === bookingId);
  if (previous) Object.assign(previous, candidate);
  else s.bookings.push(candidate);
  return `Booking for ${customer?.name || "guest"} saved.`;
}

const BOOKING_STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];
export function cycleBookingStatus(s, bookingId) {
  const booking = s.bookings.find((entry) => entry.id === bookingId);
  if (!booking) return null;
  const candidate = { ...booking, status: BOOKING_STATUSES[(BOOKING_STATUSES.indexOf(booking.status) + 1) % BOOKING_STATUSES.length] };
  if (bookingOverlaps(s, candidate, bookingId)) fail("This status change would overlap another confirmed booking.");
  booking.status = candidate.status;
  return `Booking marked ${booking.status.toLowerCase()}.`;
}

export function saveExpense(s, expenseId, values) {
  const expense = s.expenses.find((entry) => entry.id === expenseId);
  const saved = { ...(expense || { id: uid("exp") }), title: values.title.trim(), category: values.category, amount: Number(values.amount), date: values.date, method: values.method, recordedBy: values.recordedBy.trim() || "Admin", description: values.description.trim() };
  if (expense) Object.assign(expense, saved);
  else s.expenses.push(saved);
  return "Expense record saved.";
}

/* ---------- Product categories ---------- */
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
function cleanCategory(s, name, except = "") {
  const value = String(name || "").trim().replace(/\s+/g, " ");
  if (!value) fail("Enter a category name.");
  if (value.length > 30) fail("Category names can be up to 30 characters.");
  if (s.productCategories.some((c) => sameName(c, value) && !sameName(c, except))) fail(`“${value}” already exists.`);
  return value;
}

export function addProductCategory(s, name) {
  const value = cleanCategory(s, name);
  s.productCategories.push(value);
  return `Category “${value}” added.`;
}

/** Renames a category and moves every product in it to the new name. */
export function renameProductCategory(s, from, name) {
  const index = s.productCategories.indexOf(from);
  if (index < 0) fail("This category no longer exists.");
  const value = cleanCategory(s, name, from);
  s.productCategories[index] = value;
  s.products.forEach((p) => { if (p.category === from) p.category = value; });
  return `Category renamed to “${value}”.`;
}

/** Deletes an empty category; one that still has products must be emptied or renamed first. */
export function deleteProductCategory(s, name) {
  const used = s.products.filter((p) => p.category === name).length;
  if (used) fail(`Move or delete the ${used} product${used === 1 ? "" : "s"} in “${name}” first.`);
  if (s.productCategories.length <= 1) fail("Keep at least one category.");
  s.productCategories = s.productCategories.filter((c) => c !== name);
  return `Category “${name}” deleted.`;
}

export function saveProduct(s, productId, values) {
  const product = s.products.find((entry) => entry.id === productId);
  if (s.products.some((entry) => entry.id !== product?.id && entry.sku.toLowerCase() === values.sku.trim().toLowerCase())) fail("SKU must be unique.");
  if (Number(values.price) < 0 || Number(values.cost) < 0) fail("Prices cannot be negative.");
  // "New category…" in the form sends newCategory; it is created along with the product.
  let category = values.category;
  if (category === "__new__") {
    category = cleanCategory(s, values.newCategory);
    s.productCategories.push(category);
  } else if (!s.productCategories.includes(category)) fail("Choose a category.");
  const saved = { ...(product || { id: uid("prd") }), name: values.name.trim(), sku: values.sku.trim(), category, cost: Number(values.cost), price: Number(values.price), stock: Number(values.stock), threshold: Number(values.threshold) };
  if (product) Object.assign(product, saved);
  else s.products.push(saved);
  return `${saved.name} ${product ? "updated" : "added"} to inventory.`;
}

export function adjustStock(s, productId, delta) {
  const product = s.products.find((entry) => entry.id === productId);
  const next = product.stock + Number(delta);
  if (!Number.isInteger(Number(delta)) || next < 0) fail("Stock adjustment must be a whole number and cannot make stock negative.");
  product.stock = next;
  return `${product.name} stock adjusted to ${product.stock}.`;
}

export function saveStaff(s, staffId, values) {
  const member = s.staff.find((entry) => entry.id === staffId);
  if (s.staff.some((entry) => entry.id !== member?.id && entry.username.toLowerCase() === values.username.trim().toLowerCase())) fail("Username must be unique.");
  const saved = { ...(member || { id: uid("stf") }), name: values.name.trim(), phone: values.phone.trim(), username: values.username.trim(), role: values.role, status: values.status, joined: values.joined, shift: values.shift.trim(), salary: Math.max(0, Math.round(Number(values.salary) || 0)) };
  if (member) Object.assign(member, saved);
  else s.staff.push(saved);
  return `${saved.name} details saved.`;
}

export function toggleStaffStatus(s, staffId) {
  const member = s.staff.find((entry) => entry.id === staffId);
  if (!member) return null;
  member.status = member.status === "Active" ? "Inactive" : "Active";
  return `${member.name} marked ${member.status.toLowerCase()}.`;
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

export function completeSale(s, cart, discountValue, method) {
  if (!cart.length) fail("Add at least one product before completing a sale.");
  const shortage = cart.find((line) => line.qty > s.products.find((p) => p.id === line.productId)?.stock);
  if (shortage) fail(`${shortage.name} no longer has enough stock.`);
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const discount = Math.min(subtotal, Math.max(0, Number(discountValue) || 0));
  const amount = Math.max(0, Math.round(subtotal - discount));
  const closedAt = Date.now();
  const receipt = { tableName: "Counter sale", customer: "Counter sale", endedAt: closedAt, tableCharge: 0, products: cart.map(({ name, qty, price }) => ({ name, qty, price })), previousBalance: 0, discount, total: amount, method };
  cart.forEach((line) => { s.products.find((p) => p.id === line.productId).stock -= line.qty; });
  s.transactions.push({ id: uid("tx"), type: "sale", description: `Counter sale · ${cart.reduce((sum, line) => sum + line.qty, 0)} items`, customer: "Counter sale", amount, revenueAmount: amount, method, date: new Date(closedAt).toISOString(), receipt });
  return { amount, method };
}

export function saveSettings(s, values) {
  Object.assign(s.settings, {
    clubName: values.clubName.trim(), phone: values.phone.trim(), address: values.address.trim(),
    defaultRate: Number(values.defaultRate), billingMode: values.billingMode, minimumCharge: Number(values.minimumCharge) || 0,
    theme: values.theme, accent: values.accent
  });
  return "Club settings saved on this device.";
}

/** Sets the board colour for new tables; with applyToAll, recolours every existing table too. */
export function setDefaultCloth(s, cloth, applyToAll = false) {
  s.settings.defaultCloth = cloth;
  if (applyToAll) s.tables.forEach((t) => { t.cloth = cloth; });
  return applyToAll ? "Board color applied to all tables." : "Default board color saved.";
}

export function toggleTheme(s) {
  s.settings.theme = s.settings.theme === "dark" ? "light" : "dark";
}

/* ---------- Salary / payroll ---------- */
const salaryAmounts = (values) => Object.fromEntries(["base", "bonus", "overtime", "deduction", "advance"].map((key) => [key, Math.max(0, Math.round(Number(values[key]) || 0))]));

/** Keeps the expense created by a paid salary in step with the salary record. */
function syncSalaryExpense(s, record) {
  const expense = s.expenses.find((entry) => entry.id === record.expenseId);
  if (!expense) return;
  Object.assign(expense, { title: `Salary · ${record.staffName}`, amount: salaryNet(record), date: record.paidOn, method: record.method, description: `Payroll for ${record.month}` });
}

export function saveSalary(s, salaryId, values) {
  const member = s.staff.find((entry) => entry.id === values.staffId);
  if (!member) fail("Choose a staff member.");
  if (!/^\d{4}-\d{2}$/.test(values.month || "")) fail("Choose a salary month.");
  const record = s.salaries.find((entry) => entry.id === salaryId);
  if (s.salaries.some((entry) => entry.id !== record?.id && entry.staffId === member.id && entry.month === values.month)) fail(`${member.name} already has a salary entry for this month.`);
  const amounts = salaryAmounts(values);
  if (!amounts.base) fail("Base salary must be more than zero.");
  if (salaryNet(amounts) < 0) fail("Deductions and advance cannot be more than the gross salary.");
  const saved = { ...(record || { id: uid("sal"), status: "Pending", paidOn: "", method: "", expenseId: "" }), staffId: member.id, staffName: member.name, role: member.role, month: values.month, ...amounts, notes: (values.notes || "").trim() };
  if (record) { Object.assign(record, saved); syncSalaryExpense(s, record); }
  else s.salaries.push(saved);
  return `Salary for ${member.name} ${record ? "updated" : "added"}.`;
}

/** Creates pending salary entries for every active staff member with a monthly salary. */
export function generatePayroll(s, month) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) fail("Choose a salary month.");
  const missing = s.staff.filter((m) => m.status === "Active" && m.salary > 0 && !s.salaries.some((r) => r.staffId === m.id && r.month === month));
  if (!missing.length) fail("Every active staff member with a salary already has an entry for this month.");
  missing.forEach((m) => s.salaries.push({ id: uid("sal"), staffId: m.id, staffName: m.name, role: m.role, month, base: m.salary, bonus: 0, overtime: 0, deduction: 0, advance: 0, status: "Pending", paidOn: "", method: "", expenseId: "", notes: "" }));
  return `Payroll created for ${missing.length} staff member${missing.length === 1 ? "" : "s"}.`;
}

/** Marks a salary paid and records the net amount as a "Staff Salary" expense. */
export function paySalary(s, salaryId, values) {
  const record = s.salaries.find((entry) => entry.id === salaryId);
  if (!record) fail("This salary entry no longer exists.");
  if (record.status === "Paid") fail("This salary has already been paid.");
  if (!values.paidOn) fail("Choose the payment date.");
  Object.assign(record, { status: "Paid", paidOn: values.paidOn, method: values.method || "Cash", expenseId: uid("exp") });
  s.expenses.push({ id: record.expenseId, title: "", category: "Staff Salary", amount: 0, date: "", method: "", description: "", recordedBy: "Admin", salaryId: record.id });
  syncSalaryExpense(s, record);
  return `${record.staffName}'s salary of ${salaryNet(record).toLocaleString("en-BD")} BDT marked paid.`;
}

/** Reverses a payment: the salary goes back to pending and its expense is removed. */
export function unpaySalary(s, salaryId) {
  const record = s.salaries.find((entry) => entry.id === salaryId);
  if (!record || record.status !== "Paid") return null;
  s.expenses = s.expenses.filter((entry) => entry.id !== record.expenseId);
  Object.assign(record, { status: "Pending", paidOn: "", method: "", expenseId: "" });
  return `${record.staffName}'s salary moved back to pending.`;
}

export const deleteConfigs = {
  customer: { list: "customers", field: "name", label: "customer", blocked: (s, r) => s.sessions.some((x) => x.customerId === r.id) },
  booking: { list: "bookings", field: "id", label: "booking" },
  product: { list: "products", field: "name", label: "product", blocked: (s, r) => s.sessions.some((x) => x.products.some((i) => i.productId === r.id)) },
  // A salary's expense goes with it; deleting a salary expense returns the salary to pending.
  expense: { list: "expenses", field: "title", label: "expense", cleanup: (s, r) => { if (r.salaryId) unpaySalary(s, r.salaryId); } },
  staff: { list: "staff", field: "name", label: "staff member" },
  salary: { list: "salaries", field: "staffName", label: "salary entry", cleanup: (s, r) => { if (r.expenseId) s.expenses = s.expenses.filter((e) => e.id !== r.expenseId); } }
};

export function deleteRecord(s, kind, id) {
  const config = deleteConfigs[kind];
  const record = s[config.list].find((entry) => entry.id === id);
  if (record) config.cleanup?.(s, record);
  s[config.list] = s[config.list].filter((entry) => entry.id !== id);
  return `${config.label[0].toUpperCase() + config.label.slice(1)} deleted.`;
}
