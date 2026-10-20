import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { currentAccent } from "@/lib/theme.js";
import { loadState, resetState, saveState, STORAGE_KEY } from "@/app/storage.js";

const StateContext = createContext(null);
const StoreApiContext = createContext(null);

function LoadError({ message }) {
  return (
    <main style={{ maxWidth: 620, margin: "12vh auto", padding: 24, color: "#f3f7f4", font: "14px Segoe UI,Arial", background: "#1b241f", border: "1px solid #2a362e", borderRadius: 12 }}>
      <h1>CUECORE could not open saved demo data</h1>
      <p>{message}</p>
      <button onClick={() => { localStorage.removeItem(STORAGE_KEY); location.reload(); }}>Reset demo data</button>
    </main>
  );
}

export function StoreProvider({ children }) {
  const [boot] = useState(() => {
    try { return { state: loadState() }; }
    catch (error) { return { error }; }
  });
  const [state, setState] = useState(boot.state);
  const latest = useRef(state);

  /**
   * run(action, ...args): applies an action from actions.js to a copy of the state,
   * saves it, and returns the action's result. Errors thrown by the action leave state untouched.
   */
  const run = useCallback((action, ...args) => {
    const draft = structuredClone(latest.current);
    const result = action(draft, ...args);
    saveState(draft);
    latest.current = draft;
    setState(draft);
    return result;
  }, []);

  const reset = useCallback(() => {
    const fresh = resetState();
    latest.current = fresh;
    setState(fresh);
  }, []);

  // Theme + accent drive CSS variables on <html>, exactly like the original drawShell().
  useLayoutEffect(() => {
    if (!state) return;
    const root = document.documentElement;
    const accent = currentAccent(state.settings);
    root.dataset.theme = state.settings.theme !== "light" ? "dark" : "light";
    root.style.setProperty("--color-primary", accent);
    root.style.setProperty("--color-primary-hover", accent);
  }, [state?.settings.theme, state?.settings.accent]);

  /** Re-reads saved data after another tab changed it (the TV display follows the counter this way). */
  const reload = useCallback(() => {
    try {
      const fresh = loadState();
      latest.current = fresh;
      setState(fresh);
    } catch (error) {
      console.error("CUECORE could not reload saved data.", error);
    }
  }, []);

  const api = useMemo(() => ({ run, reset, reload }), [run, reset, reload]);
  if (boot.error) return <LoadError message={boot.error.message} />;

  return (
    <StateContext.Provider value={state}>
      <StoreApiContext.Provider value={api}>{children}</StoreApiContext.Provider>
    </StateContext.Provider>
  );
}

export const useStore = () => useContext(StateContext);
export const useStoreApi = () => useContext(StoreApiContext);

/** Warns when another tab changes saved data (same as the original). */
export function useStorageSync(onChange) {
  useEffect(() => {
    const listener = (event) => { if (event.key === STORAGE_KEY && event.newValue) onChange(); };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [onChange]);
}
