import { useMemo } from "react";
import { findTable, releaseMaintenance, setSessionStatus, tableSession } from "@/app/actions";
import { useStore } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import { AddProductModal, EndSessionModal, SessionDetailsModal, StartSessionModal, SwitchSessionModal, TableDetailsModal, TableFormModal } from "./modals";

/** Every table/session action, shared by Dashboard, Tables, POS and the table modals. */
export function useTableActions() {
  const state = useStore();
  const { openModal, closeModal, notify, perform, isAdmin } = useUi();

  return useMemo(() => {
    const session = (id) => tableSession(state, findTable(state, id));
    const adminOnly = () => { closeModal(); notify("Only an Admin can add or edit tables.", "warning", "No access"); };
    return {
      canEdit: isAdmin,
      start(id) {
        const table = findTable(state, id);
        if (!table || table.status !== "available" || session(id)) return notify("This table is not available to start a new session.", "warning");
        openModal(<StartSessionModal tableId={id} />);
      },
      quickStart() {
        const first = state.tables.find((t) => t.status === "available");
        if (!first) return notify("No tables are available right now.", "warning");
        openModal(<StartSessionModal tableId={first.id} />);
      },
      details: (id) => openModal(<TableDetailsModal tableId={id} />),
      sessionDetails: (id) => openModal(session(id) ? <SessionDetailsModal tableId={id} /> : <TableDetailsModal tableId={id} />),
      add: () => (isAdmin ? openModal(<TableFormModal />) : adminOnly()),
      edit(id) {
        if (!isAdmin) return adminOnly();
        const table = findTable(state, id);
        if (table && table.status !== "available") { closeModal(); return notify("End or pause the current session before editing table availability.", "warning"); }
        openModal(<TableFormModal tableId={id} />);
      },
      pause: (id) => { closeModal(); perform(setSessionStatus, id, "paused"); },
      resume: (id) => { closeModal(); perform(setSessionStatus, id, "occupied"); },
      end(id) {
        if (!session(id)) { closeModal(); return notify("There is no active session for this table.", "warning"); }
        openModal(<EndSessionModal tableId={id} />);
      },
      release: (id) => { closeModal(); perform(releaseMaintenance, id); },
      switchTable(id) {
        if (!state.tables.some((t) => t.id !== id && t.status === "available")) { closeModal(); return notify("There are no available tables to switch to.", "warning"); }
        openModal(<SwitchSessionModal tableId={id} />);
      },
      addProduct(id) {
        if (!session(id)) { closeModal(); return notify("No session is active for this table.", "warning"); }
        if (!state.products.some((p) => p.stock > 0)) { closeModal(); return notify("There are no in-stock products available.", "warning"); }
        openModal(<AddProductModal tableId={id} />);
      }
    };
  }, [state, openModal, closeModal, notify, perform, isAdmin]);
}
