import { defaultUsers } from "../lib/auth.js";
const localDate = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/** "YYYY-MM" for this month plus `offset` months. */
const monthISO = (offset = 0) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const ago = (minutes) => Date.now() - minutes * 60_000;

export function createDemoState() {
  const customers = [
    ["cus-001", "Arif Rahman", "01712 345 678", "arif@example.com", "Gold", 18, 12600, 0],
    ["cus-002", "Nadia Islam", "01819 222 430", "nadia@example.com", "VIP", 31, 24800, 500],
    ["cus-003", "Tanvir Hossain", "01911 807 265", "", "Regular", 7, 3850, 0],
    ["cus-004", "Samiul Karim", "01677 562 104", "samiul@example.com", "Silver", 12, 7200, 350],
    ["cus-005", "Farhan Ahmed", "01521 941 380", "", "Regular", 4, 2200, 0],
    ["cus-006", "Guest customer", "", "", "Regular", 0, 0, 0]
  ].map(([id, name, phone, email, membership, sessions, spending, balance], index) => ({
    id, name, phone, email, membership, sessions, spending, balance, notes: "",
    registered: localDate(-[126, 90, 60, 44, 22, 0][index])
  }));
  const products = [
    ["prd-01", "Mineral Water", "DRK-001", "Water", 12, 25, 32, 12],
    ["prd-02", "Cola 330ml", "DRK-002", "Soft Drinks", 28, 50, 19, 8],
    ["prd-03", "Orange Soda", "DRK-003", "Soft Drinks", 25, 45, 3, 8],
    ["prd-04", "Lemon Iced Tea", "DRK-004", "Soft Drinks", 35, 65, 14, 6],
    ["prd-05", "Masala Tea", "CAF-001", "Tea & Coffee", 12, 30, 24, 10],
    ["prd-06", "Cappuccino", "CAF-002", "Tea & Coffee", 40, 90, 8, 5],
    ["prd-07", "Salted Peanuts", "SNK-001", "Snacks", 25, 55, 11, 6],
    ["prd-08", "Potato Chips", "SNK-002", "Snacks", 22, 45, 2, 8],
    ["prd-09", "Choco Wafer", "SNK-003", "Snacks", 18, 35, 17, 6],
    ["prd-10", "Cue Tip 10mm", "ACC-001", "Accessories", 80, 150, 6, 3]
  ].map(([id, name, sku, category, cost, price, stock, threshold]) => ({ id, name, sku, category, cost, price, stock, threshold }));
  const tables = [
    ["tbl-01", "Table 01", "Premium", 250, 200, "occupied", "red"],
    ["tbl-02", "Table 02", "Standard", 250, 200, "available", "blue"],
    ["tbl-03", "Table 03", "VIP", 250, 200, "occupied", "grey"]
  ].map(([id, name, category, rate, nonAcRate, status, cloth]) => ({ id, name, category, rate, nonAcRate, status, cloth, notes: "" }));
  const sessions = [
    { id: "ses-01", tableId: "tbl-01", customerId: "cus-001", guestName: "", startedAt: ago(74), accumulatedMs: 0, pausedAt: null, billingMode: "minute", hourType: "ac", products: [{ productId: "prd-02", name: "Cola 330ml", qty: 2, price: 50 }], notes: "" },
    { id: "ses-02", tableId: "tbl-03", customerId: "cus-002", guestName: "", startedAt: ago(132), accumulatedMs: 0, pausedAt: null, billingMode: "minute", hourType: "nonac", products: [], notes: "" },
  ];
  const transactions = [
    { id: "tx-01", type: "session", description: "Table 02 · Session", customer: "Tanvir Hossain", amount: 600, method: "Cash", date: `${localDate()}T10:42:00`, tableId: "tbl-02" },
    { id: "tx-02", type: "sale", description: "Refreshments · 3 items", customer: "Nadia Islam", amount: 215, method: "bKash", date: `${localDate()}T09:28:00` },
    { id: "tx-03", type: "session", description: "Table 01 · Session", customer: "Walk-in guest", amount: 600, method: "Card", date: `${localDate()}T08:15:00`, tableId: "tbl-01" },
    { id: "tx-04", type: "session", description: "Table 02 · Session", customer: "Farhan Ahmed", amount: 480, method: "Cash", date: `${localDate()}T07:32:00`, tableId: "tbl-02" },
    { id: "tx-05", type: "sale", description: "Tea & snacks · 2 items", customer: "Arif Rahman", amount: 150, method: "Nagad", date: `${localDate(-1)}T20:10:00` }
  ];
  const expenses = [
    { id: "exp-01", title: "Electricity bill", category: "Electricity", amount: 850, date: localDate(), method: "Bank transfer", description: "Monthly utility", recordedBy: "Admin" },
    { id: "exp-02", title: "Staff refreshments", category: "Other", amount: 400, date: localDate(), method: "Cash", description: "", recordedBy: "Admin" },
    { id: "exp-03", title: "Cue tip replacement", category: "Maintenance", amount: 1250, date: localDate(-2), method: "Cash", description: "Table 1 and 3", recordedBy: "Manager" },
    { id: "exp-04", title: "Internet service", category: "Internet", amount: 1800, date: localDate(-4), method: "bKash", description: "Monthly broadband", recordedBy: "Admin" },
    { id: "exp-05", title: "Floor cleaning", category: "Cleaning", amount: 900, date: localDate(-8), method: "Cash", description: "", recordedBy: "Manager" }
  ];
  // Last month's payroll, paid on the 1st of this month and recorded as expenses.
  const paidOn = localDate(1 - new Date().getDate());
  const salaries = [
    ["sal-01", "stf-02", "Rafiq Chowdhury", "Manager", 28000, 2000, 0, 0, 0, "Bank transfer", "Weekend cover bonus"],
    ["sal-02", "stf-03", "Sumaiya Akter", "Cashier", 18000, 0, 1200, 500, 2000, "bKash", "Advance taken mid-month"]
  ].map(([id, staffId, staffName, role, base, bonus, overtime, deduction, advance, method, notes]) => ({
    id, staffId, staffName, role, month: monthISO(-1), base, bonus, overtime, deduction, advance,
    status: "Paid", paidOn, method, notes, expenseId: `exp-${id}`
  }));
  expenses.push(...salaries.map((r) => ({
    id: r.expenseId, title: `Salary · ${r.staffName}`, category: "Staff Salary", amount: r.base + r.bonus + r.overtime - r.deduction - r.advance,
    date: r.paidOn, method: r.method, description: `Payroll for ${r.month}`, recordedBy: "Admin", salaryId: r.id
  })));
  return {
    version: 1,
    settings: { clubName: "Green Pocket Snooker Club", address: "27 Lake Circus, Kalabagan, Dhaka", phone: "+880 1712-000 555", currency: "BDT", symbol: "৳", defaultRate: 250, defaultNonAcRate: 200, billingMode: "minute", singleGameMinutes: 15, arcadeCoinPrice: 15, minimumCharge: 0, theme: "dark", accent: "#1fdc8a", defaultCloth: "green" },
    tables, sessions, customers, products, transactions,
    arcade: { stock: 50, log: [] },
    users: defaultUsers(),
    productCategories: ["Soft Drinks", "Water", "Snacks", "Tea & Coffee", "Accessories"],
    bookings: [
      { id: "bok-01", customerId: "cus-001", tableId: "tbl-02", date: localDate(), start: "17:00", duration: 2, phone: "01712 345 678", status: "Confirmed", notes: "Corner table preferred" },
      { id: "bok-02", customerId: "cus-003", tableId: "tbl-02", date: localDate(), start: "19:30", duration: 1, phone: "01911 807 265", status: "Pending", notes: "" },
      { id: "bok-03", customerId: "cus-005", tableId: "tbl-03", date: localDate(1), start: "19:00", duration: 2, phone: "01521 941 380", status: "Confirmed", notes: "" },
      { id: "bok-04", customerId: "cus-004", tableId: "tbl-01", date: localDate(-1), start: "20:00", duration: 1, phone: "01677 562 104", status: "Completed", notes: "" }
    ],
    expenses,
    staff: [
      { id: "stf-01", name: "Mahmud Hasan", phone: "01710 888 210", username: "admin", role: "Owner", status: "Active", joined: "2023-02-12", shift: "09:00 – 18:00", salary: 0 },
      { id: "stf-02", name: "Rafiq Chowdhury", phone: "01820 554 901", username: "rafiq", role: "Manager", status: "Active", joined: "2023-08-21", shift: "14:00 – 23:00", salary: 28000 },
      { id: "stf-03", name: "Sumaiya Akter", phone: "01931 406 172", username: "sumaiya", role: "Cashier", status: "Active", joined: "2024-01-08", shift: "16:00 – 00:00", salary: 18000 },
      { id: "stf-04", name: "Imran Ali", phone: "01681 700 342", username: "imran", role: "Staff", status: "Inactive", joined: "2023-06-14", shift: "09:00 – 18:00", salary: 14000 }
    ],
    salaries
  };
}

