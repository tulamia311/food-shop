# PayPal Sandbox Integration (Food Shop)

This document describes the current PayPal **sandbox** integration in the food shop app using simple language.

- **Sandbox** = test mode, using fake money and test accounts.
- **Supabase Edge Function** = a small server-side function (mini backend) that runs on Supabase.
- **Frontend** = the React app that runs in the browser.
- **Environment variables** = configuration values stored in files like `.env`, not in the code.

### Visual overview

```mermaid
flowchart LR
  A[Customer in browser<br/>(React / CheckoutForm)] -->|clicks PayPal button| B[PayPal popup<br/>(sandbox)]
  B -->|payment approved| C[Edge Function<br/>capture-paypal-order]
  C -->|capture order| D[PayPal Sandbox API]
  C -->|save data| E[Supabase DB<br/>(customers, orders, order_items)]
  E -->|latest order data| A
```

Read this diagram as:

- The **browser** opens a PayPal popup.
- After approval, the **Edge Function** talks to **PayPal** and **Supabase**.
- The order is stored in the database and can later be shown in the UI.

---

## 1. Database schema & migrations

### 1.1 `orders` table

The `public.orders` table stores the main information about each order. Relevant columns for PayPal:

- `id uuid primary key` – order ID
- `customer_id uuid` – FK to `customers`
- `subtotal numeric(10,2)` – sum of line items
- `service_fee numeric(10,2)` – service fee
- `delivery_fee numeric(10,2)` – delivery fee
- `total numeric(10,2)` – overall order total
- `payment_provider text` – e.g. `paypal`, `manual`
- `payment_status text` – status from provider (e.g. `COMPLETED`)
- `notes text` – optional notes
- `payment_reference text` – **PayPal order ID / transaction reference**
- `created_at timestamptz default now()` – creation timestamp

### 1.2 Migration: `20251120131704_add-payment-reference-to-orders.sql`

File:

```text
supabase/migrations/20251120131704_add-payment-reference-to-orders.sql
```

Content (simplified):

```sql
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid,
  subtotal numeric(10,2) not null,
  service_fee numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_provider text,
  payment_status text,
  notes text,
  payment_reference text,
  created_at timestamptz default now()
);

alter table public.orders
  add column if not exists payment_reference text;
```

Design goals:

- **Local dev**: if `orders` did not exist, this migration creates it (including `payment_reference`).
- **Hosted project**: if `orders` already existed (created earlier via dashboard or SQL), the `alter table` with `if not exists` adds `payment_reference` safely.

### 1.3 Applying the migration

#### Local (Docker) database

From project root (`React/food-shop`):

```bash
supabase start
supabase db reset --local
```

What this does:

- Starts / restarts the local Supabase stack.
- Drops and recreates the local database.
- Replays all migrations from `supabase/migrations/` in order, including `20251120131704_add-payment-reference-to-orders.sql`.

#### Hosted Supabase project

Link the local project to the hosted Supabase project (one-time setup per folder):

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Then push migrations:

```bash
supabase db push
```

You will be prompted to confirm pushing pending migrations.

Verification query (run in **Supabase SQL editor** or locally):

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'orders'
order by ordinal_position;
```

You should see a `payment_reference | text` column.

---

## 2. Supabase Edge Function: `capture-paypal-order`

File:

```text
supabase/functions/capture-paypal-order/index.ts
```

### 2.1 Responsibility

The `capture-paypal-order` Edge Function (small server-side function running on Supabase):

- Receives data about the PayPal order from the frontend after the user approves a payment.
- Talks to the PayPal **Sandbox API** (PayPal's test HTTP API) to:
  - Get an **access token** (a short-lived key that proves we are allowed to call PayPal).
  - **Capture** the PayPal order (tell PayPal to actually take the money from the buyer's test account).
- Saves the order into Supabase tables (`customers`, `orders`, `order_items`):
  - Stores PayPal-related values in `payment_provider`, `payment_status`, and `payment_reference`.
- Sends back a JSON response to the frontend with success or error details.

### 2.2 Environment variables

Configured via `supabase/.env` (used by Edge Functions):

- `SUPABASE_URL` – service URL for the project
- `SUPABASE_SERVICE_ROLE_KEY` – service role key (for privileged DB access from Edge Functions)
- `EDGE_PAYPAL_CLIENT_ID` – **PayPal Sandbox** client ID for server-side API calls
- `EDGE_PAYPAL_CLIENT_SECRET` – **PayPal Sandbox** client secret

These are injected into the Deno runtime via `Deno.env.get(...)` in the function.

### 2.3 Behavior (high level)

1. **CORS & HTTP method**
   - **CORS** (Cross-Origin Resource Sharing) = browser security rules that control which websites are allowed to call this API.
   - Handles `OPTIONS` **preflight** requests (a small "check" request the browser sends before the real request, to ask if it is allowed).
   - Accepts `POST` requests with a JSON body that includes PayPal order information and the cart details needed to build DB records.

2. **PayPal access token**
   - Uses `EDGE_PAYPAL_CLIENT_ID` and `EDGE_PAYPAL_CLIENT_SECRET` to call the PayPal OAuth endpoint (OAuth = standard login/authorization system).

3. **Capture PayPal order**
   - Calls the PayPal `/v2/checkout/orders/{order_id}/capture` endpoint.
   - Checks the response from PayPal (HTTP status, whether the order is marked as `COMPLETED`, etc.).

4. **Insert data into Supabase**
   - Inserts or updates ("upserts") the `customer` row.
   - Inserts into `orders` with:
     - Money totals (subtotal, service fee, delivery fee, total).
     - `payment_provider = 'paypal'` (a string we chose as a convention).
     - `payment_status` from PayPal (e.g. `COMPLETED`).
     - `payment_reference` set to the PayPal order ID.
   - Inserts `order_items` based on the cart.

5. **Response**
   - Returns JSON with a success flag, order ID, and possibly PayPal capture info.
   - On error, returns a JSON error object with an HTTP status code and a human-readable message.

---

## 3. Frontend integration: `CheckoutForm`

File:

```text
src/components/CheckoutForm.jsx
```

### 3.1 Feature flags & environment variables

Frontend PayPal behavior is controlled by **Vite env vars** in `.env` (or `.env.local`):

- **Vite env vars** = special environment variables that start with `VITE_` and are exposed to the browser.

- `VITE_ENABLE_PAYPAL` – when set to a true-like value (for example `true`), enables PayPal in the UI (controls whether the PayPal script and buttons are shown).
- `VITE_PAYPAL_CLIENT_ID` – **PayPal Sandbox** client ID used by the **browser-side** PayPal JS SDK.

These are read via `import.meta.env.VITE_...`.

### 3.2 PayPal JS SDK loading

`CheckoutForm`:

- Dynamically loads the PayPal JS **SDK** script **only** when PayPal is enabled.
  - **SDK (Software Development Kit)** = official library from PayPal that provides pre-built buttons and helper functions.
- Uses the configured `VITE_PAYPAL_CLIENT_ID` and appropriate query parameters (for example `intent=capture`, currency) when loading the SDK.

### 3.3 Smart Buttons & Edge Function call

- Renders PayPal **Smart Buttons** (the official PayPal button components) when the SDK is ready.
- On **approval** (`onApprove` handler):
  - Uses the PayPal JS SDK to create/confirm the PayPal order in the browser.
  - Sends a POST request to the `capture-paypal-order` Edge Function (our server-side function) with the needed data:
    - User’s contact details.
    - Cart contents and totals.
    - PayPal order ID (for capture and `payment_reference`).
  - Waits for the Edge Function to:
    - Capture the PayPal payment.
    - Save the order into Supabase.
  - Updates the UI state to show success or error to the user.

### 3.4 Fallback manual submit path

The form still supports a **non-PayPal** path:

- Manual submit posts to the existing `create-order` Edge Function (or other backend logic).
- This is used when PayPal is disabled (e.g. `VITE_ENABLE_PAYPAL` is not set) or as a fallback.

This ensures the app works even if PayPal is not configured.

---

## 4. Running PayPal sandbox locally

### 4.1 Prerequisites

- Docker running (used by Supabase to run the local database and services).
- PayPal Sandbox account and **sandbox** REST app with client ID & secret.
- Supabase CLI (command line tool) installed and logged in.

### 4.2 Environment configuration

1. **Supabase Edge Functions env (`supabase/.env`)**:

   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EDGE_PAYPAL_CLIENT_ID`
   - `EDGE_PAYPAL_CLIENT_SECRET`

2. **Vite frontend env (`.env` or `.env.local` at project root)**:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ENABLE_PAYPAL=true`
   - `VITE_PAYPAL_CLIENT_ID=<sandbox client id>` (browser-side ID)

### 4.3 Start local services

From project root:

```bash
# Start Supabase local stack (if not already running)
supabase start

# Reset and apply migrations locally (optional but recommended during dev)
supabase db reset --local

# Run the capture-paypal-order function locally
supabase functions serve capture-paypal-order --env-file ./supabase/.env

# In another terminal: start the Vite dev server
npm run dev
```

Open the app in the browser (Vite URL, e.g. `http://localhost:5173/food-shop/`).

### 4.4 Manual QA flow (high level)

1. Add items to the cart.
2. Fill out the checkout form (name, email, etc.).
3. Use the **PayPal Smart Buttons**:
   - Log in with a **sandbox buyer**.
   - Approve the payment.
4. Confirm the UI shows success.
5. In Supabase (local or hosted, depending on which URL/keys you used), check:

   ```sql
   select id, total, payment_provider, payment_status, payment_reference, created_at
   from public.orders
   order by created_at desc
   limit 10;
   ```

   - `payment_provider` should be `paypal`.
   - `payment_status` should reflect the PayPal capture status (e.g. `COMPLETED`).
   - `payment_reference` should contain the PayPal order ID.

6. Optionally, disable PayPal (`VITE_ENABLE_PAYPAL` unset or false) and verify that the **fallback manual order submission** still works and persists orders.

---

## 5. Notes & future improvements

- The current implementation focuses on **client-initiated capture** via Smart Buttons and immediate persistence.
  - *Client-initiated* = the browser (client) starts the capture by calling our Edge Function after the user approves in the PayPal popup.
- For a more robust production setup, consider:
  - Adding extra server-side checks to make sure the totals we store match the amounts from PayPal.
  - Handling **webhooks** from PayPal for final state reconciliation.
    - **Webhook** = a callback HTTP request that PayPal sends to your server when something happens (for example, a payment is completed or refunded).
  - Adding clearer error messages and better logging around the Edge Function.

This document reflects the state of the PayPal **sandbox** integration at the time of implementation, including the shared `payment_reference` field in the `orders` table used by both local and hosted databases.
