# CUECORE

CUECORE is a local-first snooker club operations app: live table floor, time-based session billing, counter sales (POS), inventory, customers, bookings, expenses, reports, staff directory, staff salary (payroll) and settings.

It is the original HTML/CSS/JS project converted to **React + Vite**. The design, pages, snooker table artwork and behaviour are the same. The original stylesheets are used unchanged.

All records are demo data stored in this browser's `localStorage` under the same key as the HTML version (`cuecore.demo.v1`), so existing saved data keeps working. Nothing is sent to a server. There is no real authentication, role enforcement, payment processing or multi-device sync.

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
index.html                 WebView / browser entry
src/
  main.jsx                 Fonts, original CSS (same order), providers
  App.jsx                  Shell: sidebar + topbar + lazy page switch + modal root
  app/
    actions.js             All business operations (start/pause/close session, bookings,
                           sales, stock, staff, ...). Plain functions, unit tested.
    store.jsx              Holds state; run(action, ...args) applies an action to a copy,
                           saves it, and re-renders
    ui.jsx                 Current page, open modal, toasts, receipt printing, shared filters
    storage.js             Persistence boundary (localStorage today)
    seed.js                First-run sample data
  lib/
    domain.js              Billing, today-metrics and salary calculations
    format.js              Money, dates, durations, ids
    constants.js           Categories and payment methods
    theme.js               Accent colours
    download.js            CSV / JSON export
  components/              Icon, SnookerTable (pool board art), Modal, Live timers,
                           Receipt, shared field/pill/avatar pieces
  layout/                  Sidebar, Topbar (quick actions, notifications, profile)
  features/<page>/         One folder per page with its own modals
  styles/                  Original CSS files, plus features.css (newer pages) and modals.css (large popups)
tests/actions.test.js      Billing, sessions, bookings, sales, payroll and validation
```

### Conventions

- Components never change data directly. They call `run(action, ...args)` from `useStoreApi()`, or `perform(...)` from `useUi()`, which also shows the toast. Actions throw an `Error` with a user-facing message when something isn't allowed.
- Forms are plain uncontrolled inputs read with `FormData`, the same as the original. Form modals use `useFormAttempt()` to show validation errors inside the dialog.
- Table and session buttons all go through `useTableActions()`, so Tables, POS and the modals behave the same. Clicking anywhere on a table card opens its details popup.
- CSS class names are unchanged from the original. Restyle by editing `src/styles/`.

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

## Deploy to Vercel

Import the repository in Vercel; `vercel.json` sets everything (Vite, `npm run build`, output `dist`). No environment variables are needed.

What keeps a reload from showing a blank page:

- **Every page has a URL** (`/`, `/salary`, `/reports`, …). Vercel rewrites those paths to `index.html`, so reloading or opening a shared link shows the same page; unknown paths go to Tables. Missing files under `/assets/` still return a real 404.
- **Caching:** hashed files in `/assets/` are cached for a year; `index.html`, `sw.js` and the manifest are never cached, so each deploy is picked up on the next load.
- **New deploys:** if an open tab asks for a page file that a newer deploy removed, the app reloads once to get the new version (`vite:preloadError` + `ErrorBoundary`). Other pages are also downloaded in the background after start-up.
- **Errors never blank the screen:** pages, popups and the whole app sit inside error boundaries that show a Reload button.
- **Loading:** `index.html` has a built-in loading screen and applies the saved theme before scripts run. The service worker serves the app shell offline.
