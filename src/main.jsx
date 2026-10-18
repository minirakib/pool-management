import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StoreProvider } from "./app/store.jsx";
import { UiProvider } from "./app/ui.jsx";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { isChunkError, reloadForNewVersion } from "./lib/staleDeploy.js";

// Fonts are bundled locally (no Google Fonts request), so they work offline and on slow links.
import "@fontsource/chakra-petch/latin-400.css";
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
import "@fontsource/orbitron/latin-600.css";
import "@fontsource/orbitron/latin-700.css";
import "@fontsource/orbitron/latin-800.css";
import "@fontsource/orbitron/latin-900.css";

// Original stylesheets in the original order, then styles for the newer pages (tables heading, details, reports, salary).
import "./styles/variables.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/tables.css";
import "./styles/pages.css";
import "./styles/responsive.css";
import "./styles/features.css";
import "./styles/modals.css";
import "./styles/inventory.css";
import "./styles/print.css";
import "./styles/app-shell.css";

// A page file from an older deploy is gone (a new Netlify deploy replaced it): reload once to get the new version.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});
window.addEventListener("unhandledrejection", (event) => {
  if (isChunkError(event.reason)) reloadForNewVersion();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <StoreProvider>
        <UiProvider>
          <App />
        </UiProvider>
      </StoreProvider>
    </ErrorBoundary>
  </StrictMode>
);
