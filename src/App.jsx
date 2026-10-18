import { lazy, Suspense, useCallback, useEffect } from "react";
import { useStorageSync } from "./app/store.jsx";
import { useUi } from "./app/ui.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import TablesPage from "./features/tables/TablesPage.jsx";
import Sidebar from "./layout/Sidebar.jsx";
import Topbar from "./layout/Topbar.jsx";

// Tables is the landing page and ships in the main bundle; every other page loads on first visit.
const loaders = {
  bookings: () => import("./features/bookings/BookingsPage.jsx"),
  customers: () => import("./features/customers/CustomersPage.jsx"),
  pos: () => import("./features/pos/PosPage.jsx"),
  inventory: () => import("./features/inventory/InventoryPage.jsx"),
  expenses: () => import("./features/expenses/ExpensesPage.jsx"),
  reports: () => import("./features/reports/ReportsPage.jsx"),
  staff: () => import("./features/staff/StaffPage.jsx"),
  salary: () => import("./features/salary/SalaryPage.jsx"),
  settings: () => import("./features/settings/SettingsPage.jsx")
};
const pages = { tables: TablesPage, ...Object.fromEntries(Object.entries(loaders).map(([id, load]) => [id, lazy(load)])) };

/** Shown while a page's code downloads, so the content area is never empty. */
function PageLoading() {
  return <div className="page-loading" role="status" aria-label="Loading page"><span></span><span></span><span></span></div>;
}

export default function App() {
  const { page, setPage, modal, closeModal, notify } = useUi();
  const Page = pages[page];

  useStorageSync(useCallback(() => notify("Demo data changed in another browser tab. Reload to view the latest saved data.", "info", "Local data updated"), [notify]));

  // Once the first page is up, fetch the other pages in the background: later clicks are
  // instant, and an open tab keeps working even after a new deploy removes the old files.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    const id = idle(() => Object.values(loaders).forEach((load) => load().catch(() => {})));
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);

  return (
    <>
      <div id="app" className="app-shell">
        <Sidebar />
        <section className="main-shell">
          <Topbar />
          <main id="main-content" className="main-content" tabIndex={-1}>
            <ErrorBoundary resetKey={page} onHome={() => setPage("tables")}>
              <Suspense fallback={<PageLoading />}>
                <Page />
              </Suspense>
            </ErrorBoundary>
          </main>
        </section>
        <div className="nav-scrim" onClick={() => document.body.classList.remove("nav-open")} aria-hidden="true"></div>
      </div>
      <div id="modal-root"><ErrorBoundary resetKey={modal} overlay onHome={closeModal} homeLabel="Close">{modal}</ErrorBoundary></div>
    </>
  );
}
