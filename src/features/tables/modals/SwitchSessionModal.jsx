import * as actions from "@/app/actions";
import { findTable, tableSession } from "@/app/actions";
import { useStore, useStoreApi } from "@/app/store.jsx";
import Modal, { FormFooter, useFormAttempt } from "@/components/Modal.jsx";
import { ReadonlyField, Select } from "@/components/ui";
import { hourTypeLabel, rateFor } from "@/lib/domain.js";
import { money } from "@/lib/format.js";
import { muted } from "./shared.jsx";

export function SwitchSessionModal({ tableId }) {
  const state = useStore();
  const { run } = useStoreApi();
  const { error, attempt } = useFormAttempt();
  const source = findTable(state, tableId);
  const targets = state.tables.filter((t) => t.id !== source.id && t.status === "available");
  const hourType = tableSession(state, source)?.hourType;

  return (
    <Modal title="Switch session table" subtitle={`Move the current session from ${source.name}. Only available tables can be selected.`} error={error}
      onSubmit={(values) => attempt(() => run(actions.switchSession, tableId, values.targetId))} footer={<FormFooter label="Move session" />}>
      <div className="form-grid">
        <ReadonlyField label="Current table" value={`${source.name} · ${hourTypeLabel(hourType)} · ${money(rateFor(source, hourType))}/hr`} />
        <label className="field"><span>Move to</span><Select name="targetId" required options={targets.map((t) => [t.id, `${t.name} · ${t.category} · ${hourTypeLabel(hourType)} ${money(rateFor(t, hourType))}/hr`])} /></label>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Elapsed session time and product charges move with the customer. The new table's rate for the same hour type (AC / Non-AC) is used from now onward.</p>
    </Modal>
  );
}
