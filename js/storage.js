import { createDemoState } from "./data.js";

const STORAGE_KEY = "cuecore.demo.v1";

export const repository = {
  load() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const initial = createDemoState();
      this.save(initial);
      return initial;
    }
    try {
      const parsed = JSON.parse(saved);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tables)) throw new Error("Unsupported saved demo data");
      return parsed;
    } catch (error) {
      console.error("CUECORE could not read saved demo data.", error);
      throw new Error("Saved demo data could not be loaded. Use Reset demo data to restore a clean sample.");
    }
  },
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("CUECORE could not save demo data.", error);
      throw new Error("Demo data could not be saved. Check available browser storage.");
    }
  },
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return this.load();
  },
  getTables(state) { return state.tables; },
  saveTable(state, table) {
    const index = state.tables.findIndex((entry) => entry.id === table.id);
    if (index < 0) state.tables.push(table);
    else state.tables[index] = table;
    this.save(state);
  },
  getCustomers(state) { return state.customers; },
  saveCustomer(state, customer) {
    const index = state.customers.findIndex((entry) => entry.id === customer.id);
    if (index < 0) state.customers.push(customer);
    else state.customers[index] = customer;
    this.save(state);
  },
  getTransactions(state) { return state.transactions; },
  saveExpense(state, expense) {
    const index = state.expenses.findIndex((entry) => entry.id === expense.id);
    if (index < 0) state.expenses.push(expense);
    else state.expenses[index] = expense;
    this.save(state);
  }
};
