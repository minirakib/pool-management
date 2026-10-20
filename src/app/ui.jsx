import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Receipt from "@/components/Receipt.jsx";
import { canAccess, HOME, pageFromPath, pageNames, pathFor } from "@/app/routes.js";
import { hashPassword } from "@/lib/auth.js";
import { brandText } from "@/lib/brand.js";
import { useStore, useStoreApi } from "@/app/store.jsx";

const UiContext = createContext(null);
const SESSION_KEY = "cuecore.signed-in";
const readSession = () => { try { return localStorage.getItem(SESSION_KEY) || ""; } catch { return ""; } };
const TOAST_MARK = { success: "✓", warning: "!", error: "×", info: "i" };

/** App-wide UI state: current page, the open modal, toasts and filters shared between pages. */
export function UiProvider({ children }) {
  const { run } = useStoreApi();
  const { settings, users } = useStore();
  const [userId, setUserId] = useState(readSession);
  const user = users.find((u) => u.id === userId) || null;
  const role = user?.role || "";
  const roleRef = useRef(role);
  roleRef.current = role;
  const [receipt, setReceipt] = useState(null);
  const [page, setPageState] = useState(pageFromPath);
  const [modal, setModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [reportPeriod, setReportPeriod] = useState("7 Days");
  const [searches, setSearches] = useState({});
  const [cart, setCart] = useState([]); // POS cart survives page changes
  const returnFocus = useRef(null);
  const toastId = useRef(0);

  const toastTimer = useRef(null);

  // Only one toast at a time: a new notification replaces the current one in the same spot.
  const notify = useCallback((message, type = "success", title = type === "success" ? "Saved" : "Notice") => {
    const id = `toast-${++toastId.current}`;
    setToasts([{ id, message, type, title }]);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4200);
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
    if (!canAccess(roleRef.current, next)) { notify(`${pageNames[next]} is for Admin users only.`, "warning", "No access"); return; }
    setPageState(next);
    if (location.pathname !== pathFor(next)) history.pushState({ page: next }, "", pathFor(next));
    document.body.classList.remove("nav-open");
    window.scrollTo({ top: 0 });
    setTimeout(() => document.getElementById("main-content")?.focus({ preventScroll: true }), 0);
  }, [notify]);

  // Browser back / forward moves between pages; an unknown path is corrected to /.
  useEffect(() => {
    if (location.pathname !== pathFor(pageFromPath())) history.replaceState(null, "", pathFor(pageFromPath()) + location.search + location.hash);
    const onPop = () => { setPageState(pageFromPath()); setModal(null); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => { document.title = `${pageNames[page]} · ${brandText(settings)}`; }, [page, settings]);
  // The browser tab icon follows the uploaded club logo.
  useEffect(() => {
    const icon = document.querySelector("link[rel='icon']");
    if (!icon) return;
    icon.href = settings.logo || "/icon.svg";
    icon.type = settings.logo ? settings.logo.slice(5, settings.logo.indexOf(";")) : "image/svg+xml";
  }, [settings.logo]);

  // A User who lands on an Admin page (link, back button, sign-in) is moved to the home page.
  useEffect(() => {
    if (role && !canAccess(role, page)) { setPageState(HOME); history.replaceState(null, "", pathFor(HOME)); }
  }, [role, page]);

  /** Checks the username + password against the stored hash; returns false when they do not match. */
  const signIn = useCallback(async (username, password) => {
    const name = username.trim().toLowerCase();
    const found = users.find((u) => u.username === name);
    if (!found || found.passwordHash !== await hashPassword(name, password)) return false;
    try { localStorage.setItem(SESSION_KEY, found.id); } catch { /* private mode: signed in for this tab only */ }
    setUserId(found.id);
    return true;
  }, [users]);
  const signOut = useCallback(() => {
    try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setUserId("");
    setModal(null);
    setCart([]);
  }, []);
  const can = useCallback((target) => canAccess(roleRef.current, target), [role]); // eslint-disable-line react-hooks/exhaustive-deps

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
    user, isAdmin: role === "admin", can, signIn, signOut,
    page, setPage, modal, openModal, closeModal, notify, perform, printReceipt,
    reportPeriod, setReportPeriod, cart, setCart,
    search: searches[page] || "",
    setSearch: (text) => setSearches((all) => ({ ...all, [page]: text }))
  }), [user, role, can, signIn, signOut, page, setPage, modal, openModal, closeModal, notify, perform, printReceipt, reportPeriod, cart, searches]);

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
