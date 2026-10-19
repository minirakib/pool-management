/** Shared selectors and the error helper used by every action module. */

export const findTable = (s, id) => s.tables.find((t) => t.id === id);

export const tableSession = (s, table) => table && s.sessions.find((session) => session.tableId === table.id);

export const lowStockCount = (s) => s.products.filter((p) => p.stock <= p.threshold).length;

export const fail = (message) => { throw new Error(message); };
