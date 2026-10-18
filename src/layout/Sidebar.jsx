import { Fragment, useEffect, useState } from "react";
import { lowStockCount, toggleTheme } from "../app/actions.js";
import { useStore, useStoreApi } from "../app/store.jsx";
import { useUi } from "../app/ui.jsx";
import Icon from "../components/Icon.jsx";
import { Avatar } from "../components/ui.jsx";

const NAV_GROUPS = [
  ["Arena", [["tables", "table", "Tables"], ["bookings", "calendar", "Bookings"]]],
  ["Counter", [["pos", "receipt", "POS"], ["inventory", "box", "Inventory"], ["expenses", "wallet", "Expenses"]]],
  ["Club", [["customers", "users", "Customers"], ["staff", "badge", "Staff"], ["salary", "cash", "Salary"], ["reports", "chart", "Reports"], ["settings", "settings", "Settings"]]]
];
const COLLAPSE_KEY = "cuecore.sidebar-collapsed";

export default function Sidebar() {
  const state = useStore();
  const { run } = useStoreApi();
  const { page, setPage } = useUi();
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
        {NAV_GROUPS.map(([group, items]) => (
          <Fragment key={group}>
            <div className="nav-caption">{group}</div>
            {items.map(([id, glyph, title]) => (
              <button key={id} className={`nav-item${page === id ? " active" : ""}`} onClick={() => setPage(id)} title={title} aria-current={page === id ? "page" : "false"}>
                <span className="nav-icon"><Icon name={glyph} /></span>
                <span className="nav-label">{title}</span>
                {id === "inventory" && lowStock > 0 && <span className="nav-count">{lowStock}</span>}
              </button>
            ))}
          </Fragment>
        ))}
      </nav>
      <div className="sidebar-spacer"></div>
      <div className="sidebar-bottom">
        <div className="profile-row">
          <Avatar name="Mahmud Hasan" />
          <div className="profile-copy"><strong>Mahmud Hasan</strong><span>Signed in locally</span></div>
          <span className="role-badge">Owner</span>
        </div>
        <div className="sidebar-actions">
          <button className="button button-sm" onClick={() => run(toggleTheme)} title="Switch theme">
            <Icon name={dark ? "sun" : "moon"} /><span className="collapse-text">{dark ? "Light mode" : "Dark mode"}</span>
          </button>
          <button className="button button-sm collapse-sidebar-btn" onClick={() => setCollapsed((c) => !c)} title="Collapse sidebar" aria-label="Collapse sidebar">
            <Icon name="collapse" className="collapse-icon" />
          </button>
        </div>
      </div>
    </aside>
  );
}
