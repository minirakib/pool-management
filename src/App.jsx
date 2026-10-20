import { lazy, Suspense, useCallback, useEffect } from "react";
import { HOME, ROUTES, routeOf } from "@/app/routes.js";
import { useStorageSync } from "@/app/store.jsx";
import { useUi } from "@/app/ui.jsx";
import ErrorBoundary from "@/components/ErrorBoundary.jsx";
import LoginPage from "@/features/auth/LoginPage.jsx";
import TablesPage from "@/features/tables/TablesPage.jsx";
import Sidebar from "@/layout/Sidebar.jsx";
import Topbar from "@/layout/Topbar.jsx";

// Tables is the landing page and ships in the main bundle; every other page loads on first visit (see app/routes.js).
const pages = Object.fromEntries(ROUTES.map((r) => [r.id, r.load ? lazy(r.load) : TablesPage]));

/** Shown while a page's code downloads, so the content area is never empty. */
function PageLoading() {
  return <div className="page-loading" role="status" aria-label="Loading page"><span></span><span></span><span></span></div>;
}

export default function App() {
  const { user, can, page, setPage, modal, closeModal, notify } = useUi();
  const pageId = can(page) ? page : HOME;
  const Page = pages[pageId];
  const bare = !!routeOf(pageId).bare;

  // Bare pages (the TV display) reload the new data themselves instead of asking.
  useStorageSync(useCallback(() => { if (!bare) notify("Demo data changed in another browser tab. Reload to view the latest saved data.", "info", "Local data updated"); }, [notify, bare]));

  // Once the first page is up, fetch the other pages in the background: later clicks are
  // instant, and an open tab keeps working even after a new deploy removes the old files.
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    if (!user) return undefined;
    const id = idle(() => ROUTES.filter((r) => r.load && can(r.id)).forEach((r) => r.load().catch(() => {})));
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, [user, can]);

  if (!user) return <LoginPage />;

  if (bare) return (
    <ErrorBoundary resetKey={page} onHome={() => setPage(HOME)}>
      <Suspense fallback={<PageLoading />}><Page /></Suspense>
    </ErrorBoundary>
  );

  return (
    <>
      <div id="app" className="app-shell">
        <Sidebar />
        <section className="main-shell">
          <Topbar />
          <main id="main-content" className="main-content" tabIndex={-1}>
            <ErrorBoundary resetKey={page} onHome={() => setPage(HOME)}>
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
