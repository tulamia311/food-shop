# Tulamia Mini Food Shop (React + TYPO3)

React front-end for Tulamia’s mini food shop, powered by a TYPO3 v12 JSON API. Guests can browse the live menu, manage their cart, submit orders, and review the latest activity. PayPal integration is implemented in **sandbox** (test) mode.

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

Create a `.env` file (not committed) with Supabase and optional PayPal configuration. **Do not** check real values into Git.

### Supabase (primary backend)

Used by the React app to talk directly to Supabase (database, auth, orders):

```
VITE_SUPABASE_URL=https://<your-supabase-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### PayPal sandbox (optional, for online payments)

Used by the browser-side PayPal JS SDK in sandbox (test) mode:

```
VITE_PAYPAL_CLIENT_ID=<your-paypal-sandbox-client-id>
VITE_ENABLE_PAYPAL=true
```

See the PayPal docs in the **Docs** section below for full configuration.

### Legacy TYPO3 JSON API (optional)

These variables were used when the React app loaded data from a TYPO3 JSON API. The current version of the app uses **Supabase** as the main backend, so this block is only needed if you still use the old TYPO3 endpoints:

```
VITE_TULAMIA_API_BASE=http://<your-typo3-host>/index.php
VITE_TULAMIA_API_EID=<fetch_eid_name>
VITE_TULAMIA_API_SAVE_EID=<save_eid_name>
VITE_TULAMIA_API_ORDER_EID=<order_eid_name>
VITE_TULAMIA_MENU_FILE_UID=<menu_file_uid>
VITE_TULAMIA_ORDER_FILE_UID=<order_file_uid>
VITE_TULAMIA_API_KEY=<shared_api_key>
```

## TYPO3 Integration Overview

- `src/services/typo3Api.js` centralizes fetch helpers for menu (`fetchMenuItems`), order history (`fetchOrders`), and order saving (`saveOrder`).
- TYPO3 eID endpoints (registered in `packages/tulamia_site/ext_localconf.php`) read/write JSON files identified by File UIDs 65/66.
- Authentication is via shared `X-Api-Key` header; CORS + preflight handled server-side.
- `CheckoutForm` posts structured payloads (`customer`, `cart`, `totals`, `payment`). Orders are appended with generated IDs/timestamps.

## Payment Implementation Plan (short version)

1. Load PayPal JS SDK (Software Development Kit) conditionally and expose provider status in the UI.
2. Render PayPal Smart Buttons, creating orders based on cart totals.
3. Capture approvals, send final order payload to Supabase with PayPal transaction data, and refresh the receipt/order list.

Manual payment options (cash, Maestro, credit) already work via the existing order submission flow.

For detailed diagrams and step-by-step docs, see the **Docs** section below.

## Docs

All project documentation is in the `docs/` folder:

- [project-guide.md](docs/project-guide.md) – high-level overview of the React app, TYPO3 integration, and payment plan.
- [backend-plan-supabase.md](docs/backend-plan-supabase.md) – how the Supabase database, tables, and Edge Functions fit together.
- [supabase-auth.md](docs/supabase-auth.md) – how admin authentication (login) and Row Level Security (RLS – per-row access rules) work.
- [supabase-edge-function.md](docs/supabase-edge-function.md) – how to scaffold, run, and deploy the `create-order` Edge Function (server-side function) with the Supabase CLI (command line tool).
- [supabase-vs-typo3-pocketbase.md](docs/supabase-vs-typo3-pocketbase.md) – comparison of Supabase with TYPO3 and PocketBase, and why Supabase Free is enough here.
- [deploy-to-github-pages-problem-solved.md](docs/deploy-to-github-pages-problem-solved.md) – how we fixed the GitHub Pages blank-screen issue (Vite base path) and the recommended deploy flow.
- [paypal-sandbox-integration.md](docs/paypal-sandbox-integration.md) – full explanation of the PayPal **sandbox** (test mode) integration: schema, Edge Function, frontend wiring, and env vars.
- [paypal-sandbox-troubleshooting.md](docs/paypal-sandbox-troubleshooting.md) – real-world errors we hit during PayPal setup and how we solved each one.
