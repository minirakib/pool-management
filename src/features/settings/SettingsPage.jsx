import { saveSettings, setDefaultCloth, toggleTheme } from "../../app/actions.js";
import { useStore, useStoreApi } from "../../app/store.jsx";
import { useUi } from "../../app/ui.jsx";
import { ConfirmModal } from "../../components/Modal.jsx";
import { ClothPicker } from "../../components/SnookerTable.jsx";
import { Field, PageHeading, Select, SelectField } from "../../components/ui.jsx";
import { categories } from "../../lib/constants.js";
import { jsonDownload } from "../../lib/download.js";
import { money, todayISO } from "../../lib/format.js";
import { accentNames, accentOptions, currentAccent } from "../../lib/theme.js";

export default function SettingsPage() {
  const state = useStore();
  const { run, reset } = useStoreApi();
  const { openModal, notify, perform, setPage, setCart } = useUi();
  const { settings } = state;
  const accent = currentAccent(settings);

  const submit = (event) => {
    event.preventDefault();
    perform(saveSettings, Object.fromEntries(new FormData(event.currentTarget).entries()));
  };
  // Two submit buttons share one form: "save" sets the default, "all" also recolours every table.
  const submitCloth = (event) => {
    event.preventDefault();
    const applyToAll = event.nativeEvent.submitter?.value === "all";
    perform(setDefaultCloth, new FormData(event.currentTarget).get("cloth"), applyToAll);
  };
  const resetDemo = () => openModal(
    <ConfirmModal title="Reset all demo data?" message="All local demo edits, payments, products, bookings, and sessions will be replaced by original sample records." confirmLabel="Reset demo" danger
      onConfirm={() => { reset(); setCart([]); setPage("tables"); notify("Original sample data restored."); }} />
  );

  return (
    <>
      <PageHeading title="Settings" stats={[{ label: "Tables", value: state.tables.length, tone: "primary" }, { label: "Theme", value: settings.theme === "light" ? "Light" : "Dark", tone: "info" }, { label: "Saved", value: "This device", tone: "success" }]} />
      <div className="two-col">
        <article className="panel settings-section">
          <h2>Club profile</h2>
          {/* key remounts the form so theme toggles elsewhere are reflected in its defaults */}
          <form key={`${settings.theme}-${settings.accent}`} id="settings-form" className="form-grid" onSubmit={submit}>
            <Field label="Club name" name="clubName" value={settings.clubName} required />
            <Field label="Phone number" name="phone" type="tel" value={settings.phone} />
            <Field label="Address" name="address" value={settings.address} />
            <Field label="Default hourly rate" name="defaultRate" type="number" value={settings.defaultRate} min="0" step="1" required />
            <SelectField label="Default billing mode" name="billingMode" options={["minute", "hour"]} value={settings.billingMode} />
            <Field label="Minimum charge" name="minimumCharge" type="number" value={settings.minimumCharge} min="0" step="1" />
            <SelectField label="Appearance" name="theme" options={["dark", "light"]} value={settings.theme} />
            <label className="field"><span>Accent color</span><Select name="accent" defaultValue={accent} options={accentOptions.map((v) => [v, accentNames[v]])} /></label>
            <div className="field"><span>Currency</span><input value="BDT · ৳ Bangladeshi Taka" disabled /></div>
            <div className="field field-wide"><span>Branding</span>
              <div className="profile-hero"><div className="brand-mark"><span>C</span></div><div><strong className="brand-name">CUE<b>CORE</b></strong><span className="muted" style={{ display: "block", fontSize: 12 }}>Logo placeholder · replaceable in desktop packaging</span></div></div>
            </div>
            <div className="field field-wide"><button className="button button-primary" type="submit">Save settings</button></div>
          </form>
        </article>
        <div>
          <article className="panel settings-section">
            <h2>Table board color</h2>
            <p className="muted" style={{ fontSize: 13 }}>Default cloth color for new tables. Each table can also have its own color in Tables → Edit.</p>
            <form key={settings.defaultCloth || "green"} className="form-grid" onSubmit={submitCloth}>
              <ClothPicker value={settings.defaultCloth || "green"} label="Default board color" />
              <div className="field field-wide" style={{ display: "flex", flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <button className="button button-primary" type="submit" value="save">Save default</button>
                <button className="button" type="submit" value="all">Apply to all tables</button>
              </div>
            </form>
          </article>
          <article className="panel settings-section">
            <h2>Table categories & rates</h2>
            <p className="muted" style={{ fontSize: 13 }}>Rates can be individually edited on each table. Changing a default does not rewrite existing table rates.</p>
            {categories.map((category) => {
              const tables = state.tables.filter((t) => t.category === category);
              return (
                <div key={category} className="settings-row">
                  <div><strong>{category}</strong><span>{tables.length} configured tables</span></div>
                  <strong>{money(tables.reduce((s, t) => s + t.rate, 0) / Math.max(1, tables.length))}/hr avg</strong>
                </div>
              );
            })}
          </article>
          <article className="panel settings-section">
            <h2>Theme</h2>
            <div className="settings-row">
              <div><strong>Dark / light appearance</strong><span>Theme preference is saved on this device</span></div>
              <button className={`toggle${settings.theme === "light" ? " on" : ""}`} onClick={() => run(toggleTheme)} aria-label="Toggle theme" aria-pressed={settings.theme === "light"}></button>
            </div>
            <div className="settings-row">
              <div><strong>Accent color</strong><span>Current accent applied throughout CUECORE</span></div>
              <span className="accent-swatch" style={{ "--swatch": accent }} title={accentNames[accent] || accent}></span>
            </div>
          </article>
          <article className="panel settings-section">
            <h2>Local demo data</h2>
            <div className="settings-row">
              <div><strong>Export demo data</strong><span>Download all records as a JSON backup</span></div>
              <button className="button button-sm" onClick={() => { jsonDownload(`cuecore-demo-${todayISO()}.json`, state); notify("Demo backup downloaded."); }}>Export JSON</button>
            </div>
            <div className="settings-row">
              <div><strong>Restore sample data</strong><span>Replace current local records with original samples</span></div>
              <button className="button button-sm button-danger" onClick={resetDemo}>Reset demo</button>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>CUECORE stores this demo in browser localStorage. Future Python bridge integration belongs in the storage layer in <code>src/app/storage.js</code>.</p>
          </article>
        </div>
      </div>
    </>
  );
}
