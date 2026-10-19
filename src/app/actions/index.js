/**
 * Business operations, one module per area. Each function mutates a *draft copy* of state
 * (the store clones before calling) and throws an Error with a user-facing message when the
 * operation is not allowed. Components call them through run(action, ...args) or perform(...).
 */
export * from "./helpers.js";
export * from "./tables.js";
export * from "./customers.js";
export * from "./bookings.js";
export * from "./expenses.js";
export * from "./inventory.js";
export * from "./staff.js";
export * from "./pos.js";
export * from "./users.js";
export * from "./arcade.js";
export * from "./settings.js";
export * from "./salary.js";
export * from "./records.js";
