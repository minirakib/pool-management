/**
 * Every page in one place: its URL, title, sidebar entry, who may open it and how it loads.
 * To add a page: create src/features/<name>/<Name>Page.jsx and add one entry here.
 *
 *   id      URL slug and page key (setPage("arcade"), /arcade). "tables" is the home page (/).
 *   group   Sidebar section. menu: groups several pages under one sidebar parent (see MENUS).
 *   access  "user": Admin and User may open it. "admin": Admin only.
 *   search  The topbar search box filters this page.
 *   load    Lazy import, so a page's code downloads on first visit (Tables ships in the main bundle).
 */
export const ROUTES = [
  { id: "tables", title: "Tables", icon: "table", group: "Arena", access: "user", search: true },
  { id: "bookings", title: "Bookings", icon: "calendar", group: "Arena", access: "user", search: true, load: () => import("@/features/bookings/BookingsPage.jsx") },

  { id: "pos", title: "POS Sales", icon: "cart", group: "Counter", menu: "pos", access: "user", search: true, load: () => import("@/features/pos/PosSalesPage.jsx") },
  { id: "pos-tables", title: "POS Table", icon: "table", group: "Counter", menu: "pos", access: "user", load: () => import("@/features/pos/PosTablesPage.jsx") },
  { id: "arcade", title: "Arcade", icon: "coin", group: "Counter", access: "user", load: () => import("@/features/arcade/ArcadePage.jsx") },
  { id: "inventory", title: "Inventory", icon: "box", group: "Counter", access: "admin", search: true, load: () => import("@/features/inventory/InventoryPage.jsx") },
  { id: "expenses", title: "Expenses", icon: "wallet", group: "Counter", access: "admin", search: true, load: () => import("@/features/expenses/ExpensesPage.jsx") },

  { id: "customers", title: "Customers", icon: "users", group: "Club", access: "admin", search: true, load: () => import("@/features/customers/CustomersPage.jsx") },
  { id: "staff", title: "Staff", icon: "badge", group: "Club", access: "admin", search: true, load: () => import("@/features/staff/StaffPage.jsx") },
  { id: "salary", title: "Salary", icon: "cash", group: "Club", access: "admin", search: true, load: () => import("@/features/salary/SalaryPage.jsx") },
  { id: "reports", title: "Reports", icon: "chart", group: "Club", access: "admin", load: () => import("@/features/reports/ReportsPage.jsx") },
  { id: "settings", title: "Settings", icon: "settings", group: "Club", access: "admin", load: () => import("@/features/settings/SettingsPage.jsx") }
];

/** Sidebar parents for pages that share a `menu`; clicking the parent opens its first page. */
export const MENUS = { pos: { title: "POS", icon: "receipt" } };

export const HOME = "tables";
const byId = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
export const routeOf = (id) => byId[id];
export const pageNames = Object.fromEntries(ROUTES.map((r) => [r.id, r.title]));

export const canAccess = (role, page) => !!byId[page] && (role === "admin" || (role === "user" && byId[page].access === "user"));

/** Each page has its own URL so a reload or shared link opens it; netlify.toml rewrites these to index.html. */
export const pathFor = (page) => (page === HOME ? "/" : `/${page}`);
export const pageFromPath = () => {
  const slug = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  return byId[slug] ? slug : HOME;
};

/** Sidebar structure: [[group, [route | { menu, title, icon, children }]]], keeping ROUTES order. */
export function navGroups(role) {
  const groups = new Map();
  for (const route of ROUTES) {
    if (!canAccess(role, route.id)) continue;
    const items = groups.get(route.group) || groups.set(route.group, []).get(route.group);
    if (!route.menu) { items.push(route); continue; }
    let parent = items.find((item) => item.menu === route.menu);
    if (!parent) items.push(parent = { menu: route.menu, ...MENUS[route.menu], children: [] });
    parent.children.push(route);
  }
  return [...groups];
}
