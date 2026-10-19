import { Component } from "react";
import { isChunkError, reloadForNewVersion } from "@/lib/staleDeploy.js";

/**
 * Catches render errors so the app never turns into a blank page. Shows a small recovery
 * screen instead; a missing page file (stale deploy) triggers one automatic reload.
 * Pass `resetKey` (e.g. the page id) so moving to another page clears the error; `overlay` shows it as a popup.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("CUECORE page error", error, info?.componentStack);
    if (isChunkError(error)) reloadForNewVersion();
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const stale = isChunkError(error);
    return (
      <div className={`crash-panel${this.props.overlay ? " crash-overlay" : ""}`} role="alert">
        <span className="crash-icon">!</span>
        <h2>{stale ? "A new version is available" : "This page could not be shown"}</h2>
        <p>{stale ? "The app was updated. Reload to get the latest version — your saved data is kept." : "Your saved data is safe. Reload the page, or go back to Tables."}</p>
        <div className="crash-actions">
          <button className="button button-primary" onClick={() => location.reload()}>Reload</button>
          {!stale && this.props.onHome && <button className="button" onClick={() => { this.setState({ error: null }); this.props.onHome(); }}>{this.props.homeLabel || "Go to Tables"}</button>}
        </div>
        {!stale && <details className="crash-details"><summary>Error details</summary><code>{String(error?.message || error)}</code></details>}
      </div>
    );
  }
}
