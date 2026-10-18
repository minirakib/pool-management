import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Receipt from "../components/Receipt.jsx";
import { useStore, useStoreApi } from "./store.jsx";

const UiContext = createContext(null);
const TOAST_MARK = { success: "✓", warning: "!", error: "×", info: "i" };

export const pageNames = {
  tables: "Tables", bookings: "Bookings", customers: "Customers",
  pos: "POS", inventory: "Inventory", expenses: "Expenses", reports: "Reports",
  staff: "Staff", salary: "Salary", settings: "Settings"
};

/**
 * Each page has its own URL (/ for Tables, /salary, /reports, ...) so a reload or a shared link
 * opens the same page. vercel.json rewrites these paths to index.html.
 */
const pathFor = (page) => (page === "tables" ? "/" : `/${page}`);
const pageFromPath = () => {
  const slug = location.pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  return pageNames[slug] ? slug : "tables";
};

/** App-wide UI state: current page, the open modal, toasts and filters shared between pages. */
export function UiProvider({ children }) {
  const { run } = useStoreApi();
  const { settings } = useStore();
  const [receipt, setReceipt] = useState(null);
  const [page, setPageState] = useState(pageFromPath);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [reportPeriod, setReportPeriod] = useState("7 Days");
  const [searches, setSearches] = useState({});
  const [cart, setCart] = useState([]); // POS cart survives page changes
  const returnFocus = useRef(null);
  const toastId = useRef(0);

  const notify = useCallback((message, type = "success", title = type === "success" ? "Saved" : "Notice") => {
    const id = `toast-${++toastId.current}`;
    setToasts((list) => [...list, { id, message, type, title }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const openModal = useCallback((element) => {
    setModal((current) => {
      if (!current) returnFocus.current = document.activeElement;
      return element;
    });
  }, []);
  const closeModal = useCallback(() => {
    setModal(null);
    const target = returnFocus.current;
    returnFocus.current = null;
    setTimeout(() => { if (target?.isConnected) target.focus(); }, 0);
  }, []);

  const setPage = useCallback((next) => {
    if (!pageNames[next]) return;
    setPageState(next);
    if (location.pathname !== pathFor(next)) history.pushState({ page: next }, "", pathFor(next));
    document.body.classList.remove("nav-open");
    window.scrollTo({ top: 0 });
    setTimeout(() => document.getElementById("main-content")?.focus({ preventScroll: true }), 0);
  }, []);

  // Browser back / forward moves between pages; an unknown path is corrected to /.
  useEffect(() => {
    if (location.pathname !== pathFor(pageFromPath())) history.replaceState(null, "", pathFor(pageFromPath()) + location.search + location.hash);
    const onPop = () => { setPageState(pageFromPath()); setModal(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => { document.title = `${pageNames[page]} · CUECORE`; }, [page]);

  /**
   * perform(action, ...args): runs a store action and shows its message as a toast.
   * Returns true on success; on failure shows a warning toast and returns false.
   */
  const perform = useCallback((action, ...args) => {
    try {
      const message = run(action, ...args);
      if (typeof message === "string") notify(message);
      return true;
    } catch (error) {
      notify(error.message, "warning");
      return false;
    }
  }, [run, notify]);

  /** Renders the receipt synchronously, then opens the print dialog (print CSS shows only #receipt-print). */
  const printReceipt = useCallback((details) => {
    flushSync(() => setReceipt(details));
    window.print();
  }, []);

  const value = useMemo(() => ({
    page, setPage, modal, openModal, closeModal, notify, perform, printReceipt,
    reportPeriod, setReportPeriod, cart, setCart,
    search: searches[page] || "",
    setSearch: (text) => setSearches((all) => ({ ...all, [page]: text }))
  }), [page, setPage, modal, openModal, closeModal, notify, perform, printReceipt, reportPeriod, cart, searches]);

  return (
    <UiContext.Provider value={value}>
      {children}
      <div id="toast-region" className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <span className="toast-mark">{TOAST_MARK[t.type] || "i"}</span>
            <div><strong>{t.title}</strong><p>{t.message}</p></div>
            <button className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
      <section id="receipt-print" aria-label="Receipt">{receipt && <Receipt details={receipt} settings={settings} />}</section>
    </UiContext.Provider>
  );
}

export const useUi = () => useContext(UiContext);
