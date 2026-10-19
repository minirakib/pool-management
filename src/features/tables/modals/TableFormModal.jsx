import { useState } from "react";
import * as actions from "@/app/actions";
import { findTable } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Icon from "@/components/Icon.jsx";
import Modal, { FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import SnookerTable, { ClothPicker } from "@/components/snooker/SnookerTable.jsx";
import { ChoiceGroup, StatusPill } from "@/components/ui";
import { categories } from "@/lib/constants.js";
import { ratesLabel } from "@/lib/domain.js";
import { clothFor } from "@/lib/theme.js";

const RATE_PRESETS = [150, 200, 250, 300, 400, 500];

/** Add / edit a table, with a live preview card of how it will look on the floor. */
export function TableFormModal({ tableId = "" }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const table = findTable(state, tableId);
  const [name, setName] = useState(table?.name || `Table ${String(state.tables.length + 1).padStart(2, "0")}`);
  const [category, setCategory] = useState(table?.category || "Standard");
  const [rate, setRate] = useState(String(table?.rate ?? state.settings.defaultRate));
  const [nonAcRate, setNonAcRate] = useState(String(table?.nonAcRate ?? state.settings.defaultNonAcRate ?? 200));
  const [status, setStatus] = useState(table?.status === "maintenance" ? "maintenance" : "available");
  const [cloth, setCloth] = useState(clothFor(table, state.settings));
  const number = (name.match(/\d+/)?.[0] || name.slice(0, 2) || "–").padStart(2, "0");

  return (
    <Modal xl className="table-form-modal" title={table ? `Edit ${table.name}` : "Add a table"} subtitle={table ? "Changes apply to new sessions straight away." : "Name it, set the price and pick a board colour."} error={error}
      onSubmit={(values) => attempt(() => run(actions.saveTable, tableId, values))} footer={<FormFooter label={<><Icon name="check" />{table ? "Save table" : "Add table"}</>} />}>
      <div className="table-form-layout">
        <aside className="table-form-preview">
          <span className="field-label">Preview</span>
          <article className="snooker-card preview-card" data-status={status}>
            <div className="snooker-card-top">
              <span className="table-number">{number}</span>
              <div className="snooker-head"><div className="snooker-title">{name || "Untitled"}</div><div className="snooker-meta">{category} · {ratesLabel({ rate, nonAcRate })}/hr</div></div>
              <StatusPill status={status} />
            </div>
            <SnookerTable cloth={cloth} />
          </article>
          <ClothPicker value={cloth} preview={false} compact onChange={setCloth} />
        </aside>

        <section className="table-form-fields">
          <label className="field">
            <span>Table name</span>
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={30} />
          </label>
          <div className="field">
            <span>Category</span>
            <ChoiceGroup name="category" label="Category" value={category} onChange={setCategory} options={categories.map((c) => [c, c])} />
          </div>
          {[["rate", "AC hourly rate (BDT)", rate, setRate], ["nonAcRate", "Non-AC hourly rate (BDT)", nonAcRate, setNonAcRate]].map(([field, label, value, setValue]) => (
            <div key={field} className="field">
              <span>{label}</span>
              <div className="rate-input">
                <b>৳</b>
                <input name={field} type="number" min="0" step="1" value={value} onChange={(e) => setValue(e.target.value)} required />
                <small>per hour</small>
              </div>
              <div className="rate-presets">
                {RATE_PRESETS.map((r) => <button key={r} type="button" className={`filter-pill${Number(value) === r ? " active" : ""}`} onClick={() => setValue(String(r))}>{r}</button>)}
              </div>
            </div>
          ))}
          <div className="field">
            <span>Status</span>
            <ChoiceGroup name="status" label="Status" value={status} onChange={setStatus} options={[["available", "Available", "Ready for play"], ["maintenance", "Maintenance", "Out of service"]]} />
          </div>
          <label className="field">
            <span>Notes <em>(optional)</em></span>
            <textarea name="notes" rows="3" defaultValue={table?.notes || ""} placeholder="e.g. new cushions fitted, near the window…" />
          </label>
        </section>
      </div>
    </Modal>
  );
}
