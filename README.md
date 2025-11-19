# Tulamia Mini Food Shop (React + TYPO3)

React front-end for Tulamia’s mini food shop, powered by a TYPO3 v12 JSON API. Guests can browse the live menu, manage their cart, submit orders, and review the latest activity. PayPal integration is being implemented incrementally.

- GitHub Pages deployment notes: [deploy-to-github-pages-problem-solved.md](docs/deploy-to-github-pages-problem-solved.md)
- Full project guide: [project-guide.md](docs/project-guide.md)
- TYPO3 extension lives in `../TYPO3v12-Websites/tulamia-v12/packages/tulamia_site`

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` for the Vite dev server with hot module replacement.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the built output |
| `npm run lint` | ESLint (React hooks rules included) |

## Environment Variables

Create a `.env` file (not committed) with TYPO3 API configuration. **Do not** check real values into Git; the example below uses placeholder tokens:

```
VITE_TULAMIA_API_BASE=http://<your-typo3-host>/index.php
VITE_TULAMIA_API_EID=<fetch_eid_name>
VITE_TULAMIA_API_SAVE_EID=<save_eid_name>
VITE_TULAMIA_API_ORDER_EID=<order_eid_name>
VITE_TULAMIA_MENU_FILE_UID=<menu_file_uid>
VITE_TULAMIA_ORDER_FILE_UID=<order_file_uid>
VITE_TULAMIA_API_KEY=<shared_api_key>
```

Optional flags for future PayPal steps:

```
VITE_PAYPAL_CLIENT_ID=
VITE_ENABLE_PAYPAL=true
```

## TYPO3 Integration Overview

- `src/services/typo3Api.js` centralizes fetch helpers for menu (`fetchMenuItems`), order history (`fetchOrders`), and order saving (`saveOrder`).
- TYPO3 eID endpoints (registered in `packages/tulamia_site/ext_localconf.php`) read/write JSON files identified by File UIDs 65/66.
- Authentication is via shared `X-Api-Key` header; CORS + preflight handled server-side.
- `CheckoutForm` posts structured payloads (`customer`, `cart`, `totals`, `payment`). Orders are appended with generated IDs/timestamps.

## Payment Implementation Plan

1. Load PayPal JS SDK conditionally (env-gated) and expose provider status in UI.
2. Render PayPal Smart Buttons, creating orders based on cart totals.
3. Capture approvals, send final order payload to TYPO3 with PayPal transaction data, and refresh the receipt/order list.

Manual payment options (cash, Maestro, credit) already work via the existing order submission flow.

More detail—including scaffolding notes, tech stack, build instructions, data flow diagrams, and payment roadmap—can be found in [`docs/project-guide.md`](docs/project-guide.md).
