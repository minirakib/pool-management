# CUECORE

CUECORE is a local-first, vanilla JavaScript demo for snooker club operations. It includes a live table floor, time-based session billing, counter sales, inventory, customer profiles, bookings, expenses, reports, staff directory, and club settings.

All records are demo data stored in this browser's `localStorage`; nothing is sent to a server. The UI does not provide real authentication, role enforcement, payment processing, or multi-device synchronization.

The product workflow was informed by the public CueDesk feature overview (live table timing and billing, member history, receipts, analytics, retail, inventory, expenses, and team operations). CUECORE uses its own name, visual system, layout, and implementation.

## Run locally

From this project directory, start the zero-dependency Node static server:

```sh
node serve.js
```

Then open <http://127.0.0.1:8000>. Keep the server process open while using the demo. ES modules require an HTTP origin; opening `index.html` directly is not supported. If Python is already installed, `python -m http.server 8000` is an alternative.

## Included workflows

- Dashboard summaries and revenue chart, with graceful SVG fallback if Chart.js is offline.
- Eight editable tables with realistic CSS-drawn surfaces, status/category filters, grid/list views, and independent live sessions.
- Start, pause, resume, move, detail, product-add, close, and print-receipt session actions. Session time is calculated from timestamps so suspended browser timers do not distort billing.
- Per-minute and started-hour billing, products, discounts, payment-method recording, and 80 mm receipt print styling.
- Booking overlap checks for confirmed reservations, customer records, counter POS, low-stock controls, expense tracking, filtered reports, and CSV/JSON exports.
- Dark/light theme and configurable club details saved locally.

## Design system

- "Neon arena" game-style UI: Orbitron for display text and numbers, Chakra Petch for interface text (loaded from Google Fonts; falls back to system fonts offline).
- Tokens live in `assets/css/variables.css`. The accent picked in Settings drives the glows, buttons, and charts; light and dark themes share the same components.
- Icons are inline SVGs from the `icon()` helper in `js/utils.js`.
- Responsive: a collapsible rail on desktop, an off-canvas drawer at 960px and below, and bottom-sheet dialogs on phones.

## Structure and desktop migration

- `index.html` is the predictable WebView root.
- `assets/css/` contains design tokens, shell/components, table artwork, responsive rules, and receipt printing.
- `js/data.js` supplies first-run sample data; `js/domain.js` contains billing and financial calculations; `js/storage.js` is the persistence/data-access boundary; `js/app.js` coordinates rendering and user actions.
- To connect a future PySide6/PyQt desktop application, replace the operations in `js/storage.js` with a local API or narrow WebView bridge. Keep authorization, payment capture, and financial integrity in that trusted Python/service layer—not in this frontend demo.

Use **Settings → Reset demo** to restore the original sample data on this device.
