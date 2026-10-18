import assert from "node:assert/strict";
import { test } from "node:test";
import * as actions from "../src/app/actions.js";
import { createDemoState } from "../src/app/seed.js";
import { calculateTableCharge, salaryNet, sessionBreakdown } from "../src/lib/domain.js";

const fresh = () => createDemoState();

test("table charge: per minute, started hour, minimum", () => {
  assert.equal(calculateTableCharge(300, 1_800_000), 150);
  assert.equal(calculateTableCharge(300, 3_600_001, "hour"), 600);
  assert.equal(calculateTableCharge(300, 60_000, "minute", 100), 100);
});

test("start, pause and resume a session", () => {
  const s = fresh();
  actions.startSession(s, "tbl-02", { customerId: "guest", guestName: "", billingMode: "minute", notes: "" });
  assert.equal(s.tables.find((t) => t.id === "tbl-02").status, "occupied");
  assert.equal(s.sessions.at(-1).guestName, "Walk-in guest");
  assert.throws(() => actions.startSession(s, "tbl-02", { customerId: "guest", guestName: "", billingMode: "minute", notes: "" }), /no longer available/);

  actions.setSessionStatus(s, "tbl-02", "paused");
  assert.equal(s.tables.find((t) => t.id === "tbl-02").status, "paused");
  assert.ok(s.sessions.at(-1).pausedAt);
  actions.setSessionStatus(s, "tbl-02", "occupied");
  assert.equal(s.sessions.at(-1).pausedAt, null);
});

test("closing a session records payment, frees the table and updates the customer", () => {
  const s = fresh();
  const before = s.customers.find((c) => c.id === "cus-001").sessions;
  const { bill, method } = actions.closeSession(s, "tbl-01", { discount: "0", paymentMethod: "bKash" });
  assert.equal(method, "bKash");
  assert.ok(bill.total > 0);
  assert.equal(s.tables.find((t) => t.id === "tbl-01").status, "available");
  assert.ok(!s.sessions.some((x) => x.tableId === "tbl-01"));
  assert.equal(s.transactions.at(-1).amount, bill.total);
  assert.equal(s.customers.find((c) => c.id === "cus-001").sessions, before + 1);
});

test("adding a product deducts stock and rejects too much", () => {
  const s = fresh();
  actions.addProductToSession(s, "tbl-03", "prd-01", "2");
  assert.equal(s.products.find((p) => p.id === "prd-01").stock, 30);
  assert.throws(() => actions.addProductToSession(s, "tbl-03", "prd-08", "99"), /valid quantity/);
});

test("switching table keeps earlier table charges", () => {
  const s = fresh();
  const session = s.sessions.find((x) => x.tableId === "tbl-01");
  const before = sessionBreakdown(session, s.tables[0], s.settings).tableCharge;
  actions.switchSession(s, "tbl-01", "tbl-02");
  assert.equal(s.tables.find((t) => t.id === "tbl-01").status, "available");
  assert.equal(s.tables.find((t) => t.id === "tbl-02").status, "occupied");
  assert.ok(s.sessions.find((x) => x.tableId === "tbl-02").tableChargeCarry >= Math.floor(before));
});

test("confirmed bookings cannot overlap", () => {
  const s = fresh();
  const today = s.bookings[0].date;
  assert.throws(() => actions.saveBooking(s, "", { customerId: "cus-002", tableId: "tbl-02", date: today, start: "17:30", duration: "1", phone: "01819222430", status: "Confirmed", notes: "" }), /already has a confirmed booking/);
  assert.match(actions.saveBooking(s, "", { customerId: "cus-002", tableId: "tbl-02", date: today, start: "21:00", duration: "1", phone: "01819222430", status: "Confirmed", notes: "" }), /saved/);
});

test("counter sale deducts stock and clamps discount", () => {
  const s = fresh();
  const { amount } = actions.completeSale(s, [{ productId: "prd-01", name: "Mineral Water", price: 25, qty: 2 }], 999, "Cash");
  assert.equal(amount, 0);
  assert.equal(s.products.find((p) => p.id === "prd-01").stock, 30);
  assert.throws(() => actions.completeSale(s, [], 0, "Cash"), /at least one product/);
});

test("validation: unique table name, valid phone, unique SKU", () => {
  const s = fresh();
  assert.throws(() => actions.saveTable(s, "", { name: "table 02", category: "Standard", rate: "200", status: "available", notes: "" }), /unique name/);
  assert.throws(() => actions.saveCustomer(s, "", { name: "X", phone: "12", email: "", membership: "Regular", notes: "" }), /valid phone/);
  assert.throws(() => actions.saveProduct(s, "", { name: "X", sku: "drk-001", category: "Water", cost: "1", price: "2", stock: "1", threshold: "1" }), /SKU must be unique/);
});

test("starts with 3 tables, and board colours save per table and as a club default", () => {
  const s = fresh();
  assert.equal(s.tables.length, 3);
  actions.saveTable(s, "tbl-02", { name: "Table 02", category: "Standard", rate: "200", status: "available", notes: "", cloth: "red" });
  assert.equal(s.tables.find((t) => t.id === "tbl-02").cloth, "red");
  actions.setDefaultCloth(s, "purple");
  actions.saveTable(s, "", { name: "Table 04", category: "Standard", rate: "200", status: "available", notes: "" });
  assert.equal(s.tables.at(-1).cloth, "purple");
  actions.setDefaultCloth(s, "black", true);
  assert.ok(s.tables.every((t) => t.cloth === "black"));
});

test("payroll: generate, pay, undo and delete keep expenses in step", () => {
  const s = fresh();
  const month = "2030-01";
  assert.match(actions.generatePayroll(s, month), /2 staff members/); // active staff with a salary: Rafiq, Sumaiya
  assert.throws(() => actions.generatePayroll(s, month), /already has an entry/);
  const entry = s.salaries.find((r) => r.month === month && r.staffId === "stf-03");
  assert.equal(entry.status, "Pending");

  actions.saveSalary(s, entry.id, { staffId: "stf-03", month, base: "18000", bonus: "1000", overtime: "500", deduction: "300", advance: "2000", notes: "" });
  assert.equal(salaryNet(entry), 17200);
  assert.throws(() => actions.saveSalary(s, "", { staffId: "stf-03", month, base: "1", notes: "" }), /already has a salary entry/);
  assert.throws(() => actions.saveSalary(s, entry.id, { staffId: "stf-03", month, base: "100", advance: "500", notes: "" }), /cannot be more/);

  actions.paySalary(s, entry.id, { method: "bKash", paidOn: "2030-02-01" });
  const expense = s.expenses.find((e) => e.id === entry.expenseId);
  assert.equal(expense.amount, 17200);
  assert.equal(expense.category, "Staff Salary");
  assert.throws(() => actions.paySalary(s, entry.id, { method: "Cash", paidOn: "2030-02-01" }), /already been paid/);

  actions.saveSalary(s, entry.id, { staffId: "stf-03", month, base: "18000", bonus: "0", overtime: "0", deduction: "0", advance: "0", notes: "" });
  assert.equal(s.expenses.find((e) => e.id === entry.expenseId).amount, 18000);

  actions.deleteRecord(s, "expense", entry.expenseId);
  assert.equal(entry.status, "Pending");

  actions.paySalary(s, entry.id, { method: "Cash", paidOn: "2030-02-01" });
  const expenseId = entry.expenseId;
  actions.deleteRecord(s, "salary", entry.id);
  assert.ok(!s.expenses.some((e) => e.id === expenseId));
  assert.ok(!s.salaries.some((r) => r.id === entry.id));
});

test("expense periods: ranges, shifting and trend buckets", async () => {
  const { periodRange, shiftPeriod, inPeriod, totalsBy, trendBuckets } = await import("../src/features/expenses/period.js");
  const base = { mode: "month", day: "2026-02-28", month: "2026-02", year: "2026", from: "", to: "" };
  assert.deepEqual([periodRange(base).from, periodRange(base).to], ["2026-02-01", "2026-02-28"]);
  assert.equal(periodRange({ ...base, mode: "year" }).to, "2026-12-31");
  assert.equal(shiftPeriod(base, -2).month, "2025-12");
  assert.equal(shiftPeriod({ ...base, mode: "day" }, 1).day, "2026-03-01");
  // Reversed custom range is swapped; open ends are allowed.
  const custom = periodRange({ ...base, mode: "custom", from: "2026-03-10", to: "2026-03-01" });
  assert.deepEqual([custom.from, custom.to], ["2026-03-01", "2026-03-10"]);
  assert.ok(inPeriod(periodRange({ ...base, mode: "custom", from: "2026-01-05" }), "2030-01-01"));
  assert.ok(!inPeriod(periodRange({ ...base, mode: "all" }), ""));

  const list = [{ date: "2026-02-03", amount: 100 }, { date: "2026-02-03", amount: 50 }, { date: "2026-05-10", amount: 20 }];
  assert.deepEqual(totalsBy(list, (e) => e.date.slice(0, 7)), [["2026-02", { count: 2, amount: 150 }], ["2026-05", { count: 1, amount: 20 }]]);
  const month = trendBuckets(list, base, periodRange(base));
  assert.equal(month.length, 28);
  assert.equal(month[2].amount, 150);
  const year = trendBuckets(list, { ...base, mode: "year" }, periodRange({ ...base, mode: "year" }));
  assert.equal(year.length, 12);
  assert.equal(year[4].amount, 20);
  assert.deepEqual(trendBuckets(list, { ...base, mode: "day" }, periodRange({ ...base, mode: "day" })), []);
});

test("switching to a custom range starts from the period on screen", async () => {
  const { switchMode } = await import("../src/features/expenses/period.js");
  const p = switchMode({ mode: "month", day: "2026-02-10", month: "2026-02", year: "2026", from: "", to: "" }, "custom");
  assert.deepEqual([p.mode, p.from, p.to], ["custom", "2026-02-01", "2026-02-28"]);
  assert.equal(switchMode({ ...p, mode: "month" }, "custom").from, "2026-02-01"); // an existing custom range is kept
});

test("stale-deploy errors are recognised so the app reloads instead of going blank", async () => {
  const { isChunkError } = await import("../src/lib/staleDeploy.js");
  assert.ok(isChunkError(new TypeError("Failed to fetch dynamically imported module: /assets/SalaryPage-abc.js")));
  assert.ok(isChunkError(new TypeError("Importing a module script failed.")));
  assert.ok(!isChunkError(new Error("Cannot read properties of undefined")));
});
