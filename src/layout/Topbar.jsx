import { useEffect, useRef, useState } from "react";
import { useStore } from "@/app/store.jsx";
import { pageNames, routeOf } from "@/app/routes.js";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import Modal, { CloseFooter } from "@/components/Modal.jsx";
import { Avatar, EmptyState, StatusPill } from "@/components/ui";
import BookingFormModal from "@/features/bookings/BookingFormModal.jsx";
import { CustomerFormModal } from "@/features/customers/CustomerModals.jsx";
import ExpenseFormModal from "@/features/expenses/ExpenseFormModal.jsx";
import { useTableActions } from "@/features/tables/useTableActions.jsx";
import { ROLES } from "@/lib/auth.js";
import { billableMilliseconds, customerName } from "@/lib/domain.js";
import { dateLabel, durationLabel, todayISO } from "@/lib/format.js";


export default function Topbar() {
  const state = useStore();
  const { page, setPage, openModal, search, setSearch, user, can, signOut } = useUi();
  const tableActions = useTableActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const searchable = !!routeOf(page)?.search; // routes.js: pages whose own search box mirrors this one
  const live = state.sessions.filter((s) => !s.pausedAt).length;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  const quick = (fn) => () => { setMenuOpen(false); fn(); };

  return (
    <header id="topbar" className="topbar">
      <div className="topbar-title">
        <button className="icon-button nav-toggle" onClick={() => document.body.classList.toggle("nav-open")} aria-label="Open navigation"><Icon name="menu" /></button>
        <div><span className="topbar-crumb">{state.settings.clubName}</span><strong>{pageNames[page]}</strong></div>
      </div>
      <div className="topbar-actions">
        {live > 0 && <span className="live-chip" title="Tables currently in play"><i></i>{live} live</span>}
        <span className="top-date">{dateLabel()}</span>
        <label className="search-box top-search">
          <span className="search-icon"><Icon name="search" /></span>
          <input aria-label="Search current page" placeholder="Search this page…" value={searchable ? search : ""} onChange={(e) => searchable && setSearch(e.target.value)} />
        </label>
        <button className="icon-button" onClick={() => openModal(<NotificationsModal />)} aria-label="Notifications"><Icon name="bell" /><i className="dot"></i></button>
        <div className="menu-anchor" ref={menuRef}>
          <button className="button button-primary quick-button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label="Quick actions">
            <Icon name="bolt" /><span className="quick-label">Quick action</span><Icon name="chevron-down" className="quick-chevron" />
          </button>
          <div className="menu-popover" hidden={!menuOpen}>
            <button onClick={quick(tableActions.quickStart)}><Icon name="play" /> Start a table</button>
            {can("customers") && <button onClick={quick(() => openModal(<CustomerFormModal />))}><Icon name="user" /> Add customer</button>}
            <button onClick={quick(() => openModal(<BookingFormModal />))}><Icon name="calendar" /> Create booking</button>
            {can("expenses") && <button onClick={quick(() => openModal(<ExpenseFormModal />))}><Icon name="wallet" /> Add expense</button>}
            <button onClick={quick(() => setPage("pos"))}><Icon name="receipt" /> New sale</button>
            <button onClick={quick(() => setPage("arcade"))}><Icon name="coin" /> Sell arcade coins</button>
          </div>
        </div>
        <button className="user-button" onClick={() => openModal(<ProfileModal user={user} signOut={signOut} />)} aria-label="Signed-in user">
          <Avatar name={user.name} /><span className="user-name">{ROLES[user.role]}</span><Icon name="chevron-down" className="chevron" />
        </button>
      </div>
    </header>
  );
}

function ProfileModal({ user, signOut }) {
  return (
    <Modal title="Signed in" subtitle="Current operator on this device." footer={<CloseFooter><button className="button button-danger" onClick={signOut}><Icon name="undo" />Sign out</button></CloseFooter>}>
      <div className="profile-hero">
        <Avatar name={user.name} />
        <div><strong>{user.name}</strong><span style={{ display: "block", color: "var(--color-text-muted)", fontSize: 12 }}>@{user.username} · {ROLES[user.role]}</span></div>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: "12px 0 0" }}>{user.role === "admin" ? "Admin: full access to every page." : "User: Tables, Bookings, POS and Arcade."}</p>
    </Modal>
  );
}

const PILL = { success: "Active", warning: "Pending", error: "Maintenance", info: "Confirmed" };

function NotificationsModal() {
  const state = useStore();
  const tableName = (id) => state.tables.find((t) => t.id === id)?.name || "Table";
  const items = [
    ...state.products.filter((p) => p.stock <= p.threshold).slice(0, 3).map((p) => ({ icon: "box", title: `${p.name} · ${p.stock === 0 ? "out of stock" : "low stock"}`, detail: `${p.stock} remaining · alert at ${p.threshold}`, type: p.stock === 0 ? "error" : "warning" })),
    ...state.bookings.filter((b) => b.date === todayISO() && b.status === "Confirmed").slice(0, 2).map((b) => ({ icon: "calendar", title: `Booking · ${state.customers.find((c) => c.id === b.customerId)?.name || "Guest"}`, detail: `${b.start} · ${tableName(b.tableId)}`, type: "info" })),
    ...state.sessions.slice(0, 2).map((s) => ({ icon: "target", title: `${tableName(s.tableId)} is ${s.pausedAt ? "paused" : "in play"}`, detail: `${customerName(state, s)} · ${durationLabel(billableMilliseconds(s))}`, type: "success" }))
  ];

  return (
    <Modal title="Notifications" subtitle={`${items.length} operational update${items.length === 1 ? "" : "s"}.`} wide footer={<CloseFooter label="Done" />}>
      {items.length ? (
        <div className="notification-list">
          {items.map((item, i) => (
            <div key={i} className="notification-item">
              <span><Icon name={item.icon} /></span>
              <div><strong>{item.title}</strong><span>{item.detail}</span></div>
              <StatusPill status={PILL[item.type]} />
            </div>
          ))}
        </div>
      ) : <EmptyState title="You're all caught up" description="There are no new operational alerts." />}
    </Modal>
  );
}
