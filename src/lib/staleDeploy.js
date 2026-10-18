const RELOAD_KEY = "cuecore.chunk-reload";

/** True for "this JS file no longer exists" errors, which happen after a new deploy replaces the old files. */
export const isChunkError = (error) => /dynamically imported module|Importing a module script failed|Failed to fetch|Loading chunk|preload/i.test(String(error?.message || error));

/**
 * Reloads the page once to pick up the new deploy. A timestamp guard stops a reload loop
 * if the file is really missing; returns false when a reload was already tried recently.
 */
export function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 15_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch { /* storage blocked: still try one reload */ }
  location.reload();
  return true;
}
