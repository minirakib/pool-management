# CUECORE

CUECORE is a local-first snooker club operations app: live table floor, time-based session billing (AC / Non-AC, per minute, per hour or single game), bill splitting, counter sales (POS), arcade coin sales, inventory, customers, bookings, expenses, reports, staff directory, staff salary (payroll) and settings.

It is the original HTML/CSS/JS project converted to **React + Vite**. The design, pages, snooker table artwork and behaviour are the same. The original stylesheets are used unchanged.

All records are demo data stored in this browser's `localStorage` under the same key as the HTML version (`cuecore.demo.v1`), so existing saved data keeps working. Nothing is sent to a server. Sign-in and the Admin / User levels run in the browser (see **Users and access**). There is no payment processing or multi-device sync.

## Run

```sh
npm install
npm run dev       # development server with hot reload
npm run build     # production build in dist/
npm run preview   # serve the production build
npm test          # business-logic tests (Node's built-in test runner)
```

## Fast on slow internet

- **No CDN requests.** The Orbitron and Chakra Petch fonts are bundled from `@fontsource`, and Chart.js is an npm package. Nothing loads from Google Fonts or jsDelivr.
- **Code splitting.** The Tables page loads first. Every other page is a small chunk (about 1.5–2.7 KB gzipped) loaded the first time you open it. Chart.js (about 70 KB gzipped) loads only when a chart is shown, and the original SVG chart is drawn while it loads.
- **Works offline.** A service worker (`vite-plugin-pwa`) caches the app, fonts and Chart.js on the first visit. Later visits open instantly with no network, and the app can be installed to the home screen.
- **Only live parts tick.** Timers and live bills re-render once a second, not the whole page.

## Project structure

```
index.html                     WebView / browser entry
vite.config.js                 Vite + PWA; "@/..." import alias → src/
jsconfig.json                  Same alias for the editor (go-to-definition, auto-imports)
src/
  main.jsx                     Fonts, global styles, providers
  App.jsx                      Shell: sign-in gate, sidebar + topbar, lazy page switch, modal root
  app/                         App state and wiring
    routes.js                  ★ Every page: URL, title, sidebar group/menu, icon, access level, lazy loader
    store.jsx                  Holds state; run(action, ...args) applies an action to a copy, saves, re-renders
    ui.jsx                     Signed-in user, current page, modal, toasts, receipt printing, shared filters
    storage.js                 Persistence boundary (localStorage today) + upgrades for older saved data
    seed.js                    First-run sample data
    actions/                   Business operations, one file per area (unit tested)
      index.js                 Re-exports everything: import { saveBooking } from "@/app/actions"
      helpers.js               findTable, tableSession, lowStockCount, fail
      tables.js  pos.js  arcade.js  bookings.js  customers.js  inventory.js
      expenses.js  staff.js  salary.js  users.js  settings.js  records.js
  lib/                         Pure helpers, no React
    domain.js                  Billing (AC/Non-AC, per minute/hour, single game), bill split, metrics, salary
    auth.js                    Roles, password hashing, starter accounts
    format.js  constants.js  theme.js  download.js  staleDeploy.js
  hooks/                       useNow (1-second clock), useDragScroll
  components/                  Shared across pages
    ui/                        Building blocks: PageHeading, MiniStats, Segmented, ChoiceGroup, Field,
                               Select, SearchBox, StatusPill, Avatar, EmptyState, AnalyticsStrip
                               → import { PageHeading, Segmented } from "@/components/ui"
    snooker/                   SnookerTable artwork, ClothPicker, TableOverlay (live timer + player)
    Icon.jsx  Modal.jsx  Live.jsx  Receipt.jsx  ErrorBoundary.jsx
  layout/                      Sidebar (built from routes.js), Topbar
  features/<page>/             One folder per page: the page, its popups, page-only CSS
    tables/                    TablesPage, useTableActions, modals/ (one file per popup)
    pos/                       PosSalesPage (+ pos.css), PosTablesPage, PosTransactions
    arcade/                    ArcadePage (+ arcade.css)
    auth/                      LoginPage (+ login.css)
    reports/  bookings/  customers/  inventory/  expenses/  staff/  salary/  settings/
  styles/                      Global CSS; index.css imports them in cascade order
tests/actions.test.js          Billing, sessions, bookings, sales, payroll and validation
```

### Conventions

- **Imports.** UI code imports with the `@/` alias (`@/components/ui`, `@/app/actions`). Files in the same feature folder use `./`. Pure logic that the tests run directly in Node (`src/lib`, `src/app/actions`, `src/app/seed.js`, `features/expenses/period.js`) keeps relative imports, because Node does not know the alias.
- **Adding a page.** Create `src/features/<name>/<Name>Page.jsx` and add one entry to `src/app/routes.js`. The sidebar, URL, page title, topbar search, access check and lazy loading all come from that entry.
- **Changing data.** Components never change data directly. They call `run(action, ...args)` from `useStoreApi()`, or `perform(...)` from `useUi()`, which also shows the toast. Actions throw an `Error` with a user-facing message when something is not allowed. New actions go in the matching `src/app/actions/<area>.js` file.
- **Forms.** Plain uncontrolled inputs read with `FormData`. Form modals use `useFormAttempt()` to show validation errors inside the dialog.
- **Tables.** Table and session buttons all go through `useTableActions()`, so Tables, POS and the popups behave the same.
- **Styles.** The global look lives in `src/styles/` (tokens in `variables.css`, form controls in `forms.css`). Styles used by only one page sit next to it and load with it.

## Users and access

Sign in with a username and password. There are two levels:

| Level | Pages |
|---|---|
| **Admin** | Everything |
| **User** | Tables, Bookings, POS (Sales + Table) and Arcade |

Starter accounts: **admin / admin123** and **staff / staff123**. Change them in **Settings → Users** (add, edit, reset password, remove; at least one Admin is always kept). On the pages a User can open, Admin-only controls are hidden: adding or editing tables, the arcade coin price and "Set total", and links to Admin pages.

Passwords are stored as SHA-256 hashes in this browser's storage. This keeps staff on their own pages; it is not protection against someone with full access to the device.

## Arcade

**Arcade** sells arcade coins: enter the number of coins (or tap 5 / 10 / 20 / 30 / 50), see coins × price and the remaining stock, pick the payment method and sell. **Coin stock** adds coins or sets an exact total, with a history of every change. The **Reports** tab shows a daily report (pick a date) and the all-time total by day, with CSV export. The coin price and total coins are also in **Settings → Arcade coins**.

## Desktop migration

To connect a future PySide6/PyQt desktop app, replace the functions in `src/app/storage.js` with a local API or a narrow WebView bridge. Keep authorization, payment capture and financial integrity in that trusted Python/service layer, not in this frontend.

## Board colours

Each table has its own cloth colour: Classic green, Tournament blue, Red, Purple, Teal, Grey or Black. Pick it in **Tables → Edit** (the ⋯ button). New tables use the club default, set in **Settings → Table board color**, which can also apply one colour to every table. The presets are CSS variables in `src/styles/tables.css` under `[data-cloth]`, and the list is `clothColors` in `src/lib/constants.js`.

Use **Settings → Reset demo** to restore the original sample data (3 tables) on this device.

## Salary

**Salary** keeps a monthly pay record for each staff member: base salary, bonus, overtime, deductions and advance, with the net pay worked out for you. Set each person's monthly salary in **Staff → Edit**, then use **Run payroll** to create pending entries for every active staff member for the chosen month. Click a row to open the payslip, which you can edit or print (80 mm).

Paying a salary records the net amount as a **Staff Salary** expense, so Expenses and Reports stay correct. Undoing a payment, or deleting the salary entry, removes that expense. Deleting the expense on the Expenses page moves the salary back to pending.

## Expenses

Pick a **Day**, **Month**, **Year**, **Custom** range or **All** at the top of Expenses; the arrows step to the previous or next day, month or year. Category, payment method and search narrow the list further, and clicking a category in "By category" filters by it. Everything on the page (totals, trend chart, category breakdown, table) follows the selected period and filters.

**CSV** downloads exactly what is selected, as all entries, daily totals, monthly totals or totals by category. The file name includes the period, for example `cuecore-expenses-daily-2026-10.csv`. The period logic is in `src/features/expenses/period.js`.

## Deploy to Netlify

Connect the repository in Netlify (Add new site → Import an existing project). `netlify.toml` sets everything: build command `npm run build`, publish directory `dist`, Node 22. No environment variables are needed. A manual deploy also works: run `npm run build` and drag the `dist` folder onto Netlify.

What keeps a reload from showing a blank page:

- **Every page has a URL** (`/`, `/salary`, `/reports`, …). Netlify rewrites those paths to `index.html` (status 200, the address stays the same), so reloading or opening a shared link shows the same page; unknown paths go to Tables. A missing file under `/assets/` returns a real 404 (`public/404.html`) instead of HTML.
- **Caching:** hashed files in `/assets/` are cached for a year; `index.html`, `sw.js`, `registerSW.js` and the manifest are always revalidated, so each deploy is picked up on the next load.
- **New deploys:** if an open tab asks for a page file that a newer deploy removed, the app reloads once to get the new version (`vite:preloadError` + `ErrorBoundary`, logic in `src/lib/staleDeploy.js`). Other pages are also downloaded in the background after start-up.
- **Errors never blank the screen:** pages, popups and the whole app sit inside error boundaries that show a Reload button.
- **Loading:** `index.html` has a built-in loading screen and applies the saved theme before scripts run. The service worker serves the app shell offline.
