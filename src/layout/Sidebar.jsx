import { Fragment, useEffect, useState } from "react";
import { lowStockCount, toggleTheme } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { navGroups } from "@/app/routes.js";
import { useUi } from "@/app/ui.jsx";
import Icon from "@/components/Icon.jsx";
import { Avatar } from "@/components/ui";
import { ROLES } from "@/lib/auth.js";

const COLLAPSE_KEY = "cuecore.sidebar-collapsed";

export default function Sidebar() {
  const state = useStore();
  const { run } = useStoreApi();
  const { page, setPage, user, signOut } = useUi();
  const [openMenus, setOpenMenus] = useState({ pos: true });
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const dark = state.settings.theme !== "light";
  const lowStock = lowStockCount(state);

  // The original CSS hangs the collapsed rail off <body class="collapsed">.
  useEffect(() => {
    document.body.classList.toggle("collapsed", collapsed);
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside id="sidebar" className="sidebar" aria-label="Main navigation">
      <div className="brand-row">
        <div className="brand-mark"><span>C</span></div>
        <div className="brand-copy"><div className="brand-name">CUE<b>CORE</b></div><div className="brand-caption">Club operations</div></div>
        <button className="icon-button nav-close" onClick={() => document.body.classList.remove("nav-open")} aria-label="Close navigation"><Icon name="x" /></button>
      </div>
      <div className="club-switcher">
        <div className="club-avatar"><Icon name="trophy" /></div>
        <div className="club-copy"><strong>{state.settings.clubName}</strong><span>Dhaka · Main club</span></div>
      </div>
      <nav className="nav-list">
        {navGroups(user.role).map(([group, items]) => (
          <Fragment key={group}>
            <div className="nav-caption">{group}</div>
            {items.map((item) => {
              const link = (route, key = route.id) => (
                <button key={key} className={`nav-item${page === route.id ? " active" : ""}`} onClick={() => setPage(route.id)} title={route.title} aria-current={page === route.id ? "page" : "false"}>
                  <span className="nav-icon"><Icon name={route.icon} /></span>
                  <span className="nav-label">{route.title}</span>
                  {route.id === "inventory" && lowStock > 0 && <span className="nav-count">{lowStock}</span>}
                </button>
              );
              if (!item.menu) return link(item);
              // A menu parent (e.g. POS): opens its first page, then folds / unfolds while you are inside it.
              const within = item.children.some((r) => r.id === page);
              const open = within ? openMenus[item.menu] !== false : !!openMenus[item.menu];
              return (
                <Fragment key={item.menu}>
                  <button className={`nav-item nav-parent${within ? " within" : ""}`} aria-expanded={open} title={item.title}
                    onClick={() => { if (within) setOpenMenus((m) => ({ ...m, [item.menu]: !open })); else { setOpenMenus((m) => ({ ...m, [item.menu]: true })); setPage(item.children[0].id); } }}>
                    <span className="nav-icon"><Icon name={item.icon} /></span>
                    <span className="nav-label">{item.title}</span>
                    <Icon name="chevron-down" className="nav-chevron" />
                  </button>
                  <div className={`nav-sub${open ? "" : " closed"}`}>{item.children.map((r) => link(r, `${item.menu}-${r.id}`))}</div>
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      </nav>
      <div className="sidebar-spacer"></div>
      <div className="sidebar-bottom">
        <div className="profile-row">
          <Avatar name={user.name} />
          <div className="profile-copy"><strong>{user.name}</strong><span>@{user.username}</span></div>
          <span className={`role-badge${user.role === "admin" ? "" : " user"}`}>{ROLES[user.role]}</span>
        </div>
        <div className="sidebar-actions">
          <button className="button button-sm" onClick={() => run(toggleTheme)} title="Switch theme">
            <Icon name={dark ? "sun" : "moon"} /><span className="collapse-text">{dark ? "Light mode" : "Dark mode"}</span>
          </button>
          <button className="button button-sm sign-out-btn" onClick={signOut} title="Sign out" aria-label="Sign out"><Icon name="undo" /></button>
          <button className="button button-sm collapse-sidebar-btn" onClick={() => setCollapsed((c) => !c)} title="Collapse sidebar" aria-label="Collapse sidebar">
            <Icon name="collapse" className="collapse-icon" />
          </button>
        </div>
      </div>
    </aside>
  );
}
