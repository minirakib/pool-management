import { useEffect, useRef, useState } from "react";
import { saveArcadeSettings, saveSettings, setDefaultCloth, setLogo } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import { BrandMark, BrandName } from "@/components/Brand.jsx";
import Icon from "@/components/Icon.jsx";
import { ConfirmModal } from "@/components/Modal.jsx";
import SnookerTable, { ClothPicker } from "@/components/snooker/SnookerTable.jsx";
import { ChoiceGroup, PageHeading } from "@/components/ui";
import { useDragScroll } from "@/hooks/useDragScroll.js";
import { brandTagline, DEFAULT_BRAND } from "@/lib/brand.js";
import { fileToLogo } from "@/lib/image.js";
import { categories, clothColors } from "@/lib/constants.js";
import { jsonDownload } from "@/lib/download.js";
import { calculateTableCharge, rateFor } from "@/lib/domain.js";
import { money, todayISO } from "@/lib/format.js";
import { accentNames, accentOptions, clothFor, currentAccent } from "@/lib/theme.js";
import UsersPanel, { AddUserButton } from "./UsersPanel.jsx";
import "./settings.css";

const TABS = [
  { id: "general", icon: "trophy", label: "Club profile", hint: "Name, logo, branding", description: "Your club's name, logo and brand, shown on every screen, receipt and the TV display." },
  { id: "billing", icon: "cash", label: "Billing & rates", hint: "Hourly rates, game rules", description: "Defaults for new tables and new games. Each table can still have its own rates." },
  { id: "boards", icon: "table", label: "Table boards", hint: "Cloth color", description: "The cloth color new tables get. Each table can also have its own in Tables → Edit." },
  { id: "appearance", icon: "sun", label: "Appearance", hint: "Theme, accent color", description: "Changes apply instantly and are saved on this device." },
  { id: "users", icon: "users", label: "Users", hint: "Sign-in accounts", description: "Admin: every page · User: Tables, Bookings, POS and Arcade." },
  { id: "arcade", icon: "coin", label: "Arcade", hint: "Coin price, stock", description: "Price per coin and the coins available to sell. Stock changes are logged in Arcade." },
  { id: "data", icon: "download", label: "Data & backup", hint: "Export, reset", description: "Everything is stored in this browser. Export a backup before clearing or moving devices." }
];
const tabFromHash = () => TABS.find((t) => `#${t.id}` === location.hash)?.id || TABS[0].id;
const formValues = (event) => Object.fromEntries(new FormData(event.currentTarget).entries());

/** One tab's content: icon, title and description on top, then the tab's own body. */
function Pane({ tab, action, children }) {
  return (
    <section className="panel settings-pane" role="tabpanel" id={`settings-panel-${tab.id}`} aria-labelledby={`settings-tab-${tab.id}`}>
      <header className="settings-pane-head">
        <span className="settings-pane-icon"><Icon name={tab.icon} /></span>
        <div><h2>{tab.label}</h2><p>{tab.description}</p></div>
        {action && <div className="settings-pane-action">{action}</div>}
      </header>
      {children}
    </section>
  );
}

function Group({ title, hint, children }) {
  return (
    <div className="settings-group">
      <div className="settings-group-head"><h3>{title}</h3>{hint && <p>{hint}</p>}</div>
      {children}
    </div>
  );
}

function SaveBar({ label = "Save changes", children }) {
  return (
    <footer className="settings-savebar">
      <span><Icon name="check" />Saved on this device</span>
      {children}
      <button className="button button-primary" type="submit"><Icon name="check" />{label}</button>
    </footer>
  );
}

/** Logo upload: saved at once (no Save button), with drag-and-drop onto the drop zone. */
function LogoPicker() {
  const { settings } = useStore();
  const { perform, notify } = useUi();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try { perform(setLogo, await fileToLogo(file)); } catch (e) { notify(e.message, "warning", "Logo not changed"); } finally { setBusy(false); }
  };
  return (
    <div className="logo-picker">
      <button type="button" className={`logo-drop${dragging ? " dragging" : ""}${settings.logo ? " has-logo" : ""}`} onClick={() => inputRef.current?.click()} disabled={busy}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files?.[0]); }} aria-label={settings.logo ? "Replace logo" : "Upload logo"}>
        {settings.logo ? <img src={settings.logo} alt="Current logo" /> : <span className="logo-drop-empty"><Icon name="plus" /><b>Upload logo</b><small>or drop an image here</small></span>}
      </button>
      <div className="logo-picker-copy">
        <strong>Club logo</strong>
        <span>PNG, JPG, WebP, GIF or SVG, up to 5 MB. A square image with a transparent background looks best.</span>
        <div className="logo-picker-actions">
          <button type="button" className="button button-sm" onClick={() => inputRef.current?.click()} disabled={busy}><Icon name="upload" />{busy ? "Uploading…" : settings.logo ? "Replace" : "Upload"}</button>
          {settings.logo && <button type="button" className="button button-sm button-danger" onClick={() => perform(setLogo, "")} disabled={busy}><Icon name="trash" />Remove</button>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

function GeneralTab({ tab }) {
  const { settings } = useStore();
  const { perform } = useUi();
  // Draft values drive the live preview; they are saved together with the Save button.
  const [draft, setDraft] = useState({
    clubName: settings.clubName, brandName: settings.brandName || "", brandTagline: brandTagline(settings),
    brandHighlight: settings.brandHighlight || "last", logoOnReceipt: settings.logoOnReceipt !== false
  });
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const preview = { ...settings, ...draft };
  const submit = (e) => {
    e.preventDefault();
    perform(saveSettings, { ...formValues(e), logoOnReceipt: draft.logoOnReceipt, brandHighlight: draft.brandHighlight });
  };

  return (
    <Pane tab={tab}>
      <form onSubmit={submit}>
        <Group title="Club details" hint="Shown on the sign-in screen, receipts and the TV display.">
          <div className="form-grid">
            <label className="field field-wide"><span>Club name</span><input name="clubName" value={draft.clubName} onChange={set("clubName")} maxLength={60} required /></label>
            <label className="field"><span>Phone number</span><input name="phone" type="tel" defaultValue={settings.phone} maxLength={20} /></label>
            <label className="field"><span>Currency</span><input value="BDT · ৳ Bangladeshi Taka" disabled /></label>
            <label className="field field-wide"><span>Address</span><input name="address" defaultValue={settings.address} maxLength={120} /></label>
          </div>
        </Group>

        <Group title="Logo" hint="Saved as soon as you choose it. Used in the sidebar, sign-in, TV display, browser tab and receipts.">
          <LogoPicker />
        </Group>

        <Group title="Brand name" hint="The name next to the logo. Leave it empty to keep CUECORE.">
          <div className="form-grid">
            <label className="field"><span>Brand name</span><input name="brandName" value={draft.brandName} onChange={set("brandName")} maxLength={32} placeholder={DEFAULT_BRAND} /></label>
            <label className="field"><span>Tagline</span><input name="brandTagline" value={draft.brandTagline} onChange={set("brandTagline")} maxLength={40} placeholder="Shown under the name in the sidebar" /></label>
            <div className="field field-wide"><span>Accent color on the name</span>
              <ChoiceGroup name="brandHighlight" label="Accent color on the name" value={draft.brandHighlight} onChange={(v) => setDraft((d) => ({ ...d, brandHighlight: v }))}
                options={[["last", "Last word", "e.g. Green Pocket CLUB"], ["none", "None", "One color"]]} />
            </div>
            <label className="settings-check field-wide">
              <input type="checkbox" checked={draft.logoOnReceipt} onChange={set("logoOnReceipt")} />
              <span><strong>Print the logo on receipts</strong><small>Shown above the club name on table bills, sales receipts and payslips.</small></span>
            </label>
          </div>
        </Group>

        <Group title="Preview" hint="How the brand will look before you save.">
          <div className="brand-previews">
            <div className="brand-preview sidebar-like">
              <small>Sidebar</small>
              <div className="brand-row"><BrandMark settings={preview} /><div className="brand-copy"><BrandName settings={preview} />{draft.brandTagline.trim() && <div className="brand-caption">{draft.brandTagline}</div>}</div></div>
            </div>
            <div className="brand-preview receipt-like">
              <small>Receipt</small>
              <div className="receipt-mock">
                {preview.logo && draft.logoOnReceipt && <img src={preview.logo} alt="" />}
                <strong>{draft.clubName.trim() || "Club name"}</strong>
                <span>{settings.address}</span>
              </div>
            </div>
          </div>
        </Group>
        <SaveBar />
      </form>
    </Pane>
  );
}

const BILLING_MODES = (gameMinutes) => [["minute", "Per minute", "Exact time played"], ["hour", "Per hour", "Every started hour"], ["game", "Single game", `${gameMinutes} min + extra min`]];
const PREVIEW_MINUTES = [10, 30, 60, 90];

function BillingTab({ tab }) {
  const state = useStore();
  const { settings } = state;
  const { perform } = useUi();
  const [mode, setMode] = useState(settings.billingMode || "minute");
  const [draft, setDraft] = useState({ defaultRate: settings.defaultRate, defaultNonAcRate: settings.defaultNonAcRate ?? 200, singleGameMinutes: settings.singleGameMinutes ?? 15, minimumCharge: settings.minimumCharge });
  const onChange = (e) => { if (e.target.name in draft) setDraft((d) => ({ ...d, [e.target.name]: e.target.value })); };
  const gameMinutes = Math.max(1, Number(draft.singleGameMinutes) || 15);
  const price = (rate, minutes) => money(calculateTableCharge(Number(rate) || 0, minutes * 60_000, mode, Number(draft.minimumCharge) || 0, gameMinutes));

  return (
    <Pane tab={tab}>
      <form onSubmit={(e) => { e.preventDefault(); perform(saveSettings, formValues(e)); }} onChange={onChange}>
        <Group title="Default hourly rates" hint="Used when you add a new table. Existing table rates are not changed.">
          <div className="form-grid">
            <label className="field"><span>AC rate per hour</span><span className="settings-money"><b>৳</b><input name="defaultRate" type="number" min="0" step="1" defaultValue={settings.defaultRate} required /></span></label>
            <label className="field"><span>Non-AC rate per hour</span><span className="settings-money"><b>৳</b><input name="defaultNonAcRate" type="number" min="0" step="1" defaultValue={settings.defaultNonAcRate ?? 200} required /></span></label>
          </div>
        </Group>
        <Group title="How games are charged" hint="The default for new games; it can be changed when a game starts.">
          <div className="form-grid">
            <div className="field field-wide"><span>Billing mode</span><ChoiceGroup name="billingMode" label="Billing mode" value={mode} onChange={setMode} options={BILLING_MODES(gameMinutes)} /></div>
            <label className="field"><span>Single game length</span><span className="settings-money suffix"><input name="singleGameMinutes" type="number" min="1" step="1" defaultValue={settings.singleGameMinutes ?? 15} required /><b>min</b></span></label>
            <label className="field"><span>Minimum charge</span><span className="settings-money"><b>৳</b><input name="minimumCharge" type="number" min="0" step="1" defaultValue={settings.minimumCharge} /></span></label>
          </div>
          <div className="settings-preview" aria-label="Price preview">
            <div className="settings-preview-head"><Icon name="clock" /><strong>Price preview</strong><span>with the values above</span></div>
            <table>
              <thead><tr><th>Played</th>{PREVIEW_MINUTES.map((m) => <th key={m}>{m < 60 ? `${m} min` : `${m / 60} hr`}</th>)}</tr></thead>
              <tbody>
                <tr><th>AC</th>{PREVIEW_MINUTES.map((m) => <td key={m}>{price(draft.defaultRate, m)}</td>)}</tr>
                <tr><th>Non-AC</th>{PREVIEW_MINUTES.map((m) => <td key={m}>{price(draft.defaultNonAcRate, m)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Group>
        <Group title="Current table rates" hint="Average of the rates set on each table, by category.">
          <div className="settings-list">
            {categories.map((category) => {
              const tables = state.tables.filter((t) => t.category === category);
              const avg = (type) => money(tables.reduce((s, t) => s + rateFor(t, type), 0) / Math.max(1, tables.length));
              return (
                <div key={category} className="settings-row">
                  <div><strong>{category}</strong><span>{tables.length} {tables.length === 1 ? "table" : "tables"}</span></div>
                  <div className="settings-rate-pair"><span>AC <b>{avg("ac")}</b></span><span>Non-AC <b>{avg("nonac")}</b></span></div>
                </div>
              );
            })}
          </div>
        </Group>
        <SaveBar />
      </form>
    </Pane>
  );
}

function BoardsTab({ tab }) {
  const state = useStore();
  const { perform } = useUi();
  const current = state.settings.defaultCloth || "green";
  // Two submit buttons share one form: "save" sets the default, "all" also recolours every table.
  const submit = (event) => {
    event.preventDefault();
    perform(setDefaultCloth, new FormData(event.currentTarget).get("cloth"), event.nativeEvent.submitter?.value === "all");
  };
  return (
    <Pane tab={tab}>
      <form key={current} onSubmit={submit}>
        <Group title="Default board color">
          <div className="form-grid"><ClothPicker value={current} label="Board color" /></div>
        </Group>
        <Group title="Your tables" hint="Colors in use right now.">
          <div className="settings-board-list">
            {state.tables.map((t) => (
              <div key={t.id} className="settings-board">
                <SnookerTable cloth={clothFor(t, state.settings)} />
                <span>{t.name}</span>
                <small>{clothColors.find((c) => c.id === clothFor(t, state.settings))?.name}</small>
              </div>
            ))}
          </div>
        </Group>
        <SaveBar label="Save default">
          <button className="button" type="submit" value="all">Apply to all tables</button>
        </SaveBar>
      </form>
    </Pane>
  );
}

const THEMES = [["dark", "Dark", "Best for dim club rooms"], ["light", "Light", "Best for bright rooms"]];

function AppearanceTab({ tab }) {
  const { settings } = useStore();
  const { run } = useStoreApi();
  const theme = settings.theme === "light" ? "light" : "dark";
  const accent = currentAccent(settings);
  return (
    <Pane tab={tab}>
      <Group title="Theme">
        <div className="theme-options" role="radiogroup" aria-label="Theme">
          {THEMES.map(([id, label, sub]) => (
            <button key={id} type="button" role="radio" aria-checked={theme === id} className={`theme-option${theme === id ? " active" : ""}`} onClick={() => run(saveSettings, { theme: id })}>
              <span className={`theme-preview ${id}`} aria-hidden="true"><i></i><span><b></b><b></b><b></b></span></span>
              <span className="theme-option-copy"><strong>{label}</strong><small>{sub}</small></span>
              <span className="theme-check"><Icon name="check" /></span>
            </button>
          ))}
        </div>
      </Group>
      <Group title="Accent color" hint="Used for buttons, highlights and active items.">
        <div className="accent-options" role="radiogroup" aria-label="Accent color">
          {accentOptions.map((value) => (
            <button key={value} type="button" role="radio" aria-checked={accent === value} className={`accent-option${accent === value ? " active" : ""}`} style={{ "--swatch": value }} onClick={() => run(saveSettings, { accent: value })}>
              <span className="accent-dot"><Icon name="check" /></span>{accentNames[value]}
            </button>
          ))}
        </div>
      </Group>
    </Pane>
  );
}

function ArcadeTab({ tab }) {
  const state = useStore();
  const { perform, setPage } = useUi();
  return (
    <Pane tab={tab}>
      <form key={`${state.settings.arcadeCoinPrice}-${state.arcade.stock}`} onSubmit={(e) => { e.preventDefault(); perform(saveArcadeSettings, formValues(e)); }}>
        <Group title="Coins">
          <div className="form-grid">
            <label className="field"><span>Price per coin</span><span className="settings-money"><b>৳</b><input name="arcadeCoinPrice" type="number" min="0" step="1" defaultValue={state.settings.arcadeCoinPrice ?? 15} required /></span></label>
            <label className="field"><span>Total coins in stock</span><span className="settings-money suffix"><input name="arcadeStock" type="number" min="0" step="1" defaultValue={state.arcade.stock} required /><b>coins</b></span></label>
          </div>
        </Group>
        <SaveBar label="Save arcade settings">
          <button className="button" type="button" onClick={() => setPage("arcade")}><Icon name="coin" />Open arcade</button>
        </SaveBar>
      </form>
    </Pane>
  );
}

function DataTab({ tab }) {
  const state = useStore();
  const { reset } = useStoreApi();
  const { openModal, notify, setPage, setCart } = useUi();
  const resetDemo = () => openModal(
    <ConfirmModal title="Reset all demo data?" message="All local demo edits, payments, products, bookings, and sessions will be replaced by original sample records." confirmLabel="Reset demo" danger
      onConfirm={() => { reset(); setCart([]); setPage("tables"); notify("Original sample data restored."); }} />
  );
  const records = [["Tables", state.tables.length], ["Customers", state.customers.length], ["Products", state.products.length], ["Transactions", state.transactions.length]];
  return (
    <Pane tab={tab}>
      <Group title="Stored on this device">
        <div className="settings-stats">{records.map(([label, n]) => <div key={label}><strong>{n}</strong><span>{label}</span></div>)}</div>
      </Group>
      <Group title="Backup">
        <div className="settings-row">
          <div><strong>Export all data</strong><span>Download every record as a JSON file</span></div>
          <button className="button button-sm" onClick={() => { jsonDownload(`cuecore-demo-${todayISO()}.json`, state); notify("Demo backup downloaded."); }}><Icon name="download" />Export JSON</button>
        </div>
      </Group>
      <div className="settings-danger">
        <div><strong><Icon name="alert" />Restore sample data</strong><span>Replaces every local record with the original samples. This cannot be undone.</span></div>
        <button className="button button-sm button-danger" onClick={resetDemo}>Reset demo</button>
      </div>
    </Pane>
  );
}

const PANES = { general: GeneralTab, billing: BillingTab, boards: BoardsTab, appearance: AppearanceTab, users: null, arcade: ArcadeTab, data: DataTab };

/** Settings, one tab per area. The open tab is kept in the URL (#billing), so reloads and links keep it. */
export default function SettingsPage() {
  const [active, setActive] = useState(tabFromHash);
  const navRef = useDragScroll();
  const tab = TABS.find((t) => t.id === active);
  const Body = PANES[active];

  useEffect(() => { history.replaceState(history.state, "", `#${active}`); }, [active]);
  useEffect(() => {
    const onHash = () => setActive(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Arrow keys move between tabs, as in a native tab list.
  const onKeyDown = (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = TABS[(TABS.findIndex((t) => t.id === active) + step + TABS.length) % TABS.length];
    setActive(next.id);
    document.getElementById(`settings-tab-${next.id}`)?.focus();
  };

  return (
    <>
      <PageHeading title="Settings" />
      <div className="settings-layout">
        <nav ref={navRef} className="settings-tabs" role="tablist" aria-label="Settings sections" aria-orientation="vertical" onKeyDown={onKeyDown}>
          {TABS.map((t) => (
            <button key={t.id} id={`settings-tab-${t.id}`} type="button" role="tab" aria-selected={active === t.id} aria-controls={`settings-panel-${t.id}`} tabIndex={active === t.id ? 0 : -1}
              className={`settings-tab${active === t.id ? " active" : ""}`} onClick={() => setActive(t.id)}>
              <span className="settings-tab-icon"><Icon name={t.icon} /></span>
              <span className="settings-tab-copy"><strong>{t.label}</strong><small>{t.hint}</small></span>
            </button>
          ))}
        </nav>
        {Body ? <Body key={active} tab={tab} /> : <Pane tab={tab} action={<AddUserButton />}><UsersPanel /></Pane>}
      </div>
    </>
  );
}
