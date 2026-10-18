import { createDemoState } from "./seed.js";

// Same key as the original HTML version, so existing saved data keeps working.
export const STORAGE_KEY = "cuecore.demo.v1";

/**
 * Persistence boundary. To connect a desktop (PySide6/PyQt) bridge or a server later,
 * replace these functions; nothing else touches storage.
 */
export function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initial = createDemoState();
    saveState(initial);
    return initial;
  }
  const parsed = JSON.parse(saved);
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tables)) throw new Error("Saved demo data could not be loaded. Use Reset demo data to restore a clean sample.");
  // Data saved before the salary feature has no payroll records or salary amounts.
  parsed.salaries ??= [];
  parsed.staff.forEach((member) => { member.salary ??= 0; });
  return parsed;
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("CUECORE could not save demo data.", error);
    throw new Error("Demo data could not be saved. Check available browser storage.");
  }
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
  return loadState();
}
