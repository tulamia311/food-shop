# Tulamia Mini Food Shop – Project Guide

## 1. Scaffolding & Project Layout

- Generated with **Vite** using `npm create vite@latest food-shop -- --template react`.
- React 19 entry point lives in `src/main.jsx`, which mounts `src/App.jsx` inside `#root` defined in `index.html`.
- Vite handles dev server, HMR, build outputs (`dist/`), and static asset handling (`public/`).
- ESLint 9 with Vite's recommended React config keeps code quality consistent.

```
food-shop/
├── public/              # Static assets copied as-is
├── src/
│   ├── components/      # UI building blocks (menu, cart, checkout)
│   ├── context/         # Cart state management via React Context
│   ├── data/            # Local fallback menu dataset
│   ├── services/        # TYPO3 API helpers
│   ├── App.jsx / App.css# Main experience + styling
│   └── main.jsx         # React bootstrap
├── docs/                # Project documentation (this file)
├── vite.config.js       # Vite + React plugin config
└── package.json         # Scripts & dependencies
```

## 2. Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| UI | **React 19** + Context API | Declarative UI, cart state, hooks |
| Dev/build | **Vite 7** | Fast dev server, optimized builds |
| Styling | Plain CSS (`App.css`, `index.css`) | Custom responsive design & print styles |
| Linting | ESLint 9 + `@vitejs/plugin-react` | Static analysis & hooks rules |
| Backend | **TYPO3 v12** eID endpoints | JSON API for menu/order data persistence |
| Auth | Shared API key (`X-Api-Key`) | Simple password gate for TYPO3 endpoints |
| Payments (planned) | PayPal JS SDK + manual methods | Cash, card, PayPal flows |

## 3. Run, Test & Build

Prerequisites: Node.js 20+ (matching Vite recommendation) and npm 10.

- **Install:** `npm install`
- **Local dev server:** `npm run dev`
  - Opens Vite on `http://localhost:5173` with HMR.
- **Lint:** `npm run lint`
- **Production build:** `npm run build`
  - Outputs static assets to `dist/` ready to deploy behind TYPO3 or any static host.
- **Preview build:** `npm run preview`

## 4. TYPO3 ↔ React Data Flow

1. **Environment configuration** (see `.env`, kept local):
   - `VITE_TULAMIA_API_BASE=http://<your-typo3-host>/index.php`
   - `VITE_TULAMIA_API_EID=<fetch_eid_name>`
   - `VITE_TULAMIA_API_SAVE_EID=<save_eid_name>`
   - `VITE_TULAMIA_API_ORDER_EID=<order_eid_name>`
   - `VITE_TULAMIA_MENU_FILE_UID=<menu_file_uid>` and `VITE_TULAMIA_ORDER_FILE_UID=<order_file_uid>`
   - `VITE_TULAMIA_API_KEY=<shared_api_key>`
   - Store the actual values outside Git (dotenv, CI secrets, deployment env vars) and rotate the shared key periodically.

2. **Fetching menu data** (`fetchMenuItems` in `src/services/typo3Api.js`):
   - GET request to `index.php?eID={API_EID}&fileUid={MENU_UID}` with `X-Api-Key` header.
   - Successful payload populates `CartProvider` so `MenuGrid` shows live dishes; falls back to `src/data/menuItems.js` on failure.

3. **Order submission** (`saveOrder` helper, invoked by `CheckoutForm`):
   - POST JSON body with `{ customer, cart, totals, payment }` to `tulamia_site_api_order_save` endpoint.
   - TYPO3 `ApiDataController::saveOrderAction` appends order objects inside the File UID 66 JSON file with generated ID + timestamp.

4. **Order dashboard** (`fetchOrders`):
   - Pulls latest entries from the same order file to display the “Latest orders” card.

5. **Security & CORS:**
   - Controller enforces shared API key, adds CORS headers, and handles OPTIONS preflight.
   - Keep the key secret (environment only) and consider rotating for production.

## 5. Payment Method Implementation Plan

The UI already offers a payment selector (Cash, PayPal, Maestro, Credit card). Implementation roadmap:

1. **Step 1 – PayPal SDK loading (in progress):**
   - Inject `<script src="https://www.paypal.com/sdk/js?...">` dynamically once env-specific keys exist.
   - Gate loading by environment flag (`VITE_PAYPAL_CLIENT_ID` + `VITE_ENABLE_PAYPAL=true`).

2. **Step 2 – Render Smart Buttons:**
   - Mount PayPal Buttons inside `CheckoutForm` once SDK resolves.
   - Use `createOrder` to pass cart totals and metadata (customer + TYPO3 order draft ID).
   - Handle `onApprove` to call `actions.order.capture()`.

3. **Step 3 – Persist capture + UX polish:**
   - After capture, POST to TYPO3 order endpoint with `payment.status='paid'` and PayPal transaction details.
   - Update UI to reflect approval, disable manual submit, and refresh order history.
   - Provide error handling fallback (revert to manual payments).

4. **Non-PayPal methods:**
   - Cash / card entries continue to flow through the existing POST, simply tagging `payment.provider` and `payment.status` (`pending`, `paid`, etc.).

5. **Future hardening ideas:**
   - Server-side order validation before capture (double-check totals).
   - Webhook listener in TYPO3 for asynchronous updates.
   - Masked logging for PII.

Refer back to this guide whenever onboarding new contributors or extending the payment experience.
