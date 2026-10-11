import { repository } from "./storage.js";
import { categories, expenseCategories, paymentMethods, productCategories } from "./data.js";
import { billableMilliseconds, customerName, dashboardMetrics, monthlyExpense, sessionBreakdown } from "./domain.js";
import { $, $$, avatar, csvDownload, dateLabel, durationLabel, emptyState, escapeHTML as e, field, icon, money, option, selectField, shortDate, statusPill, textareaField, timeLabel, todayISO, uid } from "./utils.js";

let state;
try { state = repository.load(); }
catch (error) {
  document.body.innerHTML = `<main style="max-width:620px;margin:12vh auto;padding:24px;color:#f3f7f4;font:14px Segoe UI,Arial;background:#1b241f;border:1px solid #2a362e;border-radius:12px"><h1>CUECORE could not open saved demo data</h1><p>${e(error.message)}</p><button onclick="localStorage.removeItem('cuecore.demo.v1');location.reload()">Reset demo data</button></main>`;
  throw error;
}

const pageNames = {
  dashboard: "Dashboard", tables: "Tables", bookings: "Bookings", customers: "Customers",
  pos: "Billing & POS", inventory: "Inventory", expenses: "Expenses", reports: "Reports",
  staff: "Staff", settings: "Settings"
};
const navGroups = [
  ["Arena", [["dashboard", "dashboard", "Dashboard"], ["tables", "table", "Tables"], ["bookings", "calendar", "Bookings"]]],
  ["Counter", [["pos", "receipt", "Billing & POS"], ["inventory", "box", "Inventory"], ["expenses", "wallet", "Expenses"]]],
  ["Club", [["customers", "users", "Customers"], ["staff", "badge", "Staff"], ["reports", "chart", "Reports"], ["settings", "settings", "Settings"]]]
];
const legacyAccents = { "#16a36a": "#1fdc8a", "#4d8fe8": "#3da9ff", "#a56ce0": "#b47cff", "#d58b36": "#ffb23e" };
const accentOptions = ["#1fdc8a", "#3da9ff", "#b47cff", "#ffb23e"];
const accentNames = { "#1fdc8a": "Neon green", "#3da9ff": "Arcade blue", "#b47cff": "Ultra violet", "#ffb23e": "Gold rush" };
const currentAccent = () => legacyAccents[state.settings.accent] || state.settings.accent || accentOptions[0];
const tableNumber = (table) => (table.name.match(/\d+/)?.[0] || table.name.slice(0, 2)).padStart(2, "0");
const greeting = () => { const hour = new Date().getHours(); return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"; };
const ballLayout = [["red",75,50],["red",77.9,46.7],["red",77.9,53.3],["red",80.8,43.4],["red",80.8,50],["red",80.8,56.6],["pink",71.4,50],["black",91,50],["blue",50,50],["green",24,33],["brown",24,50],["yellow",24,67],["white",16.5,42]];
const withAlpha = (hex, alpha) => { const match = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!match) return `rgba(31,220,138,${alpha})`; const n = parseInt(match[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`; };
let currentPage = "dashboard";
let tableStatusFilter = "All Tables";
let categoryFilter = "All";
let tableView = "grid";
let customerSearch = "";
let customerMembershipFilter = "All memberships";
let bookingStatusFilter = "All statuses";
let bookingSearch = "";
let bookingDateFilter = todayISO();
let bookingTableFilter = "All tables";
let bookingView = "list";
let expenseSearch = "";
let expenseCategoryFilter = "All categories";
let inventorySearch = "";
let inventoryCategoryFilter = "All";
let productCategoryFilter = "All";
let productSearch = "";
let tableSearch = "";
let reportPeriod = "7 Days";
let reportFrom = "";
let reportTo = "";
let globalSearch = "";
let cart = [];
let activeModal = null;
let modalReturnFocus = null;
let chartInstance = null;
let toastCounter = 0;
let pendingConfirmation = null;

const main = $("#main-content");
const sidebar = $("#sidebar");
const topbar = $("#topbar");
const modalRoot = $("#modal-root");

function persist() {
  try { repository.save(state); }
  catch (error) { notify(error.message, "error", "Save failed"); throw error; }
}
function notify(message, type = "success", title = type === "success" ? "Saved" : "Notice") {
  const id = `toast-${++toastCounter}`;
  const mark = { success: "✓", warning: "!", error: "×", info: "i" }[type] || "i";
  $("#toast-region").insertAdjacentHTML("beforeend", `<div id="${id}" class="toast ${e(type)}" role="status"><span class="toast-mark">${mark}</span><div><strong>${e(title)}</strong><p>${e(message)}</p></div><button class="toast-close" data-action="dismiss-toast" data-id="${id}" aria-label="Dismiss">×</button></div>`);
  window.setTimeout(() => document.getElementById(id)?.remove(), 4200);
}
function drawShell() {
  const accent = currentAccent();
  const dark = state.settings.theme !== "light";
  const live = state.sessions.filter((session) => !session.pausedAt).length;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.setProperty("--color-primary", accent);
  document.documentElement.style.setProperty("--color-primary-hover", accent);
  sidebar.innerHTML = `
    <div class="brand-row"><div class="brand-mark"><span>C</span></div><div class="brand-copy"><div class="brand-name">CUE<b>CORE</b></div><div class="brand-caption">Club operations</div></div><button class="icon-button nav-close" data-action="close-nav" aria-label="Close navigation">${icon("x")}</button></div>
    <div class="club-switcher"><div class="club-avatar">${icon("trophy")}</div><div class="club-copy"><strong>${e(state.settings.clubName)}</strong><span>Dhaka · Main club</span></div></div>
    <nav class="nav-list">${navGroups.map(([group, items]) => `<div class="nav-caption">${group}</div>${items.map(([id, glyph, title]) => `<button class="nav-item ${currentPage === id ? "active" : ""}" data-page="${id}" title="${e(title)}" aria-current="${currentPage === id ? "page" : "false"}"><span class="nav-icon">${icon(glyph)}</span><span class="nav-label">${e(title)}</span>${id === "inventory" && lowStockCount() ? `<span class="nav-count">${lowStockCount()}</span>` : ""}</button>`).join("")}`).join("")}</nav>
    <div class="sidebar-spacer"></div><div class="sidebar-bottom">
      <div class="profile-row">${avatar("Mahmud Hasan")}<div class="profile-copy"><strong>Mahmud Hasan</strong><span>Signed in locally</span></div><span class="role-badge">Owner</span></div>
      <div class="sidebar-actions"><button class="button button-sm" data-action="theme-toggle" title="Switch theme">${icon(dark ? "sun" : "moon")}<span class="collapse-text">${dark ? "Light mode" : "Dark mode"}</span></button><button class="button button-sm collapse-sidebar-btn" data-action="collapse-sidebar" title="Collapse sidebar" aria-label="Collapse sidebar">${icon("collapse", "collapse-icon")}</button></div>
    </div>`;
  topbar.innerHTML = `
    <div class="topbar-title"><button class="icon-button nav-toggle" data-action="toggle-nav" aria-label="Open navigation">${icon("menu")}</button><div><span class="topbar-crumb">${e(state.settings.clubName)}</span><strong>${pageNames[currentPage]}</strong></div></div>
    <div class="topbar-actions">${live ? `<span class="live-chip" title="Tables currently in play"><i></i>${live} live</span>` : ""}<span class="top-date">${dateLabel()}</span>
      <label class="search-box top-search"><span class="search-icon">${icon("search")}</span><input aria-label="Search current page" placeholder="Search this page…" data-global-search></label>
      <button class="icon-button" data-action="notifications" aria-label="Notifications">${icon("bell")}<i class="dot"></i></button>
      <div class="menu-anchor"><button class="button button-primary quick-button" data-action="quick-menu" aria-expanded="false" aria-label="Quick actions">${icon("bolt")}<span class="quick-label">Quick action</span>${icon("chevron-down", "quick-chevron")}</button><div class="menu-popover" data-menu hidden>
        <button data-action="quick-start">${icon("play")} Start a table</button><button data-action="quick-customer">${icon("user")} Add customer</button><button data-action="quick-booking">${icon("calendar")} Create booking</button><button data-action="quick-expense">${icon("wallet")} Add expense</button><button data-action="quick-sale">${icon("receipt")} New sale</button>
      </div></div>
      <button class="user-button" data-action="profile-menu" aria-label="Staff profile">${avatar("Mahmud Hasan")}<span class="user-name">Admin</span>${icon("chevron-down", "chevron")}</button>
    </div>`;
}
function lowStockCount() { return state.products.filter((product) => product.stock <= product.threshold).length; }
function render() {
  drawShell();
  const renderers = { dashboard: renderDashboard, tables: renderTables, bookings: renderBookings, customers: renderCustomers, pos: renderPOS, inventory: renderInventory, expenses: renderExpenses, reports: renderReports, staff: renderStaff, settings: renderSettings };
  if(chartInstance){chartInstance.destroy();chartInstance=null;}
  main.innerHTML = renderers[currentPage]();
  const globalSearchInput = $("[data-global-search]", topbar);
  if (globalSearchInput) globalSearchInput.value = globalSearch;
  updateTimers();
  if (currentPage === "dashboard" || currentPage === "reports") drawCharts();
}

function heading(title, subtitle, buttons = "") {
  return `<div class="page-heading"><div><h1>${e(title)}</h1><p>${e(subtitle)}</p></div><div class="heading-actions">${buttons}</div></div>`;
}
function tableArt() {
  return `<div class="snooker-art" role="img" aria-label="Top-down snooker table illustration"><div class="table-inner"><span class="table-baulk"></span><span class="table-d"></span><i class="pocket tl"></i><i class="pocket tc"></i><i class="pocket tr"></i><i class="pocket bl"></i><i class="pocket bc"></i><i class="pocket br"></i>${ballLayout.map(([color, x, y]) => `<i class="ball ${color}" style="left:${x}%;top:${y}%"></i>`).join("")}</div></div>`;
}
function tableSession(table) { return state.sessions.find((session) => session.tableId === table.id); }
function tableCard(table, compact = false) {
  const session = tableSession(table);
  const customer = session ? customerName(state, session) : "";
  const bill = session ? sessionBreakdown(session, table, state.settings) : null;
  const duration = session ? billableMilliseconds(session) : 0;
  const mainLabel = table.status === "occupied" ? customer : table.status === "paused" ? "Session paused" : table.status === "maintenance" ? "Service required" : "Ready for a frame";
  if (compact) return `<article class="compact-table-row" data-status="${e(table.status)}"><div class="compact-ident"><div class="mini-art"><div class="table-inner"><i class="pocket tl"></i><i class="pocket tc"></i><i class="pocket tr"></i><i class="pocket bl"></i><i class="pocket bc"></i><i class="pocket br"></i></div></div><div><strong class="table-primary">${e(table.name)}</strong><span class="table-sub">${e(table.category)} · ${money(table.rate)}/hr</span></div></div><div>${statusPill(table.status)}<span class="table-sub">${e(mainLabel)}</span></div><div><strong class="table-primary">${session ? durationLabel(duration) : "—"}</strong><span class="table-sub">${session ? money(bill.total) : "No session"}</span></div><div class="table-sub">Rate ${money(table.rate)}/hour</div><div class="table-actions">${tableActionButtons(table)}</div></article>`;
  return `<article class="snooker-card" data-table-card="${e(table.id)}" data-status="${e(table.status)}">
    <div class="snooker-card-top"><span class="table-number">${e(tableNumber(table))}</span><div class="snooker-head"><div class="snooker-title">${e(table.name)}</div><div class="snooker-meta">${e(table.category)} · ${money(table.rate)}/hour</div></div>${statusPill(table.status)}</div>
    ${tableArt()}
    <div class="snooker-card-bottom"><div class="session-identity"><strong>${e(mainLabel)}</strong><span>${session ? `<span class="timer-text" data-timer="${e(session.id)}">${durationLabel(duration)}</span> · Started ${timeLabel(session.originalStartedAt || session.startedAt)}</span>` : table.status === "available" ? "Available now" : "Temporarily out of play"}</span></div><div class="table-charge"><strong ${session?`data-live-total="${e(session.id)}"`:""}>${session ? money(bill.total) : money(table.rate)}</strong><span>${session ? "current bill" : "per hour"}</span></div></div>
    <div class="snooker-actions">${tableActionButtons(table)}</div>
  </article>`;
}
function tableActionButtons(table) {
  if (table.status === "available") return `<button class="button button-primary button-sm" data-action="start-session" data-id="${e(table.id)}">${icon("play")}Start game</button><button class="button button-sm" data-action="table-details" data-id="${e(table.id)}">Details</button><button class="icon-button" data-action="edit-table" data-id="${e(table.id)}" aria-label="Edit table">${icon("more")}</button>`;
  if (table.status === "maintenance") return `<button class="button button-sm" data-action="table-details" data-id="${e(table.id)}">Details</button><button class="button button-sm" data-action="edit-table" data-id="${e(table.id)}">Edit</button><button class="button button-sm" data-action="release-maintenance" data-id="${e(table.id)}">${icon("check")}Set available</button>`;
  return `<button class="button button-sm" data-action="session-details" data-id="${e(table.id)}">Details</button>${table.status === "paused" ? `<button class="button button-primary button-sm" data-action="resume-session" data-id="${e(table.id)}">${icon("play")}Resume</button>` : `<button class="button button-sm" data-action="pause-session" data-id="${e(table.id)}">${icon("pause")}Pause</button>`}<button class="button button-sm button-danger" data-action="end-session" data-id="${e(table.id)}">${icon("stop")}End</button>`;
}
function renderDashboard() {
  const metrics = dashboardMetrics(state);
  const cards = [
    ["Total tables", metrics.tables, "table", "Across all table categories", "var(--color-info)"],
    ["Active sessions", metrics.active, "target", `${metrics.paused} paused · live now`, "var(--color-success)"],
    ["Available tables", metrics.available, "check", `${metrics.maintenance} in maintenance`, "var(--color-primary)"],
    ["Today's revenue", money(metrics.revenue), "coin", "Settled + live estimates", "var(--color-gold)"],
    ["Today's expenses", money(metrics.expenses), "trend-down", "Recorded today", "var(--color-danger)"],
    ["Today's net profit", money(metrics.profit), "trend-up", "Revenue less expenses", "var(--color-primary)"]
  ];
  const trans = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const activities = [
    ...state.sessions.slice(0, 3).map((session) => ({ title: `${customerName(state, session)} started play`, sub: state.tables.find((table) => table.id === session.tableId)?.name || "Table", icon: "target" })),
    { title: `${lowStockCount()} inventory items need attention`, sub: "Stock watch", icon: "box" },
    { title: `${state.bookings.filter((booking) => booking.date === todayISO() && booking.status === "Confirmed").length} confirmed bookings today`, sub: "Reservations", icon: "calendar" }
  ];
  return `<section class="welcome-row"><div><div class="eyebrow">Club overview · demo data</div><h1>${greeting()}, <span>Admin</span></h1><p>Here's what's happening at your club today.</p></div><div class="welcome-right"><span class="date-chip">${icon("clock")}${dateLabel()}</span><button class="button button-primary" data-action="quick-start">${icon("play")}New session</button></div></section>
    <section class="stat-grid">${cards.map(([label,value,glyph,foot,tone]) => `<article class="stat-card" style="--tone:${tone}"><div class="stat-head"><span>${label}</span><i class="stat-icon">${icon(glyph)}</i></div><div class="stat-value" ${label==="Today's revenue"?'data-dashboard-revenue':label==="Today's net profit"?'data-dashboard-profit':""}>${value}</div><div class="stat-foot">${foot}</div></article>`).join("")}</section>
    <section class="dashboard-grid">
      <article class="panel"><div class="panel-heading"><div><h2>Live table overview</h2><p>${metrics.active} playing · ${metrics.paused} paused · ${metrics.available} ready</p></div><button class="panel-link" data-page="tables">Manage tables ${icon("arrow-right")}</button></div>
        <div class="dashboard-table-grid">${state.tables.slice(0, 6).map((table) => `<div class="dashboard-table" data-status="${e(table.status)}" role="button" tabindex="0" data-action="table-details" data-id="${e(table.id)}"><div class="dashboard-table-label"><span class="snooker-title">${e(table.name)}</span>${statusPill(table.status)}</div>${tableArt()}<div class="snooker-meta">${tableSession(table) ? `<span data-timer="${e(tableSession(table).id)}" class="timer-text">${durationLabel(billableMilliseconds(tableSession(table)))}</span> · <span data-live-total="${e(tableSession(table).id)}">${money(sessionBreakdown(tableSession(table), table, state.settings).total)}</span>` : `${money(table.rate)}/hour · ${table.status === "available" ? "Ready to play" : table.status === "maintenance" ? "Maintenance" : "Paused"}`}</div></div>`).join("")}</div>
      </article>
      <article class="panel chart-panel"><div class="panel-heading"><div><h2>Revenue analytics</h2><p>Club revenue · indicative demo data</p></div><div class="segmented">${["Today","7 Days","30 Days"].map((period) => `<button class="${reportPeriod === period ? "active" : ""}" data-action="dashboard-period" data-period="${period}">${period}</button>`).join("")}</div></div><div class="chart-box" id="revenue-chart"></div><div class="analytics-strip"><div><span class="muted">Settled</span><strong class="table-primary">${money(metrics.settledRevenue)}</strong></div><div><span class="muted">In progress</span><strong class="table-primary">${money(metrics.revenue - metrics.settledRevenue)}</strong></div><div><span class="muted">Expense</span><strong class="table-primary">${money(metrics.expenses)}</strong></div><div><span class="muted">Margin</span><strong class="table-primary">${metrics.revenue ? Math.round(metrics.profit / metrics.revenue * 100) : 0}%</strong></div></div></article>
    </section>
    <section class="dashboard-lower">
      <article class="panel"><div class="panel-heading"><div><h2>Recent transactions</h2><p>Latest counter activity</p></div><button class="panel-link" data-page="pos">View billing ${icon("arrow-right")}</button></div><div class="transaction-list">${trans.length ? trans.map((item) => `<div class="transaction-row"><span class="transaction-icon ${item.type === "session" ? "" : "sale"}">${icon(item.type === "session" ? "table" : "receipt")}</span><div class="transaction-copy"><strong>${e(item.description)}</strong><span>${e(item.customer)} · ${timeLabel(item.date)}</span></div><span class="transaction-amount">${money(item.amount)}</span></div>`).join("") : emptyState("No transactions yet","Completed sessions and sales appear here.")}</div></article>
      <article class="panel"><div class="panel-heading"><div><h2>Recent activity</h2><p>What's happening around the club</p></div><span class="status-pill status-active">Live</span></div><div class="activity-list">${activities.map((item) => `<div class="activity-row"><span class="activity-dot">${icon(item.icon)}</span><div class="activity-copy"><strong>${e(item.title)}</strong><span>${e(item.sub)} · just now</span></div></div>`).join("")}</div></article>
    </section>
    <p class="note">Demo estimates use saved local data. Live session totals are not yet collected payments.</p>`;
}

function renderTables() {
  const filtered = state.tables.filter((table) => (tableStatusFilter === "All Tables" || table.status === tableStatusFilter.toLowerCase()) && (categoryFilter === "All" || table.category === categoryFilter) && `${table.name} ${table.category}`.toLowerCase().includes(tableSearch.toLowerCase()));
  const counts = dashboardMetrics(state);
  return `${heading("Table management", "Manage live play, table rates, and availability.", `<button class="button" data-action="export-tables">${icon("download")}Export CSV</button><button class="button button-primary" data-action="add-table">${icon("plus")}Add table</button>`)}
    <div class="analytics-strip"><div class="analytics-chip"><span>Total tables</span><strong>${counts.tables}</strong></div><div class="analytics-chip"><span>Active</span><strong>${counts.active}</strong></div><div class="analytics-chip"><span>Available</span><strong>${counts.available}</strong></div><div class="analytics-chip"><span>Paused / maintenance</span><strong>${counts.paused} / ${counts.maintenance}</strong></div></div>
    <div class="toolbar"><div class="filter-pills">${["All Tables","available","occupied","paused","maintenance"].map((filter) => `<button class="filter-pill ${tableStatusFilter.toLowerCase() === filter.toLowerCase() ? "active" : ""}" data-action="table-status-filter" data-value="${filter}">${filter === "All Tables" ? filter : filter[0].toUpperCase() + filter.slice(1)}</button>`).join("")}</div><div class="search-box"><span class="search-icon">${icon("search")}</span><input placeholder="Search tables…" data-filter="table-search" value="${e(tableSearch)}"></div><span class="toolbar-spacer"></span><select aria-label="Filter by category" data-change="table-category">${["All", ...categories].map((value) => option(value, categoryFilter)).join("")}</select><div class="segmented"><button class="${tableView === "grid" ? "active" : ""}" data-action="table-view" data-value="grid">${icon("grid")}Grid</button><button class="${tableView === "list" ? "active" : ""}" data-action="table-view" data-value="list">${icon("list")}List</button></div></div>
    ${filtered.length ? tableView === "grid" ? `<div class="table-grid">${filtered.map((table) => tableCard(table)).join("")}</div>` : `<div class="compact-table-list">${filtered.map((table) => tableCard(table, true)).join("")}</div>` : emptyState("No tables match these filters","Try another status or category.")}`;
}

function renderBookings() {
  const rows = [...state.bookings].filter((booking) => (bookingStatusFilter === "All statuses" || booking.status === bookingStatusFilter)
      && (!bookingDateFilter || booking.date === bookingDateFilter)
      && (bookingTableFilter === "All tables" || booking.tableId === state.tables.find((entry) => entry.name === bookingTableFilter)?.id)
      && `${state.customers.find((entry)=>entry.id===booking.customerId)?.name || ""} ${booking.phone} ${state.tables.find((entry)=>entry.id===booking.tableId)?.name || ""}`.toLowerCase().includes(bookingSearch.toLowerCase()))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  const customer = (id) => state.customers.find((entry) => entry.id === id)?.name || "Guest";
  const table = (id) => state.tables.find((entry) => entry.id === id)?.name || "Any table";
  const todayBookings = rows.filter((booking) => booking.date === todayISO());
  return `${heading("Bookings", "Reservations and daily table schedule.", `<button class="button button-primary" data-action="add-booking">${icon("plus")}New booking</button>`)}
    <div class="toolbar"><div class="search-box"><span class="search-icon">${icon("search")}</span><input data-filter="bookings-search" placeholder="Search customer or table…" value="${e(bookingSearch)}"></div>
      <input type="date" aria-label="Filter booking date" data-filter="bookings-date" value="${e(bookingDateFilter)}">
      <select aria-label="Booking status" data-change="booking-status">${["All statuses","Pending","Confirmed","Completed","Cancelled"].map((value) => option(value, bookingStatusFilter)).join("")}</select>
      <select aria-label="Filter booking table" data-change="booking-table">${["All tables", ...state.tables.map((entry) => entry.name)].map((value) => option(value, bookingTableFilter)).join("")}</select>
      <div class="segmented"><button class="${bookingView==="list"?"active":""}" data-action="booking-schedule" data-value="list">${icon("list")}List</button><button class="${bookingView==="schedule"?"active":""}" data-action="booking-schedule" data-value="schedule">${icon("calendar")}Schedule</button></div></div>
    <div class="two-col">
      <article class="panel" style="${bookingView==="schedule"?"display:none":""}"><div class="panel-heading"><div><h2>Reservations</h2><p>${rows.length} bookings found</p></div><div class="segmented"><button class="${bookingView==="list"?"active":""}" data-action="booking-schedule" data-value="list">List</button><button class="${bookingView==="schedule"?"active":""}" data-action="booking-schedule" data-value="schedule">Schedule</button></div></div>
        ${rows.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Table / date</th><th>Time</th><th>Status</th><th></th></tr></thead><tbody>${rows.map((booking) => `<tr><td><span class="table-primary">${e(customer(booking.customerId))}</span><span class="table-sub">${e(booking.phone)}</span></td><td>${e(table(booking.tableId))}<span class="table-sub">${shortDate(booking.date)} · ${booking.duration}h</span></td><td>${e(booking.start)}</td><td><button class="filter-pill" data-action="booking-status-cycle" data-id="${e(booking.id)}">${statusPill(booking.status)}</button></td><td><div class="table-actions"><button class="button button-sm" data-action="edit-booking" data-id="${e(booking.id)}">Edit</button><button class="icon-button" data-action="delete-booking" data-id="${e(booking.id)}" aria-label="Delete booking">${icon("x")}</button></div></td></tr>`).join("")}</tbody></table></div>` : emptyState("No bookings found","Create a booking or adjust your filters.",`<button class="button button-primary" data-action="add-booking">New booking</button>`)}
      </article>
      <article class="panel" style="${bookingView==="list"?"display:none":""}"><div class="panel-heading"><div><h2>Today's schedule</h2><p>${shortDate(todayISO())} · ${todayBookings.length} reservation${todayBookings.length === 1 ? "" : "s"}</p></div><span class="status-pill status-info">Local time</span></div>
        ${todayBookings.length ? `<div class="schedule-grid">${todayBookings.sort((a,b) => a.start.localeCompare(b.start)).map((booking) => `<div class="schedule-row"><div class="schedule-time">${e(booking.start)}</div><div class="schedule-slot"><strong>${e(customer(booking.customerId))} · ${e(table(booking.tableId))}</strong><span>${booking.duration} hour${booking.duration === 1 ? "" : "s"} · ${booking.status}</span></div></div>`).join("")}</div>` : emptyState("Nothing scheduled today","New bookings will appear in this schedule.")}</article>
    </div><p class="muted" style="margin-top:12px;font-size:12px">Confirmed bookings are checked for table/time overlap. Times use this device's local timezone.</p>`;
}

function renderCustomers() {
  const matches = state.customers.filter((customer) => `${customer.name} ${customer.phone} ${customer.email} ${customer.membership}`.toLowerCase().includes(customerSearch.toLowerCase()) && (customerMembershipFilter==="All memberships"||customer.membership===customerMembershipFilter));
  return `${heading("Customers", "Member profiles, balances, and play history.", `<button class="button" data-action="export-customers">${icon("download")}Export CSV</button><button class="button button-primary" data-action="add-customer">${icon("plus")}Add customer</button>`)}
    <div class="toolbar"><div class="search-box"><span class="search-icon">${icon("search")}</span><input placeholder="Search name, phone, email…" data-filter="customer-search" value="${e(customerSearch)}"></div><select aria-label="Filter membership" data-change="customer-membership">${["All memberships","Regular","Silver","Gold","VIP"].map((value) => option(value, customerMembershipFilter)).join("")}</select><span class="muted">${matches.length} customers</span></div>
    <article class="panel">${matches.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Membership</th><th>Sessions</th><th>Total spent</th><th>Balance</th><th>Registered</th><th></th></tr></thead><tbody>${matches.map((customer) => `<tr><td><span class="table-primary">${e(customer.name)}</span><span class="table-sub">${e(customer.phone)}${customer.email ? ` · ${e(customer.email)}` : ""}</span></td><td><span class="role-badge tier-${e(customer.membership.toLowerCase())}">${e(customer.membership)}</span></td><td>${customer.sessions}</td><td>${money(customer.spending)}</td><td class="${customer.balance ? "text-warning" : ""}">${money(customer.balance)}</td><td>${shortDate(customer.registered)}</td><td><div class="table-actions"><button class="button button-sm" data-action="view-customer" data-id="${e(customer.id)}">Profile</button><button class="button button-sm" data-action="edit-customer" data-id="${e(customer.id)}">Edit</button><button class="icon-button" data-action="delete-customer" data-id="${e(customer.id)}" aria-label="Delete customer">${icon("x")}</button></div></td></tr>`).join("")}</tbody></table></div>` : emptyState("No customers match","Try another name or add a new customer.",`<button class="button button-primary" data-action="add-customer">Add customer</button>`)}</article>`;
}

function renderPOS() {
  const products = state.products.filter((product) => (productCategoryFilter === "All" || product.category === productCategoryFilter) && `${product.name} ${product.sku}`.toLowerCase().includes(productSearch.toLowerCase()));
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const cartDiscount = Math.min(cartTotal,Math.max(0,Number($("#pos-cart-discount")?.value)||0));
  const payable = Math.max(0,Math.round(cartTotal-cartDiscount));
  const activeSessions = state.sessions.map((session) => ({ session, table: state.tables.find((entry) => entry.id === session.tableId) })).filter((entry) => entry.table);
  const recentTransactions=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  return `${heading("Billing & POS", "Live table bills and quick counter sales.", `<button class="button" data-action="go-inventory">Manage products</button>`)}
    <div class="toolbar"><div class="eyebrow">Active table sessions</div><span class="toolbar-spacer"></span><span class="muted">${activeSessions.length} live bill${activeSessions.length === 1 ? "" : "s"}</span></div>
    ${activeSessions.length ? `<div class="table-grid">${activeSessions.map(({session,table}) => { const bill=sessionBreakdown(session,table,state.settings); return `<article class="panel live-bill-card" data-status="${e(table.status)}"><div class="panel-heading"><div><h3>${e(table.name)} <span class="muted">· ${e(table.category)}</span></h3><p>${e(customerName(state,session))} · <span data-timer="${e(session.id)}" class="timer-text">${durationLabel(billableMilliseconds(session))}</span></p></div>${statusPill(table.status)}</div><div class="bill-current"><div><span>Table charge</span><strong data-live-table-charge="${e(session.id)}">${money(bill.tableCharge)}</strong></div><div><span>Products · ${session.products.reduce((n,item)=>n+item.qty,0)} items</span><strong>${money(bill.products)}</strong></div><div><span>Current total</span><strong data-live-total="${e(session.id)}">${money(bill.total)}</strong></div></div><div class="snooker-actions"><button class="button button-sm" data-action="session-details" data-id="${e(table.id)}">View bill</button><button class="button button-sm" data-action="add-to-session" data-id="${e(table.id)}">${icon("plus")}Add product</button><button class="button button-primary button-sm" data-action="end-session" data-id="${e(table.id)}">Close session</button></div></article>`; }).join("")}</div>` : `<article class="panel">${emptyState("No active table sessions","Start a game to track table time and products.",`<button class="button button-primary" data-action="quick-start">Start a table</button>`)}</article>`}
    <div class="section-heading"><div class="eyebrow">Counter sale</div><h2>Product catalog</h2></div>
    <div class="pos-layout"><section><div class="toolbar"><div class="search-box"><span class="search-icon">${icon("search")}</span><input placeholder="Search products…" data-filter="product-search" value="${e(productSearch)}"></div></div>
      <div class="category-bar">${["All",...productCategories].map((category) => `<button class="filter-pill ${productCategoryFilter===category?"active":""}" data-action="product-category" data-value="${e(category)}">${e(category)}</button>`).join("")}</div>
      ${products.length ? `<div class="product-grid">${products.map((product) => `<article class="product-card"><span class="product-glyph">${icon(product.category==="Water"?"droplet":product.category==="Tea & Coffee"?"cup":product.category==="Accessories"?"cue":product.category==="Snacks"?"cookie":"bottle")}</span><strong>${e(product.name)}</strong><span>${e(product.category)} · ${product.stock} in stock</span><div class="product-foot"><b>${money(product.price)}</b><button class="button button-sm button-primary" data-action="cart-add" data-id="${e(product.id)}" ${product.stock <= 0 ? "disabled" : ""}>${icon("plus")}Add</button></div></article>`).join("")}</div>` : emptyState("No products found","Search a different name or category.")}</section>
      <aside class="panel cart-panel"><div class="panel-heading"><div><h2>Sale cart</h2><p>${cart.reduce((sum,line)=>sum+line.qty,0)} items</p></div><button class="panel-link" data-action="cart-clear">Clear</button></div>
        ${cart.length ? cart.map((line) => `<div class="cart-line"><div class="cart-line-copy"><strong>${e(line.name)}</strong><span>${money(line.price)} each</span></div><div class="qty-control"><button data-action="cart-qty" data-id="${e(line.productId)}" data-step="-1" aria-label="Decrease quantity">−</button><span>${line.qty}</span><button data-action="cart-qty" data-id="${e(line.productId)}" data-step="1" aria-label="Increase quantity">+</button></div></div>`).join("") : emptyState("Cart is empty","Add items to create a counter sale.")}
        ${cart.length ? `<div class="cart-totals"><div class="cart-total-row"><span>Subtotal</span><strong data-cart-subtotal>${money(cartTotal)}</strong></div><label class="field"><span>Discount (BDT)</span><input id="pos-cart-discount" data-cart-discount type="number" min="0" max="${cartTotal}" step="1" value="${cartDiscount}"></label><div class="cart-total-row"><span>Discount</span><strong data-cart-discount-value>−${money(cartDiscount)}</strong></div><div class="cart-total-row final"><span>Total</span><strong data-cart-payable>${money(payable)}</strong></div><label class="field"><span>Payment method</span><select data-cart-payment>${paymentMethods.map((value)=>option(value,"Cash")).join("")}</select></label><button class="button button-primary" style="width:100%" data-action="complete-sale">Complete sale · <span data-cart-button-total>${money(payable)}</span></button></div>` : ""}
      </aside></div>
    <article class="panel" style="margin-top:16px"><div class="panel-heading"><div><h2>Recent transactions</h2><p>Saved local payments and counter sales</p></div><button class="panel-link" data-page="reports">Open reports ${icon("arrow-right")}</button></div>${recentTransactions.length?`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Transaction</th><th>Customer</th><th>Time</th><th>Payment</th><th>Amount</th><th></th></tr></thead><tbody>${recentTransactions.map((transaction)=>`<tr><td><span class="table-primary">${e(transaction.description)}</span><span class="table-sub">${transaction.type==="session"?"Table session":"Product sale"}</span></td><td>${e(transaction.customer)}</td><td>${shortDate(transaction.date.slice(0,10))} · ${timeLabel(transaction.date)}</td><td>${e(transaction.method)}</td><td class="table-primary">${money(transaction.amount)}</td><td><button class="button button-sm" data-action="print-transaction-receipt" data-id="${e(transaction.id)}">${icon("printer")}Print receipt</button></td></tr>`).join("")}</tbody></table></div>`:emptyState("No transactions yet","Completed sessions and sales will be listed here.")}</article>`;
}

function renderInventory() {
  const matches = state.products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(inventorySearch.toLowerCase()) && (inventoryCategoryFilter === "All" || product.category === inventoryCategoryFilter));
  const value = state.products.reduce((sum, product) => sum + product.stock * product.cost, 0);
  const low = state.products.filter((product) => product.stock > 0 && product.stock <= product.threshold).length;
  const out = state.products.filter((product) => product.stock === 0).length;
  return `${heading("Inventory", "Product catalog, stock levels, and reorder signals.", `<button class="button" data-action="export-inventory">${icon("download")}Export CSV</button><button class="button button-primary" data-action="add-product">${icon("plus")}Add product</button>`)}
    <div class="three-col" style="margin-bottom:15px"><div class="summary-card"><span>Total products</span><strong>${state.products.length}</strong><small>Across ${productCategories.length} categories</small></div><div class="summary-card"><span>Inventory value</span><strong>${money(value)}</strong><small>Based on cost price × stock</small></div><div class="summary-card"><span>Stock alerts</span><strong>${low} low · ${out} out</strong><small>Replenish before next shift</small></div></div>
    ${low || out ? `<article class="notification-item alert" style="margin-bottom:16px"><span>${icon("alert")}</span><div><strong>Stock needs attention</strong><span>${state.products.filter((product)=>product.stock<=product.threshold).map((product)=>e(product.name)).join(", ")}</span></div></article>` : ""}
    <div class="toolbar"><div class="search-box"><span class="search-icon">${icon("search")}</span><input placeholder="Search product or SKU…" data-filter="inventory-search" value="${e(inventorySearch)}"></div><select aria-label="Filter category" data-change="inventory-category">${["All",...productCategories].map((value)=>option(value,inventoryCategoryFilter)).join("")}</select><span class="muted">${matches.length} products</span></div>
    <article class="panel">${matches.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Cost</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>${matches.map((product)=>`<tr><td><span class="table-primary">${e(product.name)}</span><span class="table-sub">SKU ${e(product.sku)}</span></td><td>${e(product.category)}</td><td>${money(product.cost)}</td><td>${money(product.price)}</td><td><strong class="table-primary">${product.stock}</strong><span class="table-sub">Alert at ${product.threshold}</span></td><td>${statusPill(product.stock===0?"Out of stock":product.stock<=product.threshold?"Low stock":"In stock")}</td><td><div class="table-actions"><button class="button button-sm" data-action="adjust-stock" data-id="${e(product.id)}">Adjust</button><button class="button button-sm" data-action="edit-product" data-id="${e(product.id)}">Edit</button><button class="icon-button" data-action="delete-product" data-id="${e(product.id)}" aria-label="Delete product">${icon("x")}</button></div></td></tr>`).join("")}</tbody></table></div>`:emptyState("No products found","Adjust the filters or add a product.",`<button class="button button-primary" data-action="add-product">Add product</button>`)}</article>`;
}

function renderExpenses() {
  const today = state.expenses.filter((expense) => expense.date === todayISO()).reduce((sum, expense) => sum + expense.amount, 0);
  const month = monthlyExpense(state);
  const categories = expenseCategories.map((category) => ({ category, amount: state.expenses.filter((entry) => entry.category === category).reduce((sum, entry) => sum + entry.amount, 0) })).filter((entry) => entry.amount).sort((a,b) => b.amount-a.amount);
  const rows = [...state.expenses].filter((expense) => `${expense.title} ${expense.category} ${expense.description}`.toLowerCase().includes(expenseSearch.toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date));
  return `${heading("Expenses", "Track club operating costs and protect your margins.", `<button class="button" data-action="export-expenses">${icon("download")}Export CSV</button><button class="button button-primary" data-action="add-expense">${icon("plus")}Record expense</button>`)}
    <div class="three-col" style="margin-bottom:14px"><div class="summary-card"><span>Today's expenses</span><strong>${money(today)}</strong><small>Recorded for ${shortDate(todayISO())}</small></div><div class="summary-card"><span>This month's expenses</span><strong>${money(month)}</strong><small>From saved expense records</small></div><div class="summary-card"><span>Expense entries</span><strong>${state.expenses.length}</strong><small>${categories.length} categories in use</small></div></div>
    <div class="two-col"><article class="panel"><div class="panel-heading"><div><h2>Expense categories</h2><p>Recorded total by category</p></div></div>${categories.length ? categories.slice(0,6).map((entry)=>`<div class="settings-row"><div><strong>${e(entry.category)}</strong><span>${state.expenses.filter((item)=>item.category===entry.category).length} entries</span></div><strong>${money(entry.amount)}</strong></div>`).join("") : emptyState("No categories yet","Add an expense to start tracking.")}</article>
      <article class="panel"><div class="panel-heading"><div><h2>Recent expenses</h2><p>Latest cost records</p></div></div><div class="toolbar"><div class="search-box"><span class="search-icon">${icon("search")}</span><input placeholder="Search expenses…" data-filter="expense-search" value="${e(expenseSearch)}"></div><select aria-label="Filter expense category" data-change="expense-category">${["All categories",...expenseCategories].map((value)=>option(value,expenseCategoryFilter)).join("")}</select></div>
      ${rows.filter((entry)=>expenseCategoryFilter==="All categories"||entry.category===expenseCategoryFilter).length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Expense</th><th>Date</th><th>Method</th><th>Amount</th><th></th></tr></thead><tbody>${rows.filter((entry)=>expenseCategoryFilter==="All categories"||entry.category===expenseCategoryFilter).map((expense)=>`<tr><td><span class="table-primary">${e(expense.title)}</span><span class="table-sub">${e(expense.category)}</span></td><td>${shortDate(expense.date)}</td><td>${e(expense.method)}</td><td class="table-primary">${money(expense.amount)}</td><td><div class="table-actions"><button class="button button-sm" data-action="edit-expense" data-id="${e(expense.id)}">Edit</button><button class="icon-button" data-action="delete-expense" data-id="${e(expense.id)}" aria-label="Delete expense">${icon("x")}</button></div></td></tr>`).join("")}</tbody></table></div>`:emptyState("No expenses found","Try changing your search or category.")}</article></div>`;
}

function reportDateBounds() {
  if(reportFrom||reportTo)return {from:reportFrom,to:reportTo};
  const today=new Date();
  const to=toISODate(today);
  if(reportPeriod==="Today")return {from:to,to};
  today.setDate(today.getDate()-(reportPeriod==="30 Days"?29:6));
  return {from:toISODate(today),to};
}
function renderReports() {
  const range=reportDateBounds();
  const all = [...state.transactions].sort((a,b)=>a.date.localeCompare(b.date));
  const filtered = all.filter((transaction)=> (!range.from || transaction.date.slice(0,10)>=range.from) && (!range.to || transaction.date.slice(0,10)<=range.to));
  const revenue = filtered.reduce((sum,entry)=>sum+(entry.revenueAmount??entry.amount),0);
  const expenses = state.expenses.filter((entry)=>(!range.from||entry.date>=range.from)&&(!range.to||entry.date<=range.to)).reduce((sum,entry)=>sum+entry.amount,0);
  const payments = paymentMethods.map((method)=>({method,amount:filtered.filter((entry)=>entry.method===method).reduce((sum,entry)=>sum+entry.amount,0)})).filter((entry)=>entry.amount);
  const customerTotals = state.customers.map((customer)=>({customer,amount:filtered.filter((entry)=>entry.customer===customer.name).reduce((sum,entry)=>sum+(entry.revenueAmount??entry.amount),0)})).filter((entry)=>entry.amount).sort((a,b)=>b.amount-a.amount).slice(0,5);
  const tableTotals = state.tables.map((table)=>({table,amount:filtered.filter((entry)=>entry.tableId===table.id).reduce((sum,entry)=>sum+(entry.revenueAmount??entry.amount),0)})).filter((entry)=>entry.amount).sort((a,b)=>b.amount-a.amount).slice(0,5);
  const soldProducts=new Map();
  filtered.filter((transaction)=>transaction.type==="sale").forEach((transaction)=>transaction.receipt?.products?.forEach((item)=>{
    const current=soldProducts.get(item.name)||{qty:0,amount:0};
    current.qty+=item.qty;current.amount+=item.qty*item.price;soldProducts.set(item.name,current);
  }));
  const peakHours=new Map();
  [...state.sessions.filter((session)=>{const date=toISODate(new Date(session.originalStartedAt||session.startedAt));return (!range.from||date>=range.from)&&(!range.to||date<=range.to);}).map((session)=>session.originalStartedAt||session.startedAt),...filtered.filter((transaction)=>transaction.type==="session").map((transaction)=>transaction.receipt?.startedAt).filter(Boolean)].forEach((timestamp)=>{
    const hour=new Date(timestamp).getHours();
    peakHours.set(hour,(peakHours.get(hour)||0)+1);
  });
  const rangeText = reportFrom || reportTo ? `${reportFrom||"All time"} — ${reportTo||"Today"}` : reportPeriod;
  return `${heading("Reports & analytics", "Operational insight from saved demo transactions only.", `<button class="button" data-action="export-report">${icon("download")}Export CSV</button>`)}
    <div class="toolbar"><div class="filter-pills">${["Today","7 Days","30 Days"].map((period)=>`<button class="filter-pill ${reportPeriod===period?"active":""}" data-action="report-period" data-period="${period}">${period}</button>`).join("")}</div><span class="muted">Custom range</span><input type="date" aria-label="From date" data-filter="report-from" value="${e(reportFrom)}"><input type="date" aria-label="To date" data-filter="report-to" value="${e(reportTo)}"><button class="button button-sm" data-action="clear-report-range">Clear</button></div>
    <p class="muted" style="font-size:12px;margin:-5px 0 12px">Range: ${e(rangeText)} · ${filtered.length} saved sales/session records. Historical periods with no demo transactions are not fabricated.</p>
    <div class="analytics-strip"><div class="analytics-chip"><span>Recorded revenue</span><strong>${money(revenue)}</strong></div><div class="analytics-chip"><span>Expenses in range</span><strong>${money(expenses)}</strong></div><div class="analytics-chip"><span>Net recorded</span><strong>${money(revenue-expenses)}</strong></div><div class="analytics-chip"><span>Table utilization now</span><strong>${state.tables.length?Math.round(state.tables.filter((table)=>["occupied","paused"].includes(table.status)).length/state.tables.length*100):0}%</strong></div></div>
    <div class="dashboard-grid"><article class="panel chart-panel"><div class="panel-heading"><div><h2>Revenue trend</h2><p>Settled demo transactions</p></div></div><div class="chart-box" id="revenue-chart"></div></article><article class="panel"><div class="panel-heading"><div><h2>Revenue by payment method</h2><p>Selected date range</p></div></div>${payments.length?payments.map((entry)=>`<div class="settings-row"><div><strong>${e(entry.method)}</strong><span>${filtered.filter((transaction)=>transaction.method===entry.method).length} transactions</span></div><strong>${money(entry.amount)}</strong></div>`).join(""):emptyState("No payment records","Completed transactions in this range appear here.")}</article></div>
    <div class="two-col" style="margin-top:14px"><article class="panel"><div class="panel-heading"><div><h2>Revenue by table</h2><p>Saved table-session transactions</p></div></div>${tableTotals.length?tableTotals.map(({table,amount})=>`<div class="settings-row"><div><strong>${e(table.name)}</strong><span>${e(table.category)}</span></div><strong>${money(amount)}</strong></div>`).join(""):emptyState("No table revenue","End a session to create a saved record.")}</article>
      <article class="panel"><div class="panel-heading"><div><h2>Top customers</h2><p>By recorded spend in range</p></div></div>${customerTotals.length?customerTotals.map(({customer,amount})=>`<div class="settings-row"><div><strong>${e(customer.name)}</strong><span>${customer.membership} member</span></div><strong>${money(amount)}</strong></div>`).join(""):emptyState("No customer activity","Transaction history is shown when a customer is selected.")}</article></div>
    <div class="two-col" style="margin-top:14px"><article class="panel"><div class="panel-heading"><div><h2>Product sales</h2><p>Completed counter sales in the selected range</p></div></div><div class="settings-row"><div><strong>Standalone counter sales</strong><span>${filtered.filter((entry)=>entry.type==="sale").length} completed sales</span></div><strong>${money(filtered.filter((entry)=>entry.type==="sale").reduce((sum,entry)=>sum+entry.amount,0))}</strong></div>${soldProducts.size?[...soldProducts.entries()].sort((a,b)=>b[1].qty-a[1].qty).slice(0,5).map(([name,data])=>`<div class="settings-row"><div><strong>${e(name)}</strong><span>${data.qty} units sold</span></div><strong>${money(data.amount)}</strong></div>`).join(""):`<p class="muted" style="font-size:12px;margin:9px 0 0">Sample transactions include sales totals only; item-level history is recorded for new demo sales.</p>`}</article><article class="panel"><div class="panel-heading"><div><h2>Peak usage hours</h2><p>Observed session starts only · no synthetic history</p></div></div>${peakHours.size?[...peakHours.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([hour,count])=>`<div class="settings-row"><div><strong>${String(hour).padStart(2,"0")}:00 – ${String((hour+1)%24).padStart(2,"0")}:00</strong><span>${count} recorded session start${count===1?"":"s"}</span></div><strong>${count}</strong></div>`).join(""):emptyState("No session start history","Usage-hour trends appear as sessions are saved.")}</article></div>`;
}

function renderStaff() {
  const search = ($("#staff-search")?.value || "").toLowerCase();
  const rows = state.staff.filter((member)=>`${member.name} ${member.username} ${member.role} ${member.phone}`.toLowerCase().includes(search));
  return `${heading("Staff", "Team directory and shift overview. Role labels are informational only in this demo.", `<button class="button button-primary" data-action="add-staff">${icon("plus")}Add staff</button>`)}
    <div class="toolbar"><div class="search-box"><span class="search-icon">${icon("search")}</span><input id="staff-search" placeholder="Search staff…" value="${e(search)}"></div><span class="muted">${state.staff.filter((member)=>member.status==="Active").length} active team members</span></div>
    <article class="panel">${rows.length?`<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Team member</th><th>Role</th><th>Status</th><th>Shift</th><th>Joined</th><th></th></tr></thead><tbody>${rows.map((member)=>`<tr><td><div style="display:flex;align-items:center;gap:8px">${avatar(member.name)}<div><span class="table-primary">${e(member.name)}</span><span class="table-sub">@${e(member.username)} · ${e(member.phone)}</span></div></div></td><td><span class="role-badge">${e(member.role)}</span></td><td>${statusPill(member.status)}</td><td>${e(member.shift)}</td><td>${shortDate(member.joined)}</td><td><div class="table-actions"><button class="button button-sm" data-action="edit-staff" data-id="${e(member.id)}">Edit</button><button class="button button-sm" data-action="staff-status" data-id="${e(member.id)}">${member.status==="Active"?"Deactivate":"Activate"}</button><button class="icon-button" data-action="delete-staff" data-id="${e(member.id)}" aria-label="Remove staff">${icon("x")}</button></div></td></tr>`).join("")}</tbody></table></div>`:emptyState("No staff found","Try a different search term.")}</article>
    <p class="muted" style="font-size:12px;margin-top:11px">This local frontend does not provide sign-in, access control, or multi-user synchronization. Add real permissions with the future Python service.</p>`;
}

function renderSettings() {
  return `${heading("Settings", "Configure your club's local demo experience.", `<span class="status-pill status-active">Saved locally</span>`)}
    <div class="two-col">
      <article class="panel settings-section"><h2>Club profile</h2><form id="settings-form" class="form-grid">
        ${field("Club name","clubName",state.settings.clubName,"text","required")}${field("Phone number","phone",state.settings.phone,"tel")}
        ${field("Address","address",state.settings.address,"text")}
        ${field("Default hourly rate","defaultRate",state.settings.defaultRate,"number",'min="0" step="1" required')}
        ${selectField("Default billing mode","billingMode",["minute","hour"],state.settings.billingMode)}
        ${field("Minimum charge","minimumCharge",state.settings.minimumCharge,"number",'min="0" step="1"')}
        ${selectField("Appearance","theme",["dark","light"],state.settings.theme)}
        <label class="field"><span>Accent color</span><select name="accent">${accentOptions.map((value)=>`<option value="${value}" ${value===currentAccent()?"selected":""}>${accentNames[value]}</option>`).join("")}</select></label>
        <div class="field"><span>Currency</span><input value="BDT · ৳ Bangladeshi Taka" disabled></div>
        <div class="field field-wide"><span>Branding</span><div class="profile-hero"><div class="brand-mark"><span>C</span></div><div><strong class="brand-name">CUE<b>CORE</b></strong><span class="muted" style="display:block;font-size:12px">Logo placeholder · replaceable in desktop packaging</span></div></div></div>
        <div class="field field-wide"><button class="button button-primary" type="submit">Save settings</button></div>
      </form></article>
      <div>
        <article class="panel settings-section"><h2>Table categories & rates</h2><p class="muted" style="font-size:13px">Rates can be individually edited on each table. Changing a default does not rewrite existing table rates.</p>${categories.map((category)=>`<div class="settings-row"><div><strong>${e(category)}</strong><span>${state.tables.filter((table)=>table.category===category).length} configured tables</span></div><strong>${money(state.tables.filter((table)=>table.category===category).reduce((sum,table)=>sum+table.rate,0)/Math.max(1,state.tables.filter((table)=>table.category===category).length))}/hr avg</strong></div>`).join("")}</article>
        <article class="panel settings-section"><h2>Theme</h2><div class="settings-row"><div><strong>Dark / light appearance</strong><span>Theme preference is saved on this device</span></div><button class="toggle ${state.settings.theme==="light"?"on":""}" data-action="theme-toggle" aria-label="Toggle theme" aria-pressed="${state.settings.theme==="light"}"></button></div><div class="settings-row"><div><strong>Accent color</strong><span>Current accent applied throughout CUECORE</span></div><span class="accent-swatch" style="--swatch:${e(currentAccent())}" title="${e(accentNames[currentAccent()]||currentAccent())}"></span></div></article>
        <article class="panel settings-section"><h2>Local demo data</h2><div class="settings-row"><div><strong>Export demo data</strong><span>Download all records as a JSON backup</span></div><button class="button button-sm" data-action="export-data">Export JSON</button></div><div class="settings-row"><div><strong>Restore sample data</strong><span>Replace current local records with original samples</span></div><button class="button button-sm button-danger" data-action="reset-data">Reset demo</button></div><p class="muted" style="font-size:12px;margin:10px 0 0">CUECORE stores this demo in browser localStorage. Future Python bridge integration belongs in the repository layer in <code>js/storage.js</code>.</p></article>
      </div>
    </div>`;
}

function openModal(title, subtitle, body, { footer = "", wide = false, formId = "", modalType = "" } = {}) {
  const returnFocus = activeModal ? modalReturnFocus : document.activeElement;
  closeModal(false);
  modalReturnFocus=returnFocus;
  activeModal = { type: modalType };
  modalRoot.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal ${wide ? "modal-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><div><h2 id="modal-title">${e(title)}</h2><p>${e(subtitle || "")}</p></div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon("x")}</button></header>${formId ? `<form id="${formId}" novalidate>` : ""}<div class="modal-body"><div class="form-error" role="alert"></div>${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}${formId ? "</form>" : ""}</section></div>`;
  modalRoot.querySelector(".modal-backdrop").addEventListener("click", (event) => { if (event.target.matches("[data-backdrop]")) closeModal(); });
  modalRoot.querySelector("input,select,textarea,button")?.focus();
}
function closeModal(restoreFocus = true) {
  modalRoot.innerHTML = "";
  activeModal = null;
  if(restoreFocus&&modalReturnFocus?.isConnected)modalReturnFocus.focus();
  if(restoreFocus)modalReturnFocus=null;
}
function formFooter(label = "Save changes", action = "submit-form", extra = "") {
  return `<button class="button" type="button" data-action="close-modal">Cancel</button>${extra}<button class="button button-primary" type="submit" data-action="${action}">${e(label)}</button>`;
}
function showFormError(message) {
  const node = $(".form-error", modalRoot);
  if (node) { node.textContent = message; node.classList.add("show"); }
  notify(message, "error", "Check the form");
}
function valuesFrom(form) { return Object.fromEntries(new FormData(form).entries()); }
function openSessionForm(tableId) {
  const table = state.tables.find((entry)=>entry.id===tableId);
  if (!table || table.status !== "available" || tableSession(table)) { notify("This table is not available to start a new session.", "warning"); return; }
  const customerOptions = [`<option value="guest">Walk-in guest</option>`, ...state.customers.filter((customer)=>customer.id!=="cus-006").map((customer)=>`<option value="${e(customer.id)}">${e(customer.name)} · ${e(customer.phone)}</option>`)].join("");
  openModal(`Start session · ${table.name}`, `${table.category} table · ${money(table.rate)} per hour`, `
    <div class="form-grid"><label class="field"><span>Customer</span><select name="customerId" required>${customerOptions}</select></label>
    ${field("Guest name (optional)","guestName","","text",'placeholder="Walk-in guest"')}
    <div class="field"><span>Table rate</span><input value="${money(table.rate)} per hour" disabled></div>
    ${selectField("Billing mode","billingMode",["minute","hour"],state.settings.billingMode)}
    <div class="field"><span>Start time</span><input value="${timeLabel(Date.now())} · now" disabled></div>
    ${textareaField("Session notes","notes","")}</div>`, { formId:"session-form", footer:formFooter("Start session"), modalType:"session-start", wide:true });
  activeModal = { type:"session-start", tableId };
}
function openTableForm(tableId = "") {
  const table = state.tables.find((entry)=>entry.id===tableId);
  if (table?.status !== "available" && table) { notify("End or pause the current session before editing table availability.", "warning"); return; }
  const body = `<div class="form-grid">${field("Table name","name",table?.name || `Table ${String(state.tables.length+1).padStart(2,"0")}`,"text","required")}${selectField("Category","category",categories,table?.category || "Standard")}${field("Hourly rate (BDT)","rate",table?.rate ?? state.settings.defaultRate,"number",'min="0" step="1" required')}${selectField("Status","status",["available","maintenance"],table?.status || "available")}${textareaField("Notes","notes",table?.notes || "")}</div>`;
  openModal(table?"Edit table":"Add a table", "Choose a category and set this table's hourly price.", body, { formId:"table-form", footer:formFooter(table?"Save table":"Add table"), modalType:"table-edit" });
  activeModal = { type:"table-edit", tableId };
}
function openCustomerForm(customerId = "") {
  const customer = state.customers.find((entry)=>entry.id===customerId);
  openModal(customer?"Edit customer":"Add customer", "Keep customer contact and membership details up to date.", `<div class="form-grid">
    ${field("Full name","name",customer?.name || "","text","required")}
    ${field("Phone number","phone",customer?.phone || "","tel",'required placeholder="e.g. +880 1712 345 678"')}
    ${field("Email (optional)","email",customer?.email || "","email")}
    ${selectField("Membership","membership",["Regular","Silver","Gold","VIP"],customer?.membership || "Regular")}
    ${textareaField("Notes","notes",customer?.notes || "")}</div>`, { formId:"customer-form", footer:formFooter(customer?"Save customer":"Add customer"), modalType:"customer-edit" });
  activeModal = { type:"customer-edit", customerId };
}
function openBookingForm(bookingId = "") {
  const booking = state.bookings.find((entry)=>entry.id===bookingId);
  const customers = state.customers.map((customer)=>[customer.id,customer.name]);
  const selectedCustomer = booking?.customerId || customers[0]?.[0] || "";
  openModal(booking?"Edit booking":"New booking", "Reserve a table for a customer. Confirmed reservations cannot overlap.", `<div class="form-grid">
    ${selectField("Customer","customerId",customers.map(([id,name])=>`${name}|||${id}`),`${customers.find(([id])=>id===selectedCustomer)?.[1]}|||${selectedCustomer}`)}
    ${selectField("Table preference","tableId",[["Any table",""],...state.tables.map((table)=>[table.name,table.id])].map(([name,id])=>`${name}|||${id}`),`${state.tables.find((table)=>table.id===booking?.tableId)?.name || "Any table"}|||${booking?.tableId || ""}`)}
    ${field("Date","date",booking?.date || todayISO(),"date","required")}
    ${field("Start time","start",booking?.start || "18:00","time","required")}
    ${field("Duration (hours)","duration",booking?.duration || 1,"number",'min="1" max="12" step="1" required')}
    ${field("Contact number","phone",booking?.phone || state.customers.find((customer)=>customer.id===selectedCustomer)?.phone || "","tel","required")}
    ${selectField("Status","status",["Pending","Confirmed","Completed","Cancelled"],booking?.status || "Pending")}
    ${textareaField("Notes","notes",booking?.notes || "")}</div>`, { formId:"booking-form", footer:formFooter(booking?"Save booking":"Create booking"), modalType:"booking-edit" });
  activeModal = { type:"booking-edit", bookingId };
  // Store option values as stable IDs, independently from visible customer/table labels.
  const form = $("#booking-form", modalRoot);
  for (const select of $$('select[name="customerId"],select[name="tableId"]', form)) {
    const options = [...select.options];
    options.forEach((optionEl) => { const parts = optionEl.value.split("|||"); optionEl.textContent = parts[0]; optionEl.value = parts[1]; });
  }
  if (!booking?.tableId) $("select[name=tableId]",form).value = "";
}
function openExpenseForm(expenseId = "") {
  const expense = state.expenses.find((entry)=>entry.id===expenseId);
  openModal(expense?"Edit expense":"Record expense","Add an operating cost to the club ledger.",`<div class="form-grid">
    ${field("Title","title",expense?.title || "","text","required")}
    ${selectField("Category","category",expenseCategories,expense?.category || "Electricity")}
    ${field("Amount (BDT)","amount",expense?.amount || "","number",'min="1" step="1" required')}
    ${field("Date","date",expense?.date || todayISO(),"date","required")}
    ${selectField("Payment method","method",["Cash","bKash","Nagad","Card","Bank transfer"],expense?.method || "Cash")}
    ${field("Recorded by","recordedBy",expense?.recordedBy || "Admin")}
    ${textareaField("Description","description",expense?.description || "")}</div>`,{formId:"expense-form",footer:formFooter(expense?"Save expense":"Save expense"),modalType:"expense-edit"});
  activeModal = {type:"expense-edit",expenseId};
}
function openProductForm(productId = "") {
  const product = state.products.find((entry)=>entry.id===productId);
  openModal(product?"Edit product":"Add product","Update price and stock details for your product catalog.",`<div class="form-grid">
    ${field("Product name","name",product?.name || "","text","required")}
    ${field("SKU","sku",product?.sku || `SKU-${String(state.products.length+1).padStart(3,"0")}`,"text","required")}
    ${selectField("Category","category",productCategories,product?.category || "Soft Drinks")}
    ${field("Cost price (BDT)","cost",product?.cost ?? 0,"number",'min="0" step="1" required')}
    ${field("Selling price (BDT)","price",product?.price ?? 0,"number",'min="0" step="1" required')}
    ${field("Stock quantity","stock",product?.stock ?? 0,"number",'min="0" step="1" required')}
    ${field("Low-stock threshold","threshold",product?.threshold ?? 5,"number",'min="0" step="1" required')}</div>`,{formId:"product-form",footer:formFooter(product?"Save product":"Add product"),modalType:"product-edit"});
  activeModal = {type:"product-edit",productId};
}
function openStockAdjust(productId) {
  const product=state.products.find((entry)=>entry.id===productId);
  openModal(`Adjust stock · ${product.name}`,"Enter a positive or negative quantity adjustment.",`<div class="form-grid"><div class="field"><span>Current stock</span><input value="${product.stock} units" disabled></div>${field("Adjustment (+ / −)","delta","1","number","required step=\"1\"")}<p class="muted field-wide" style="font-size:13px">Stock cannot fall below zero. Current cost value: ${money(product.stock*product.cost)}.</p></div>`,{formId:"stock-form",footer:formFooter("Apply adjustment"),modalType:"stock-adjust"});
  activeModal={type:"stock-adjust",productId};
}
function openStaffForm(staffId = "") {
  const member=state.staff.find((entry)=>entry.id===staffId);
  openModal(member?"Edit staff member":"Add staff member","Maintain your team and shift directory.",`<div class="form-grid">
    ${field("Name","name",member?.name || "","text","required")}${field("Phone","phone",member?.phone || "","tel","required")}
    ${field("Username","username",member?.username || "","text","required")}${selectField("Role","role",["Owner","Manager","Cashier","Staff"],member?.role || "Staff")}
    ${selectField("Status","status",["Active","Inactive"],member?.status || "Active")}${field("Joining date","joined",member?.joined || todayISO(),"date","required")}
    ${field("Shift","shift",member?.shift || "09:00 – 18:00","text","required")}</div>`,{formId:"staff-form",footer:formFooter(member?"Save staff":"Add staff"),modalType:"staff-edit"});
  activeModal={type:"staff-edit",staffId};
}
function openEndSession(tableId) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  const session=tableSession(table);
  if(!session){notify("There is no active session for this table.","warning");return;}
  const linkedCustomer=state.customers.find((entry)=>entry.id===session.customerId);
  const previousBalance=linkedCustomer?.balance||0;
  const bill=sessionBreakdown(session,table,state.settings,Date.now(),0,previousBalance);
  const productLines=session.products.length?session.products.map((item)=>`<div class="breakdown-row"><span>${e(item.name)} × ${item.qty}</span><strong>${money(item.price*item.qty)}</strong></div>`).join(""):`<div class="breakdown-row"><span>Added products</span><strong>${money(0)}</strong></div>`;
  const started=session.originalStartedAt||session.startedAt;
  const body=`<div class="profile-hero" style="margin-bottom:14px">${avatar(customerName(state,session))}<div><strong>${e(table.name)} · ${e(customerName(state,session))}</strong><span style="display:block;color:var(--color-text-muted);font-size:12px">${e(table.category)} · ${money(table.rate)}/hour</span></div>${statusPill(table.status)}</div>
    <div class="analytics-strip"><div class="analytics-chip"><span>Started</span><strong>${timeLabel(started)}</strong></div><div class="analytics-chip"><span>Ended</span><strong>${timeLabel(Date.now())}</strong></div><div class="analytics-chip"><span>Billable time</span><strong data-modal-timer="${e(session.id)}">${durationLabel(billableMilliseconds(session))}</strong></div><div class="analytics-chip"><span>Hourly rate</span><strong>${money(table.rate)}</strong></div></div>
    <div class="breakdown-list"><div class="breakdown-row"><span>Table charges</span><strong>${money(bill.tableCharge)}</strong></div>${productLines}
      ${previousBalance?`<div class="breakdown-row"><span>Previous balance</span><strong>${money(previousBalance)}</strong></div>`:""}
      <label class="field" style="grid-template-columns:1fr 130px;align-items:center"><span>Discount (BDT)</span><input name="discount" type="number" min="0" step="1" value="0" data-discount-input></label>
      <div class="breakdown-row total"><span>Final total</span><strong data-bill-total>${money(bill.total)}</strong></div>
      <label class="field"><span>Payment method</span><select name="paymentMethod">${paymentMethods.map((method)=>option(method,"Cash")).join("")}</select></label></div>`;
  openModal(`Close session · ${table.name}`,"Review the bill and record a demo payment.",body,{formId:"end-session-form",wide:true,footer:`<button class="button" type="button" data-action="close-modal">Cancel</button><button class="button" type="button" data-action="print-current-receipt" data-id="${e(table.id)}">${icon("printer")}Print receipt</button><button class="button button-primary" type="submit">Confirm payment</button>`,modalType:"end-session"});
  activeModal={type:"end-session",tableId};
}
function openTableDetails(tableId) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  const session=tableSession(table);
  const bill=session?sessionBreakdown(session,table,state.settings):null;
  const statusControls=table.status==="available"?`<button class="button button-primary" data-action="start-session" data-id="${e(table.id)}">Start game</button>`:table.status==="maintenance"?`<button class="button" data-action="release-maintenance" data-id="${e(table.id)}">Set available</button>`:table.status==="paused"?`<button class="button button-primary" data-action="resume-session" data-id="${e(table.id)}">Resume session</button>`:`<button class="button" data-action="pause-session" data-id="${e(table.id)}">Pause</button><button class="button button-danger" data-action="end-session" data-id="${e(table.id)}">End game</button>`;
  openModal(`${table.name} · ${table.category}`,"Table details and current status.",`<div data-status="${e(table.status)}">${tableArt()}</div><div class="analytics-strip" style="margin-top:16px"><div class="analytics-chip"><span>Rate</span><strong>${money(table.rate)}/hr</strong></div><div class="analytics-chip"><span>Status</span><strong>${e(table.status)}</strong></div><div class="analytics-chip"><span>Session</span><strong>${session?durationLabel(billableMilliseconds(session)):"None"}</strong></div><div class="analytics-chip"><span>Current bill</span><strong>${bill?money(bill.total):"—"}</strong></div></div>${session?`<div class="profile-hero">${avatar(customerName(state,session))}<div><strong>${e(customerName(state,session))}</strong><span style="display:block;color:var(--color-text-muted);font-size:12px"><span class="timer-text" data-timer="${e(session.id)}">${durationLabel(billableMilliseconds(session))}</span> billable · started ${timeLabel(session.originalStartedAt||session.startedAt)}</span></div></div>${session.products.length?`<h3 style="margin:13px 0 7px">Session products</h3>${session.products.map((item)=>`<div class="breakdown-row" style="margin:6px 0"><span>${e(item.name)} × ${item.qty}</span><strong>${money(item.qty*item.price)}</strong></div>`).join("")}`:""}<button class="button" style="margin-top:12px" data-action="switch-session" data-id="${e(table.id)}">Switch table</button><button class="button" style="margin:12px 0 0 6px" data-action="add-to-session" data-id="${e(table.id)}">${icon("plus")}Add products</button>`:`<p class="muted" style="font-size:13px;margin:12px 0">This table has no active customer session.</p>`}`,{footer:`<button class="button" data-action="edit-table" data-id="${e(table.id)}">Edit table</button>${statusControls}<button class="button button-quiet" data-action="close-modal">Close</button>` ,modalType:"table-details",wide:true});
  activeModal={type:"table-details",tableId};
}
function openSessionDetails(tableId) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  const session=tableSession(table);
  if(!session){openTableDetails(tableId);return;}
  const previousBalance=state.customers.find((entry)=>entry.id===session.customerId)?.balance||0;
  const bill=sessionBreakdown(session,table,state.settings,Date.now(),0,previousBalance);
  openModal(`${table.name} · Live bill`,"Session detail · billable time excludes any paused periods.",`<div class="profile-hero" style="margin-bottom:13px">${avatar(customerName(state,session))}<div><strong>${e(customerName(state,session))}</strong><span style="display:block;color:var(--color-text-muted);font-size:12px">${e(table.category)} table · ${money(table.rate)}/hour</span></div>${statusPill(table.status)}</div>
    <div class="analytics-strip"><div class="analytics-chip"><span>Started</span><strong>${timeLabel(session.originalStartedAt||session.startedAt)}</strong></div><div class="analytics-chip"><span>Billable duration</span><strong data-modal-timer="${e(session.id)}">${durationLabel(billableMilliseconds(session))}</strong></div><div class="analytics-chip"><span>Billing mode</span><strong>${session.billingMode==="hour"?"Started hour":"Per minute"}</strong></div><div class="analytics-chip"><span>Live total</span><strong data-live-total="${e(session.id)}">${money(bill.total)}</strong></div></div>
    <div class="breakdown-list"><div class="breakdown-row"><span>Table charge</span><strong>${money(bill.tableCharge)}</strong></div><div class="breakdown-row"><span>Product charges</span><strong>${money(bill.products)}</strong></div><div class="breakdown-row total"><span>Estimated total</span><strong data-live-total="${e(session.id)}">${money(bill.total)}</strong></div></div>
    <p class="muted" style="font-size:12px;margin-top:13px">${session.notes?`Notes: ${e(session.notes)}`:"No session notes."}</p>`,{footer:`<button class="button" data-action="switch-session" data-id="${e(table.id)}">Switch table</button><button class="button" data-action="add-to-session" data-id="${e(table.id)}">${icon("plus")}Add product</button>${table.status==="paused"?`<button class="button button-primary" data-action="resume-session" data-id="${e(table.id)}">Resume</button>`:`<button class="button" data-action="pause-session" data-id="${e(table.id)}">Pause</button>`}<button class="button button-danger" data-action="end-session" data-id="${e(table.id)}">End game</button>`,wide:true,modalType:"session-details"});
  activeModal={type:"session-details",tableId};
}
function openSwitchSession(tableId) {
  const source=state.tables.find((entry)=>entry.id===tableId);
  const session=tableSession(source);
  const targets=state.tables.filter((table)=>table.id!==source.id&&table.status==="available");
  if(!targets.length){notify("There are no available tables to switch to.","warning");return;}
  openModal("Switch session table",`Move the current session from ${source.name}. Only available tables can be selected.`,`<div class="form-grid"><div class="field"><span>Current table</span><input value="${e(source.name)} · ${money(source.rate)}/hr" disabled></div><label class="field"><span>Move to</span><select name="targetId" required>${targets.map((table)=>`<option value="${e(table.id)}">${e(table.name)} · ${e(table.category)} · ${money(table.rate)}/hr</option>`).join("")}</select></label></div><p class="muted" style="font-size:13px;margin-top:12px">Elapsed session time and product charges move with the customer. The new table rate is used from now onward.</p>`,{formId:"switch-form",footer:formFooter("Move session"),modalType:"switch-session"});
  activeModal={type:"switch-session",tableId,sessionId:session?.id};
}
function openAddProductToSession(tableId) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  if(!tableSession(table)){notify("No session is active for this table.","warning");return;}
  const stocked=state.products.filter((product)=>product.stock>0);
  if(!stocked.length){notify("There are no in-stock products available.","warning");return;}
  openModal(`Add products · ${table.name}`,"Add available inventory to this live session bill.",`<div class="form-grid"><label class="field field-wide"><span>Product</span><select name="productId">${stocked.map((product)=>`<option value="${e(product.id)}">${e(product.name)} · ${money(product.price)} · ${product.stock} available</option>`).join("")}</select></label>${field("Quantity","qty","1","number",'min="1" step="1" required')}</div><p class="muted" style="font-size:13px;margin-top:12px">Inventory is deducted immediately and the item appears on the closing bill.</p>`,{formId:"session-product-form",footer:formFooter("Add to session"),modalType:"session-product"});
  activeModal={type:"session-product",tableId};
}
function openCustomerProfile(customerId) {
  const customer=state.customers.find((entry)=>entry.id===customerId);
  const transactions=state.transactions.filter((entry)=>entry.customer===customer.name).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const sessions=state.sessions.filter((session)=>session.customerId===customer.id);
  openModal(customer.name,"Customer profile and recent activity.",`<div class="profile-hero">${avatar(customer.name)}<div style="flex:1"><strong>${e(customer.phone)}</strong><span style="display:block;color:var(--color-text-muted);font-size:12px">${e(customer.email||"No email")} · ${e(customer.membership)} member</span></div><span class="role-badge tier-${e(customer.membership.toLowerCase())}">${e(customer.membership)}</span></div>
    <div class="analytics-strip" style="margin-top:12px"><div class="analytics-chip"><span>Sessions</span><strong>${customer.sessions}</strong></div><div class="analytics-chip"><span>Total spending</span><strong>${money(customer.spending)}</strong></div><div class="analytics-chip"><span>Outstanding</span><strong>${money(customer.balance)}</strong></div><div class="analytics-chip"><span>Registered</span><strong>${shortDate(customer.registered)}</strong></div></div>
    <h3 style="margin:13px 0 7px">Active session</h3>${sessions.length?sessions.map((session)=>`<div class="notification-item"><span>${icon("target")}</span><div><strong>${e(state.tables.find((table)=>table.id===session.tableId)?.name||"Table")} · ${durationLabel(billableMilliseconds(session))}</strong><span>Estimated live charge ${money(sessionBreakdown(session,state.tables.find((table)=>table.id===session.tableId),state.settings).total)}</span></div></div>`).join(""):`<p class="muted" style="font-size:13px">No active table session.</p>`}
    <h3 style="margin:13px 0 7px">Recent transactions</h3>${transactions.length?transactions.map((transaction)=>`<div class="settings-row"><div><strong>${e(transaction.description)}</strong><span>${shortDate(transaction.date.slice(0,10))} · ${e(transaction.method)}</span></div><strong>${money(transaction.amount)}</strong></div>`).join(""):`<p class="muted" style="font-size:13px">No saved transaction history yet.</p>`}${customer.notes?`<p class="muted" style="font-size:13px;margin-top:10px">Notes: ${e(customer.notes)}</p>`:""}`,{footer:`<button class="button" data-action="edit-customer" data-id="${e(customer.id)}">Edit customer</button><button class="button button-quiet" data-action="close-modal">Close</button>`,wide:true,modalType:"customer-profile"});
  activeModal={type:"customer-profile",customerId};
}

function askConfirmation(title, message, onConfirm, confirmLabel = "Confirm", danger = false) {
  pendingConfirmation = onConfirm;
  openModal(title, "Please confirm this action.", `<p style="font-size:14px;color:var(--color-text-muted);margin:0">${e(message)}</p>`, {
    footer:`<button class="button" data-action="close-modal">Cancel</button><button class="button ${danger?"button-danger":"button-primary"}" data-action="confirm-pending">${e(confirmLabel)}</button>`,
    modalType:"confirmation"
  });
}
function setSessionStatus(tableId, nextStatus) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  const session=tableSession(table);
  if(!table||!session)return;
  const now=Date.now();
  if(nextStatus==="paused" && table.status==="occupied"){
    const elapsed=Math.max(0,now-session.startedAt);
    session.accumulatedMs+=elapsed;
    session.segmentAccumulatedMs=(session.segmentAccumulatedMs||0)+elapsed;
    session.pausedAt=now;
  } else if(nextStatus==="occupied" && table.status==="paused"){
    session.startedAt=now;
    session.pausedAt=null;
  } else return;
  table.status=nextStatus;
  persist(); render();
  notify(`${table.name} session ${nextStatus==="paused"?"paused":"resumed"}.`);
}
function closeSession(tableId, formValues) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  const session=tableSession(table);
  if(!table||!session){notify("This session has already been closed.","warning");return;}
  if(state.transactions.some((entry)=>entry.sessionId===session.id)){notify("A payment has already been recorded for this session.","warning");return;}
  const discount=Math.max(0,Number(formValues.discount)||0);
  const linkedCustomer=state.customers.find((entry)=>entry.id===session.customerId);
  const previousBalance=linkedCustomer?.balance||0;
  const closedAt=Date.now();
  const bill=sessionBreakdown(session,table,state.settings,closedAt,discount,previousBalance);
  const customer=customerName(state,session);
  const revenueAmount=Math.max(0,bill.total-previousBalance);
  const method=formValues.paymentMethod||"Cash";
  const receipt={tableName:table.name,category:table.category,customer,startedAt:session.originalStartedAt||session.startedAt,endedAt:closedAt,duration:bill.elapsed,rate:table.rate,tableCharge:bill.tableCharge,products:session.products.map((item)=>({name:item.name,qty:item.qty,price:item.price})),previousBalance,discount,total:bill.total,method};
  const transaction={id:uid("tx"),sessionId:session.id,type:"session",description:`${table.name} · Session`,customer,amount:bill.total,revenueAmount,previousBalance,method,date:new Date(closedAt).toISOString(),tableId:table.id,discount,receipt};
  state.transactions.push(transaction);
  if(linkedCustomer){
    linkedCustomer.sessions+=1;
    linkedCustomer.spending+=revenueAmount;
    linkedCustomer.balance=transaction.method==="Customer Credit"?bill.total:0;
  }
  table.status="available";
  state.sessions=state.sessions.filter((entry)=>entry.id!==session.id);
  persist();
  closeModal(); render();
  notify(`${money(bill.total)} recorded via ${transaction.method}. Receipt is ready to print.`);
}
function printReceipt(tableId) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  const session=tableSession(table);
  if(!table||!session){notify("Receipt details are no longer available.","warning");return;}
  const previousBalance=state.customers.find((entry)=>entry.id===session.customerId)?.balance||0;
  const bill=sessionBreakdown(session,table,state.settings,Date.now(),0,previousBalance);
  const receipt=$("#receipt-print");
  receipt.innerHTML=receiptMarkup({tableName:table.name,category:table.category,customer:customerName(state,session),startedAt:session.originalStartedAt||session.startedAt,endedAt:Date.now(),duration:bill.elapsed,rate:table.rate,tableCharge:bill.tableCharge,products:session.products,previousBalance,total:bill.total,method:"Pending"});
  window.print();
}
function receiptMarkup(details) {
  const productLines=(details.products||[]).map((item)=>`<div class="receipt-row"><span>${e(item.name)} ×${item.qty}</span><span>${money(item.price*item.qty)}</span></div>`).join("");
  return `<h1>${e(state.settings.clubName)}</h1><div class="receipt-center">${e(state.settings.address)}<br>${e(state.settings.phone)}<br><strong>RECEIPT · DEMO</strong></div><div class="receipt-rule"></div><div class="receipt-row"><span>Table / sale</span><span>${e(details.tableName)}</span></div>${details.category?`<div class="receipt-row"><span>Category</span><span>${e(details.category)}</span></div>`:""}<div class="receipt-row"><span>Customer</span><span>${e(details.customer)}</span></div>${details.startedAt?`<div class="receipt-row"><span>Start</span><span>${timeLabel(details.startedAt)}</span></div>`:""}<div class="receipt-row"><span>Closed</span><span>${timeLabel(details.endedAt)} · ${shortDate(new Date(details.endedAt).toISOString().slice(0,10))}</span></div>${details.duration?`<div class="receipt-row"><span>Duration</span><span>${durationLabel(details.duration)}</span></div>`:""}<div class="receipt-rule"></div>${details.tableCharge?`<div class="receipt-row"><span>Table time</span><span>${money(details.tableCharge)}</span></div>`:""}${productLines}${details.previousBalance?`<div class="receipt-row"><span>Previous balance</span><span>${money(details.previousBalance)}</span></div>`:""}${details.discount?`<div class="receipt-row"><span>Discount</span><span>−${money(details.discount)}</span></div>`:""}<div class="receipt-rule"></div><div class="receipt-row receipt-total"><span>TOTAL</span><span>${money(details.total)}</span></div><div class="receipt-row"><span>Payment</span><span>${e(details.method)}</span></div><div class="receipt-rule"></div><div class="receipt-center">Thank you for visiting<br>Keep your eye on the cue ball!</div>`;
}
function printSavedReceipt(transactionId) {
  const transaction=state.transactions.find((entry)=>entry.id===transactionId);
  if(!transaction){notify("This transaction is no longer available.","warning");return;}
  const receipt=transaction.receipt||{tableName:transaction.description,customer:transaction.customer,endedAt:transaction.date,tableCharge:0,products:[],previousBalance:0,total:transaction.amount,method:transaction.method};
  $("#receipt-print").innerHTML=receiptMarkup(receipt);
  window.print();
}
function startSession(tableId, formValues) {
  const table=state.tables.find((entry)=>entry.id===tableId);
  if(!table||table.status!=="available"||tableSession(table)){showFormError("This table is no longer available.");return;}
  const guest=formValues.customerId==="guest";
  if(guest&&!formValues.guestName.trim())formValues.guestName="Walk-in guest";
  const now=Date.now();
  state.sessions.push({id:uid("ses"),tableId:table.id,customerId:guest?null:formValues.customerId,guestName:guest?formValues.guestName.trim():"",startedAt:now,originalStartedAt:now,accumulatedMs:0,segmentAccumulatedMs:0,tableChargeCarry:0,pausedAt:null,billingMode:formValues.billingMode,products:[],notes:formValues.notes.trim()});
  table.status="occupied";
  persist();closeModal();render();notify(`${table.name} is now in play.`);
}
function bookingOverlaps(candidate, skipId = "") {
  if(candidate.status!=="Confirmed"||!candidate.tableId)return false;
  const start=candidate.start.split(":").reduce((h,m)=>h*60+Number(m),0);
  const end=start+Number(candidate.duration)*60;
  return state.bookings.some((booking)=>{
    if(booking.id===skipId||booking.status!=="Confirmed"||booking.date!==candidate.date||booking.tableId!==candidate.tableId)return false;
    const otherStart=booking.start.split(":").reduce((h,m)=>h*60+Number(m),0);
    const otherEnd=otherStart+Number(booking.duration)*60;
    return start<otherEnd&&otherStart<end;
  });
}
function saveForm(form) {
  if(!form.checkValidity()){form.reportValidity();return;}
  const values=valuesFrom(form);
  const type=activeModal?.type;
  switch(type){
    case "session-start": startSession(activeModal.tableId,values); return;
    case "table-edit": {
      const exists=state.tables.some((table)=>table.name.toLowerCase()===values.name.trim().toLowerCase()&&table.id!==activeModal.tableId);
      if(exists){showFormError("Each table must have a unique name.");return;}
      const table=state.tables.find((entry)=>entry.id===activeModal.tableId);
      const saved={id:table?.id||uid("tbl"),name:values.name.trim(),category:values.category,rate:Number(values.rate),status:values.status,notes:values.notes.trim()};
      if(table){Object.assign(table,saved);}else state.tables.push(saved);
      persist();closeModal();render();notify(`${saved.name} ${table?"updated":"added"}.`);return;
    }
    case "customer-edit": {
      const phone=values.phone.trim();
      const digits=phone.replace(/\D/g,"");
      if(digits.length<7||digits.length>15||!/^[+()\d\s.-]+$/.test(phone)){showFormError("Enter a valid phone number using 7–15 digits.");return;}
      const customer=state.customers.find((entry)=>entry.id===activeModal.customerId);
      if(state.customers.some((entry)=>entry.id!==customer?.id&&entry.phone.replace(/\D/g,"")===digits)){showFormError("A customer with this phone number already exists.");return;}
      const saved={...(customer||{id:uid("cus"),registered:todayISO(),sessions:0,spending:0,balance:0}),name:values.name.trim(),phone,email:values.email.trim(),membership:values.membership,notes:values.notes.trim()};
      if(customer)Object.assign(customer,saved);else state.customers.push(saved);
      persist();closeModal();render();notify(`${saved.name} ${customer?"updated":"added"}.`);return;
    }
    case "booking-edit": {
      const customerId=values.customerId;
      const customer=state.customers.find((entry)=>entry.id===customerId);
      const candidate={id:activeModal.bookingId||uid("bok"),customerId,tableId:values.tableId||"",date:values.date,start:values.start,duration:Number(values.duration),phone:values.phone.trim(),status:values.status,notes:values.notes.trim()};
      if(bookingOverlaps(candidate,activeModal.bookingId)){showFormError("That table already has a confirmed booking during this time.");return;}
      const previous=state.bookings.find((entry)=>entry.id===activeModal.bookingId);
      if(previous)Object.assign(previous,candidate);else state.bookings.push(candidate);
      persist();closeModal();render();notify(`Booking for ${customer?.name||"guest"} saved.`);return;
    }
    case "expense-edit": {
      const expense=state.expenses.find((entry)=>entry.id===activeModal.expenseId);
      const saved={...(expense||{id:uid("exp")}),title:values.title.trim(),category:values.category,amount:Number(values.amount),date:values.date,method:values.method,recordedBy:values.recordedBy.trim()||"Admin",description:values.description.trim()};
      if(expense)Object.assign(expense,saved);else state.expenses.push(saved);
      persist();closeModal();render();notify("Expense record saved.");return;
    }
    case "product-edit": {
      const product=state.products.find((entry)=>entry.id===activeModal.productId);
      if(state.products.some((entry)=>entry.id!==product?.id&&entry.sku.toLowerCase()===values.sku.trim().toLowerCase())){showFormError("SKU must be unique.");return;}
      const saved={...(product||{id:uid("prd")}),name:values.name.trim(),sku:values.sku.trim(),category:values.category,cost:Number(values.cost),price:Number(values.price),stock:Number(values.stock),threshold:Number(values.threshold)};
      if(product)Object.assign(product,saved);else state.products.push(saved);
      persist();closeModal();render();notify(`${saved.name} ${product?"updated":"added"} to inventory.`);return;
    }
    case "stock-adjust": {
      const product=state.products.find((entry)=>entry.id===activeModal.productId);
      const next=product.stock+Number(values.delta);
      if(!Number.isInteger(Number(values.delta))||next<0){showFormError("Stock adjustment must be a whole number and cannot make stock negative.");return;}
      product.stock=next;persist();closeModal();render();notify(`${product.name} stock adjusted to ${product.stock}.`);return;
    }
    case "staff-edit": {
      const member=state.staff.find((entry)=>entry.id===activeModal.staffId);
      if(state.staff.some((entry)=>entry.id!==member?.id&&entry.username.toLowerCase()===values.username.trim().toLowerCase())){showFormError("Username must be unique.");return;}
      const saved={...(member||{id:uid("stf")}),name:values.name.trim(),phone:values.phone.trim(),username:values.username.trim(),role:values.role,status:values.status,joined:values.joined,shift:values.shift.trim()};
      if(member)Object.assign(member,saved);else state.staff.push(saved);
      persist();closeModal();render();notify(`${saved.name} details saved.`);return;
    }
    case "switch-session": {
      const source=state.tables.find((entry)=>entry.id===activeModal.tableId);
      const target=state.tables.find((entry)=>entry.id===values.targetId);
      const session=state.sessions.find((entry)=>entry.id===activeModal.sessionId);
      if(!target||target.status!=="available"||tableSession(target)){showFormError("The selected table is no longer available.");return;}
      if(!session){showFormError("This session is no longer active.");return;}
      const now=Date.now();
      const oldCharge=sessionBreakdown(session,source,state.settings,now).tableCharge;
      session.tableChargeCarry=oldCharge;
      session.segmentAccumulatedMs=0;
      session.tableId=target.id;
      if(!session.pausedAt)session.startedAt=now;
      source.status="available";target.status=session.pausedAt?"paused":"occupied";
      persist();closeModal();render();notify(`Session moved to ${target.name}; previous table charges are preserved.`);return;
    }
    case "session-product": {
      const product=state.products.find((entry)=>entry.id===values.productId);
      const session=state.sessions.find((entry)=>entry.tableId===activeModal.tableId);
      const qty=Number(values.qty);
      if(!product||!session||!Number.isInteger(qty)||qty<1||qty>product.stock){showFormError("Choose a valid quantity that is available in stock.");return;}
      const line=session.products.find((entry)=>entry.productId===product.id);
      if(line)line.qty+=qty;else session.products.push({productId:product.id,name:product.name,qty,price:product.price});
      product.stock-=qty;persist();closeModal();render();notify(`${qty} × ${product.name} added to the session.`);return;
    }
    case "end-session": closeSession(activeModal.tableId,values); return;
    case "settings": {
      state.settings.clubName=values.clubName.trim();
      state.settings.phone=values.phone.trim();
      state.settings.address=values.address.trim();
      state.settings.defaultRate=Number(values.defaultRate);
      state.settings.billingMode=values.billingMode;
      state.settings.minimumCharge=Number(values.minimumCharge)||0;
      state.settings.theme=values.theme;
      state.settings.accent=values.accent;
      persist();render();notify("Club settings saved on this device.");return;
    }
    default: return;
  }
}

function quickAction(action) {
  if(action==="quick-start"){
    const first=state.tables.find((table)=>table.status==="available");
    if(!first){notify("No tables are available right now.","warning");return;}
    openSessionForm(first.id);return;
  }
  if(action==="quick-customer"){openCustomerForm();return;}
  if(action==="quick-booking"){openBookingForm();return;}
  if(action==="quick-expense"){openExpenseForm();return;}
  if(action==="quick-sale"){currentPage="pos";render();return;}
}
function setPage(page) {
  if(!pageNames[page])return;
  currentPage=page;globalSearch="";document.body.classList.remove("nav-open");render();main.focus({preventScroll:true});window.scrollTo({top:0});
}
function deleteRecord(kind,id) {
  const configurations={
    customer:{list:state.customers,field:"name",blocked:(record)=>state.sessions.some((session)=>session.customerId===id),label:"customer"},
    booking:{list:state.bookings,field:"id",label:"booking"},
    product:{list:state.products,field:"name",blocked:(record)=>state.sessions.some((session)=>session.products.some((item)=>item.productId===record.id)),label:"product"},
    expense:{list:state.expenses,field:"title",label:"expense"},
    staff:{list:state.staff,field:"name",label:"staff member"}
  };
  const config=configurations[kind];
  const record=config?.list.find((entry)=>entry.id===id);
  if(!record)return;
  if(config.blocked?.(record)){notify(`This ${config.label} is referenced by an active session and cannot be removed yet.`,"warning");return;}
  askConfirmation(`Delete ${config.label}?`,`This will permanently remove ${record[config.field]} from the saved demo data.`,()=>{
    config.list.splice(config.list.indexOf(record),1);
    persist();closeModal();render();notify(`${config.label[0].toUpperCase()+config.label.slice(1)} deleted.`,"success");
  },"Delete",true);
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function chartRows() {
  let from=currentPage==="reports"?reportFrom:"", to=currentPage==="reports"?reportTo:"", period=reportPeriod;
  if(!from&&!to){
    const today=new Date();
    to=toISODate(today);
    if(period==="Today")from=to;
    else {const start=new Date(today);start.setDate(start.getDate()-(period==="30 Days"?29:6));from=toISODate(start);}
  }
  const fromDate=from?new Date(`${from}T00:00:00`):null;
  const toDate=to?new Date(`${to}T23:59:59`):null;
  if(fromDate&&toDate&&fromDate>toDate)return [];
  const days=fromDate&&toDate?Math.min(31,Math.max(1,Math.floor((toDate-fromDate)/86400000)+1)):7;
  const start=fromDate||new Date(Date.now()-(days-1)*86400000);
  return Array.from({length:days},(_,index)=>{
    const date=new Date(start);date.setDate(date.getDate()+index);
    const iso=toISODate(date);
    const entries=state.transactions.filter((transaction)=>transaction.date.slice(0,10)===iso);
    return {date:iso,label:days===1?"Today":new Intl.DateTimeFormat("en-BD",{day:"numeric",month:days>9?"short":undefined}).format(date),value:entries.reduce((sum,entry)=>sum+(entry.revenueAmount??entry.amount),0)};
  });
}
function drawCharts() {
  const container=$("#revenue-chart");
  if(!container)return;
  const rows=chartRows();
  const max=Math.max(100,...rows.map((row)=>row.value));
  const width=650,height=170,left=8,right=width-8,top=12,bottom=height-24;
  const points=rows.map((row,index)=>{
    const x=rows.length===1?(left+right)/2:left+(right-left)*(index/(rows.length-1));
    const y=bottom-(bottom-top)*(row.value/max);
    return {x,y,...row};
  });
  const path=points.map((point,index)=>`${index?"L":"M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area=`${path} L${right} ${bottom} L${left} ${bottom} Z`;
  const labels=points.filter((_,index)=>rows.length<=8||index%Math.ceil(rows.length/6)===0||index===rows.length-1).map((point)=>`<text x="${point.x}" y="${height-4}" text-anchor="middle">${e(point.label)}</text>`).join("");
  const circles=points.map((point)=>`<circle cx="${point.x}" cy="${point.y}" r="3.2"><title>${e(point.label)} · ${money(point.value)}</title></circle>`).join("");
  if(window.Chart){
    if(chartInstance){chartInstance.destroy();chartInstance=null;}
    const css=getComputedStyle(document.documentElement);
    const primary=css.getPropertyValue("--color-primary").trim();
    const chartFill=({chart})=>{const {ctx,chartArea}=chart;if(!chartArea)return withAlpha(primary,.15);const gradient=ctx.createLinearGradient(0,chartArea.top,0,chartArea.bottom);gradient.addColorStop(0,withAlpha(primary,.38));gradient.addColorStop(1,withAlpha(primary,0));return gradient;};
    container.innerHTML='<canvas aria-label="Revenue chart" role="img"></canvas>';
    chartInstance=new window.Chart($("canvas",container),{type:"line",data:{labels:rows.map((row)=>row.label),datasets:[{data:rows.map((row)=>row.value),borderColor:getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),backgroundColor:chartFill,fill:true,tension:.38,pointRadius:4,pointHoverRadius:7,pointBorderColor:css.getPropertyValue("--bg-panel").trim(),pointBorderWidth:2,pointBackgroundColor:getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim(),borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"rgba(4,12,8,.94)",borderColor:withAlpha(primary,.6),borderWidth:1,padding:11,displayColors:false,titleFont:{family:"Chakra Petch, sans-serif",weight:"700",size:12},bodyFont:{family:"Orbitron, sans-serif",weight:"700",size:13},callbacks:{label:(context)=>money(context.raw)}}},scales:{x:{grid:{display:false},ticks:{color:getComputedStyle(document.documentElement).getPropertyValue("--color-text-muted").trim(),maxTicksLimit:7,font:{size:11,family:"Chakra Petch, sans-serif",weight:"600"}}},y:{beginAtZero:true,grid:{color:getComputedStyle(document.documentElement).getPropertyValue("--color-border").trim()},ticks:{color:getComputedStyle(document.documentElement).getPropertyValue("--color-text-muted").trim(),font:{size:11,family:"Chakra Petch, sans-serif",weight:"600"},callback:(value)=>`৳${Number(value).toLocaleString("en-BD")}`}}}}});
    return;
  }
  container.innerHTML=`<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Revenue chart, demo transaction totals">${[.25,.5,.75,1].map((fraction)=>`<line x1="${left}" x2="${right}" y1="${(bottom-(bottom-top)*fraction).toFixed(1)}" y2="${(bottom-(bottom-top)*fraction).toFixed(1)}"></line>`).join("")}<path class="chart-area" d="${area}"></path><path class="chart-line" d="${path}"></path>${circles}<g class="chart-labels">${labels}</g></svg>${rows.every((row)=>row.value===0)?`<span class="chart-empty-label">No settled transactions in this period</span>`:""}`;
}
function updateTimers() {
  const now=Date.now();
  $$("[data-timer]").forEach((node)=>{
    const session=state.sessions.find((entry)=>entry.id===node.dataset.timer);
    if(session)node.textContent=durationLabel(billableMilliseconds(session,now));
  });
  $$("[data-modal-timer]").forEach((node)=>{
    const session=state.sessions.find((entry)=>entry.id===node.dataset.modalTimer);
    if(session)node.textContent=durationLabel(billableMilliseconds(session,now));
  });
  $$("[data-live-total]").forEach((node)=>{
    const session=state.sessions.find((entry)=>entry.id===node.dataset.liveTotal);
    const table=session&&state.tables.find((entry)=>entry.id===session.tableId);
    if(session&&table)node.textContent=money(sessionBreakdown(session,table,state.settings,now).total);
  });
  $$("[data-live-table-charge]").forEach((node)=>{
    const session=state.sessions.find((entry)=>entry.id===node.dataset.liveTableCharge);
    const table=session&&state.tables.find((entry)=>entry.id===session.tableId);
    if(session&&table)node.textContent=money(sessionBreakdown(session,table,state.settings,now).tableCharge);
  });
  if(currentPage==="dashboard"){
    const metrics=dashboardMetrics(state);
    const revenue=$("[data-dashboard-revenue]");
    const profit=$("[data-dashboard-profit]");
    if(revenue)revenue.textContent=money(metrics.revenue);
    if(profit)profit.textContent=money(metrics.profit);
  }
  const endForm=$("#end-session-form");
  if(endForm&&activeModal?.type==="end-session"){
    const session=tableSession(state.tables.find((entry)=>entry.id===activeModal.tableId));
    const table=state.tables.find((entry)=>entry.id===activeModal.tableId);
    if(session&&table){
      const discount=Number($("[data-discount-input]",endForm)?.value)||0;
      const previousBalance=state.customers.find((entry)=>entry.id===session.customerId)?.balance||0;
      const amount=sessionBreakdown(session,table,state.settings,now,discount,previousBalance).total;
      const total=$("[data-bill-total]",endForm);
      if(total)total.textContent=money(amount);
      const timer=$("[data-modal-timer]",endForm);
      if(timer)timer.textContent=durationLabel(billableMilliseconds(session,now));
    }
  }
}
function updateCartTotals() {
  const subtotal=cart.reduce((sum,line)=>sum+line.price*line.qty,0);
  const discount=Math.min(subtotal,Math.max(0,Number($("[data-cart-discount]")?.value)||0));
  const total=Math.max(0,Math.round(subtotal-discount));
  const values={"[data-cart-subtotal]":money(subtotal),"[data-cart-discount-value]":`−${money(discount)}`,"[data-cart-payable]":money(total),"[data-cart-button-total]":money(total)};
  Object.entries(values).forEach(([selector,text])=>{const node=$(selector);if(node)node.textContent=text;});
}
function notificationCenter() {
  const low=state.products.filter((product)=>product.stock<=product.threshold);
  const bookings=state.bookings.filter((booking)=>booking.date===todayISO()&&booking.status==="Confirmed");
  const items=[
    ...low.slice(0,3).map((product)=>({icon:"box",title:`${product.name} · ${product.stock===0?"out of stock":"low stock"}`,detail:`${product.stock} remaining · alert at ${product.threshold}`,type:product.stock===0?"error":"warning"})),
    ...bookings.slice(0,2).map((booking)=>({icon:"calendar",title:`Booking · ${state.customers.find((customer)=>customer.id===booking.customerId)?.name||"Guest"}`,detail:`${booking.start} · ${state.tables.find((table)=>table.id===booking.tableId)?.name||"Table"}`,type:"info"})),
    ...state.sessions.slice(0,2).map((session)=>({icon:"target",title:`${state.tables.find((table)=>table.id===session.tableId)?.name||"Table"} is ${session.pausedAt?"paused":"in play"}`,detail:`${customerName(state,session)} · ${durationLabel(billableMilliseconds(session))}`,type:"success"}))
  ];
  openModal("Notifications",`${items.length} operational update${items.length===1?"":"s"}.`,items.length?`<div class="notification-list">${items.map((item)=>`<div class="notification-item"><span>${icon(item.icon)}</span><div><strong>${e(item.title)}</strong><span>${e(item.detail)}</span></div>${statusPill(item.type==="success"?"Active":item.type==="warning"?"Pending":item.type==="error"?"Maintenance":"Confirmed")}</div>`).join("")}</div>`:emptyState("You're all caught up","There are no new operational alerts."),{footer:`<button class="button button-quiet" data-action="close-modal">Done</button>`,wide:true,modalType:"notifications"});
}
function downloadData() {
  const link=document.createElement("a");
  link.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));
  link.download=`cuecore-demo-${todayISO()}.json`;link.click();URL.revokeObjectURL(link.href);
}
function exportRows(kind) {
  const configs={
    tables:["cuecore-tables.csv",[["Table","Category","Hourly rate BDT","Status"],...state.tables.map((table)=>[table.name,table.category,table.rate,table.status])]],
    customers:["cuecore-customers.csv",[["Customer ID","Name","Phone","Email","Membership","Sessions","Spending BDT","Balance BDT"],...state.customers.map((customer)=>[customer.id,customer.name,customer.phone,customer.email,customer.membership,customer.sessions,customer.spending,customer.balance])]],
    inventory:["cuecore-inventory.csv",[["Product","SKU","Category","Cost BDT","Price BDT","Stock","Low stock threshold"],...state.products.map((product)=>[product.name,product.sku,product.category,product.cost,product.price,product.stock,product.threshold])]],
    expenses:["cuecore-expenses.csv",[["Expense","Category","Amount BDT","Date","Payment method","Description"],...state.expenses.map((expense)=>[expense.title,expense.category,expense.amount,expense.date,expense.method,expense.description])]],
    report:["cuecore-transactions.csv",[["Transaction ID","Type","Description","Customer","Amount BDT","Method","Date"],...state.transactions.map((transaction)=>[transaction.id,transaction.type,transaction.description,transaction.customer,transaction.amount,transaction.method,transaction.date])]]
  };
  const [filename,rows]=configs[kind];csvDownload(filename,rows);notify(`${filename} downloaded.`,"success","Export ready");
}

document.addEventListener("click",(event)=>{
  if(!event.target.closest(".menu-anchor")){const menu=$("[data-menu]");if(menu&&!menu.hidden){menu.hidden=true;$("[data-action='quick-menu']")?.setAttribute("aria-expanded","false");}}
  const pageButton=event.target.closest("[data-page]");
  if(pageButton){setPage(pageButton.dataset.page);return;}
  const actionButton=event.target.closest("[data-action]");
  if(!actionButton)return;
  const {action,id,value,period}=actionButton.dataset;
  switch(action){
    case "dismiss-toast":document.getElementById(actionButton.dataset.id)?.remove();break;
    case "close-modal":closeModal();break;
    case "toggle-nav":document.body.classList.toggle("nav-open");break;
    case "close-nav":document.body.classList.remove("nav-open");break;
    case "collapse-sidebar":document.body.classList.toggle("collapsed");localStorage.setItem("cuecore.sidebar-collapsed",document.body.classList.contains("collapsed")?"1":"0");break;
    case "theme-toggle":state.settings.theme=state.settings.theme==="dark"?"light":"dark";persist();render();break;
    case "quick-menu":{const menu=$("[data-menu]",actionButton.parentElement);menu.hidden=!menu.hidden;actionButton.setAttribute("aria-expanded",String(!menu.hidden));break;}
    case "quick-start":case "quick-customer":case "quick-booking":case "quick-expense":case "quick-sale":$("[data-menu]")?.setAttribute("hidden","");quickAction(action);break;
    case "profile-menu":openModal("Staff profile","Current local demo operator.",`<div class="profile-hero">${avatar("Mahmud Hasan")}<div><strong>Mahmud Hasan</strong><span style="display:block;color:var(--color-text-muted);font-size:12px">Admin · Owner label · Local demo</span></div></div><p class="muted" style="font-size:13px;margin:12px 0 0">This frontend demo does not authenticate users. Staff labels are informational only.</p>`,{footer:`<button class="button button-quiet" data-action="close-modal">Close</button>`,modalType:"staff-profile"});break;
    case "notifications":notificationCenter();break;
    case "dashboard-period":reportPeriod=period;render();break;
    case "report-period":reportPeriod=period;reportFrom="";reportTo="";render();break;
    case "clear-report-range":reportFrom="";reportTo="";render();break;
    case "table-status-filter":tableStatusFilter=value;render();break;
    case "table-view":tableView=value;render();break;
    case "table-details":closeModal();openTableDetails(id);break;
    case "session-details":closeModal();openSessionDetails(id);break;
    case "start-session":closeModal();openSessionForm(id);break;
    case "add-table":openTableForm();break;
    case "edit-table":closeModal();openTableForm(id);break;
    case "pause-session":closeModal();setSessionStatus(id,"paused");break;
    case "resume-session":closeModal();setSessionStatus(id,"occupied");break;
    case "end-session":closeModal();openEndSession(id);break;
    case "release-maintenance":{const table=state.tables.find((entry)=>entry.id===id);if(table){table.status="available";persist();render();notify(`${table.name} marked available.`);}break;}
    case "switch-session":closeModal();openSwitchSession(id);break;
    case "add-to-session":closeModal();openAddProductToSession(id);break;
    case "add-customer":openCustomerForm();break;
    case "edit-customer":closeModal();openCustomerForm(id);break;
    case "view-customer":openCustomerProfile(id);break;
    case "delete-customer":deleteRecord("customer",id);break;
    case "add-booking":openBookingForm();break;
    case "edit-booking":openBookingForm(id);break;
    case "delete-booking":deleteRecord("booking",id);break;
    case "booking-schedule":bookingView=value;render();break;
    case "booking-status-cycle":{const booking=state.bookings.find((entry)=>entry.id===id);if(booking){const values=["Pending","Confirmed","Completed","Cancelled"];const candidate={...booking,status:values[(values.indexOf(booking.status)+1)%values.length]};if(bookingOverlaps(candidate,id)){notify("This status change would overlap another confirmed booking.","warning");break;}booking.status=candidate.status;persist();render();notify(`Booking marked ${booking.status.toLowerCase()}.`);}break;}
    case "cart-add":{const product=state.products.find((entry)=>entry.id===id);const line=cart.find((entry)=>entry.productId===id);if(product&&product.stock>(line?.qty||0)){if(line)line.qty+=1;else cart.push({productId:id,name:product.name,price:product.price,qty:1});render();}else notify("Not enough stock for this quantity.","warning");break;}
    case "cart-qty":{const line=cart.find((entry)=>entry.productId===id);const product=state.products.find((entry)=>entry.id===id);if(line){const next=line.qty+Number(actionButton.dataset.step);if(next<=0)cart=cart.filter((entry)=>entry!==line);else if(next<=product.stock)line.qty=next;else notify("Not enough stock for this quantity.","warning");render();}break;}
    case "cart-clear":cart=[];render();break;
    case "complete-sale":{
      if(!cart.length){notify("Add at least one product before completing a sale.","warning");break;}
      const shortage=cart.find((line)=>line.qty>state.products.find((product)=>product.id===line.productId)?.stock);
      if(shortage){notify(`${shortage.name} no longer has enough stock.`,"error");break;}
      const subtotal=cart.reduce((sum,line)=>sum+line.price*line.qty,0);
      const discount=Math.min(subtotal,Math.max(0,Number($("[data-cart-discount]")?.value)||0));
      const amount=Math.max(0,Math.round(subtotal-discount));
      const method=$("[data-cart-payment]")?.value||"Cash";
      const closedAt=Date.now();
      const receipt={tableName:"Counter sale",customer:"Counter sale",endedAt:closedAt,tableCharge:0,products:cart.map((line)=>({name:line.name,qty:line.qty,price:line.price})),previousBalance:0,discount,total:amount,method};
      cart.forEach((line)=>{const product=state.products.find((entry)=>entry.id===line.productId);product.stock-=line.qty;});
      state.transactions.push({id:uid("tx"),type:"sale",description:`Counter sale · ${cart.reduce((sum,line)=>sum+line.qty,0)} items`,customer:"Counter sale",amount,revenueAmount:amount,method,date:new Date(closedAt).toISOString(),receipt});
      cart=[];persist();render();notify(`${money(amount)} sale recorded via ${method}.`);break;
    }
    case "go-inventory":setPage("inventory");break;
    case "product-category":productCategoryFilter=value;render();break;
    case "add-product":openProductForm();break;
    case "edit-product":openProductForm(id);break;
    case "adjust-stock":openStockAdjust(id);break;
    case "delete-product":deleteRecord("product",id);break;
    case "add-expense":openExpenseForm();break;
    case "edit-expense":openExpenseForm(id);break;
    case "delete-expense":deleteRecord("expense",id);break;
    case "add-staff":openStaffForm();break;
    case "edit-staff":openStaffForm(id);break;
    case "delete-staff":deleteRecord("staff",id);break;
    case "staff-status":{const member=state.staff.find((entry)=>entry.id===id);if(member){member.status=member.status==="Active"?"Inactive":"Active";persist();render();notify(`${member.name} marked ${member.status.toLowerCase()}.`);}break;}
    case "export-tables":exportRows("tables");break;
    case "export-customers":exportRows("customers");break;
    case "export-inventory":exportRows("inventory");break;
    case "export-expenses":exportRows("expenses");break;
    case "export-report":exportRows("report");break;
    case "export-data":downloadData();notify("Demo backup downloaded.");break;
    case "reset-data":askConfirmation("Reset all demo data?","All local demo edits, payments, products, bookings, and sessions will be replaced by original sample records.",()=>{state=repository.reset();cart=[];currentPage="dashboard";closeModal();render();notify("Original sample data restored.");},"Reset demo",true);break;
    case "confirm-pending":{const callback=pendingConfirmation;pendingConfirmation=null;closeModal();callback?.();break;}
    case "print-current-receipt":printReceipt(id);break;
    case "print-transaction-receipt":printSavedReceipt(id);break;
    default:break;
  }
});

document.addEventListener("submit",(event)=>{
  if(event.target.matches("#settings-form")){
    event.preventDefault();
    const values=valuesFrom(event.target);
    state.settings.clubName=values.clubName.trim();state.settings.phone=values.phone.trim();state.settings.address=values.address.trim();
    state.settings.defaultRate=Number(values.defaultRate);state.settings.billingMode=values.billingMode;state.settings.minimumCharge=Number(values.minimumCharge)||0;state.settings.theme=values.theme;state.settings.accent=values.accent;
    persist();render();notify("Club settings saved on this device.");return;
  }
  if(event.target.matches("form[id$='-form']")){
    event.preventDefault();
    saveForm(event.target);
  }
});

document.addEventListener("input",(event)=>{
  const target=event.target;
  if(target.hasAttribute("data-cart-discount")){updateCartTotals();return;}
  let filter=target.dataset.filter;
  if(target.id==="staff-search")filter="staff-search";
  if(target.hasAttribute("data-global-search")){
    globalSearch=target.value;
    if(currentPage==="tables"){tableSearch=globalSearch;filter="table-search";}
    else if(currentPage==="customers"){customerSearch=globalSearch;filter="customer-search";}
    else if(currentPage==="bookings"){bookingSearch=globalSearch;filter="bookings-search";}
    else if(currentPage==="inventory"){inventorySearch=globalSearch;filter="inventory-search";}
    else if(currentPage==="expenses"){expenseSearch=globalSearch;filter="expense-search";}
    else if(currentPage==="pos"){productSearch=globalSearch;filter="product-search";}
    else if(currentPage==="staff"){filter="staff-search";}
    else return;
  }
  if(!filter)return;
  const value=target.value;
  if(filter==="customer-search")customerSearch=value;
  if(filter==="table-search")tableSearch=value;
  if(filter==="bookings-search")bookingSearch=value;
  if(filter==="bookings-date")bookingDateFilter=value;
  if(filter==="inventory-search")inventorySearch=value;
  if(filter==="expense-search")expenseSearch=value;
  if(filter==="product-search")productSearch=value;
  if(filter==="report-from")reportFrom=value;
  if(filter==="report-to")reportTo=value;
  if(filter==="staff-search"){const selection=target.selectionStart;render();const fresh=$("#staff-search");fresh?.focus();fresh?.setSelectionRange(selection,selection);return;}
  const selection=target.selectionStart;
  render();
  const replacement=$(`[data-filter="${filter}"]`)||$("[data-global-search]");
  if(replacement){replacement.focus();if(typeof selection==="number")replacement.setSelectionRange(selection,selection);}
});

document.addEventListener("change",(event)=>{
  const {change}=event.target.dataset;
  if(change==="table-category")categoryFilter=event.target.value;
  else if(change==="customer-membership")customerMembershipFilter=event.target.value;
  else if(change==="booking-status")bookingStatusFilter=event.target.value;
  else if(change==="booking-table")bookingTableFilter=event.target.value;
  else if(change==="inventory-category")inventoryCategoryFilter=event.target.value;
  else if(change==="expense-category")expenseCategoryFilter=event.target.value;
  else if(event.target.hasAttribute("data-cart-discount")){updateCartTotals();return;}
  else if(event.target.hasAttribute("data-cart-payment"))return;
  else return;
  render();
});
document.addEventListener("keydown",(event)=>{
  if(event.key==="Escape"&&activeModal){closeModal();return;}
  if(event.key==="Escape"&&document.body.classList.contains("nav-open")){document.body.classList.remove("nav-open");return;}
  if((event.key==="Enter"||event.key===" ")&&event.target.matches("[role='button'][data-action]")){event.preventDefault();event.target.click();return;}
  if(event.key==="Tab"&&activeModal){
    const focusable=$$("button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex='-1'])",modalRoot);
    if(focusable.length){
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  }
  if(event.key==="Enter"&&event.target.matches("[data-global-search]")){event.preventDefault();if(["tables","customers","bookings","inventory","expenses","pos","staff"].includes(currentPage))main.querySelector("[data-filter],#staff-search")?.focus();}
});
window.addEventListener("storage",(event)=>{
  if(event.key==="cuecore.demo.v1"&&event.newValue){notify("Demo data changed in another browser tab. Reload to view the latest saved data.","info","Local data updated");}
});
window.setInterval(updateTimers,1000);
if(localStorage.getItem("cuecore.sidebar-collapsed")==="1")document.body.classList.add("collapsed");
render();
const redrawCharts=()=>{if(currentPage==="dashboard"||currentPage==="reports")drawCharts();};
document.fonts?.ready.then(redrawCharts);
$("script[data-chartjs]")?.addEventListener("load",redrawCharts);
