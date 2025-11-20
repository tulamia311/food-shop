# Supabase Authentication & Admin Access

This document explains how **authentication** is wired into the food-shop project, how we reached the current setup, and how **Supabase** links authenticated users to database permissions via **Row Level Security (RLS)**.

---

## 1. Journey: From no auth to admin-only workspace

### 1.1 Initial state

- The food shop started as a simple React app with no login.
- All visitors were anonymous customers: they could see the menu, add items to cart, and place orders.
- Data was served first from TYPO3 JSON, then migrated to Supabase (Postgres + Edge Functions).

### 1.2 New requirement: admin-only dashboard

We wanted:

- **Customers**: stay anonymous, no account required.
- **Admin**: log in to a protected admin tab where they can:
  - CRUD `menu_items` (add, edit, delete dishes).
  - Manage `orders` (update status, delete test orders).

Key constraints:

- The React app is public (GitHub Pages/Netlify), so the frontend code and `anon key` are not secret.
- Only authenticated **admin** must be able to change menu and orders.

### 1.3 Solution overview

We added:

- Supabase **email/password auth** for admins.
- An `AuthProvider` React context to track auth state (`session`, `user`, `isAdmin`).
- A two-tab layout:
  - **Customer view**: existing shop UI.
  - **Admin workspace**: admin-only dashboard with CRUD tools.
- **RLS policies** on `menu_items`, `orders`, `order_items`, `customers` so that only JWTs with `admin: true` in app metadata may write.
- The Edge Function `create-order` continues to use the **service role key** and bypasses RLS for order insertion.

---

## 2. Frontend auth setup

### 2.1 Supabase client

Configured in `src/services/supabaseClient.js` using Vite env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The client is used for:

- Public reads (menu, latest orders) via the anon key.
- Auth operations (sign in/out) and admin CRUD (using the authenticated user’s JWT).

### 2.2 AuthProvider (React context)

File: `src/context/AuthContext.jsx`

Responsibilities:

- Create a React context with:
  - `session`: current Supabase session (or `null`).
  - `user`: `session.user` convenience reference.
  - `isAdmin`: derived from `session.user.app_metadata.admin`.
  - `authLoading`: `true` while the session is being fetched.
  - `signIn(email, password)`: wraps `supabase.auth.signInWithPassword`.
  - `signOut()`: wraps `supabase.auth.signOut`.
- On mount:
  - Calls `supabase.auth.getSession()` to load any existing session.
  - Subscribes to `supabase.auth.onAuthStateChange` to react to login/logout.

This context is provided at the root in `src/main.jsx`:

```jsx
<StrictMode>
  <AuthProvider>
    <App />
  </AuthProvider>
</StrictMode>
```

### 2.3 Admin login & tabs

- `App.jsx` reads `const { isAdmin } = useAuth()`.
- It controls a simple **tab bar**:
  - Tab 1: "Customer view" → the existing shop UI.
  - Tab 2: "Admin workspace" → admin dashboard.
- `AdminDashboard` chooses between:
  - An `AdminLoginForm` if `isAdmin` is `false`.
  - The admin CRUD components if `isAdmin` is `true`.

`AdminLoginForm` is a simple email/password form that:

- Calls `signIn(email, password)` from the auth context.
- Shows basic status/error messages.

---

## 3. Setting up admin authentication in Supabase

### 3.1 Enable email/password auth

1. In the Supabase dashboard, open your project.
2. Go to **Authentication → Sign in/ Providers**.
3. Ensure **Email (magic link / password)** is enabled.

### 3.2 Create an admin user

1. Go to **Authentication → Users**.
2. Click **Add user**.
3. Enter an ***email*** and ***strong password***
4. Create the user.

You can now use this ***email/password*** to sign in on the **Admin** tab in the frontend, but the user is ***not yet*** marked as an **admin**.

### 3.3 Mark the user as admin via SQL

Supabase stores per-user configuration (like roles) in app metadata. We mark the admin using a JSON flag.

1. Open **SQL Editor** in the Supabase dashboard.
2. Run this statement, replacing the email with your admin email:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('admin', true)
where email = 'admin@example.com';
```

3. Re-open the user in **Authentication → Users** and confirm that `raw_app_meta_data` now contains:

```json
"raw_app_meta_data": {
  "provider": "email",
  "providers": ["email"],
  "admin": true
}
```

From now on:

- In the frontend: `session.user.app_metadata.admin === true`.
- In SQL policies: `auth.jwt() -> 'app_metadata' ? 'admin'` evaluates to `true` for this user.

---

## 4. Admin CRUD wiring

### 4.1 Menu management

File: `src/components/AdminMenuManager.jsx`

- Shows a table of `menu_items` (coming from `fetchMenuItems`).
- Lets an admin:
  - Click **Edit** on a row → pre-fills the form with that dish.
  - Change fields and click **Save menu item** → calls `upsertMenuItem`.
  - Click **Delete** → calls `deleteMenuItem` after confirmation.
- Uses `useAuth().isAdmin` to block non-admin usage with a friendly status message.

File: `src/services/adminApi.js`

- `upsertMenuItem(values)` → `supabase.from('menu_items').upsert(payload, { onConflict: 'id' })`.
- `deleteMenuItem(id)` → `supabase.from('menu_items').delete().eq('id', id)`.

### 4.2 Order management

File: `src/components/AdminOrdersManager.jsx`

- Shows a table of recent orders with customer, total, status, and timestamp.
- Per row actions:
  - Status dropdown (pending/paid/refunded/cancelled) → `updateOrderStatus(orderId, status)`.
  - Delete button (with confirmation) → `deleteOrder(orderId)`.

File: `src/services/adminApi.js`

- `updateOrderStatus(orderId, status)` → updates `orders.payment_status` for that ID.
- `deleteOrder(orderId)` → deletes the row from `orders` (and cascades to `order_items` if FK is `on delete cascade`).

All of these operations are performed via the Supabase JS client initialized with the **logged-in admin JWT**.

---

## 5. Row Level Security (RLS) and admin-only writes

### 5.1 Why RLS matters

Because the frontend is public and the anon key is embedded in the bundle:

- Any user could theoretically call the Supabase API directly.
- **Without RLS**, they could alter your data if the table is writeable by the `anon` role.

RLS ensures that:

- **Customers (anon)** can only perform operations you explicitly allow (e.g., read menu, maybe read latest orders).
- **Admins (authenticated JWT with `admin: true`)** can perform inserts/updates/deletes through the admin UI.

### 5.2 Enabling RLS

In the SQL Editor:

```sql
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customers enable row level security;
```

Once enabled, no rows are accessible via the API until at least one policy is defined for that table.

### 5.3 Read policies for customers

Depending on your needs, you can allow public reads of menu and/or orders:

```sql
-- Everyone (anon + authenticated) can read menu items
create policy "Public read menu_items" on public.menu_items
  for select
  using (true);

-- Optional: everyone can read order summaries for the "Latest orders" list
create policy "Public read orders" on public.orders
  for select
  using (true);

-- Optional: everyone can read order_items so nested carts are visible
create policy "Public read order_items" on public.order_items
  for select
  using (true);
```

You can tighten these later (for example, only allow admins to see orders), but this is enough for the current UI.

### 5.4 Write policies for admins only

These policies use the JWT helper `auth.jwt()` to check the `admin` flag in app metadata:

```sql
-- Admin-only writes on menu_items
create policy "Admin manage menu_items" on public.menu_items
  for all
  using (auth.jwt() -> 'app_metadata' ? 'admin')
  with check (auth.jwt() -> 'app_metadata' ? 'admin');

-- Admin-only writes on orders
create policy "Admin manage orders" on public.orders
  for all
  using (auth.jwt() -> 'app_metadata' ? 'admin')
  with check (auth.jwt() -> 'app_metadata' ? 'admin');

-- Admin-only writes on order_items
create policy "Admin manage order_items" on public.order_items
  for all
  using (auth.jwt() -> 'app_metadata' ? 'admin')
  with check (auth.jwt() -> 'app_metadata' ? 'admin');

-- Admin-only writes on customers (if needed)
create policy "Admin manage customers" on public.customers
  for all
  using (auth.jwt() -> 'app_metadata' ? 'admin')
  with check (auth.jwt() -> 'app_metadata' ? 'admin');
```

Interpretation in simple words:

- For any operation (`for all`) on these tables, Postgres checks:
  - Does the JWT contain `app_metadata.admin`? If yes → allow.
  - If no (anon customer or non-admin user) → block.

### 5.5 Edge Functions and RLS

The `create-order` Edge Function uses the **service role** key:

- The service role is a powerful key that bypasses RLS.
- This is intentional so that the checkout flow can always insert `customers`, `orders`, and `order_items` regardless of the frontend user.
- Only the function environment (server-side) has access to this key; the browser never sees it.

Net effect:

- Customers place orders anonymously → the Edge Function uses the service role key → inserts are allowed.
- Admins use the dashboard in the browser → JS client uses admin JWT → RLS policies enforce that only admins can change data.

---

## 6. JWTs: what they are and why they matter here

A **JWT (JSON Web Token)** is a signed JSON object that Supabase issues when a user logs in.

In this project the JWT is important because it:

- Proves to Supabase **who the user is** (`user.id`, `user.email`).
- Carries **app metadata**, including our `admin: true` flag.
- Is attached automatically to every **authenticated** Supabase JS client request.

On the **frontend**:

- After `signInWithPassword`, Supabase gives us a `session`:
  - `session.access_token` is the JWT.
  - `session.user.app_metadata.admin` is how we compute `isAdmin`.

In **RLS policies (SQL)**:

- Postgres can read the same JWT using the helper `auth.jwt()`:
  - `auth.jwt() -> 'app_metadata' ? 'admin'` checks if `admin` is set.
- That is how the database decides if a given request is allowed to write to `menu_items`, `orders`, etc.

## 7. How Supabase links auth users to data

Putting it all together:

1. **User signs in (admin)** in the React app:
   - `supabase.auth.signInWithPassword({ email, password })` returns a `session` with a JWT.
   - That JWT contains `user.id`, `user.email`, and `user.app_metadata.admin`.

2. **Frontend uses the session**:
   - `AuthProvider` stores `session` and computes `isAdmin` from `session.user.app_metadata.admin`.
   - Admin UI is shown/hidden based on `isAdmin`.

3. **Supabase client includes JWT**:
   - Any request like `supabase.from('menu_items').upsert(...)` automatically sends the admin JWT.
   - The database sees this JWT as `auth.jwt()` in RLS.

4. **RLS policies decide per row**:
   - For reads: `using (...)` clause decides if the row is visible.
   - For writes: `with check (...)` clause decides if new/updated data is allowed.

5. **Edge Functions use service role**:
   - They authenticate with the service role key, bypassing RLS for server-side tasks like `create-order`.

This gives you a secure, end-to-end flow from browser to database:

- Anonymous customers can browse menu and place orders.
- Only authenticated admin users (with `admin: true` in metadata) can modify menu items and orders.
- The database itself enforces these rules via RLS, even if someone calls the REST API directly.

## 8. JWT-based API keys and roles

Supabase exposes your Postgres database through a REST and JS API. Access is controlled by **API keys** and **JWTs**.

There are two main keys we use:

- **Anon public key** (`anon`):
  - Public, embedded in the frontend.
  - Represents either:
    - The `anon` Postgres role (if no user is logged in), or
    - The `authenticated` role with a user JWT (if logged in).
  - All **customer** traffic uses this key.

- **Service role key** (`service_role`):
  - **Secret**, must never be used in the browser.
  - Has full DB permissions and **bypasses RLS**.
  - Used only on the server (e.g. in Edge Functions).

How it works together:

- **Frontend**:
  - Uses the **anon key** to create the Supabase client (via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
  - If user is not logged in → requests run as `anon` with no user JWT.
  - If user is logged in → requests include the user JWT; RLS sees `auth.jwt()`.

- **Edge Functions**:
  - Use the **service role key** (via `EDGE_SUPABASE_URL` and `EDGE_SUPABASE_SERVICE_ROLE_KEY`) to create a server-side client.
  - RLS checks are bypassed, so system-level writes (like inserting orders) always succeed.

### 8.1 Keys used in this project

We use the keys in three places:

1. **Frontend (React app)**

   - Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
   - Used in `src/services/supabaseClient.js` to create the client.
   - Scope:
     - Public reads for menu and orders.
     - Auth (login/logout) for admin.
     - Admin CRUD when logged in (through JWT + RLS).

2. **Edge Function `create-order`**

   - Env vars (Deno): `EDGE_SUPABASE_URL`, `EDGE_SUPABASE_SERVICE_ROLE_KEY`.
   - Used in `supabase/functions/create-order/index.ts` to create a server-side client with the **service role key**.
   - Scope:
     - Insert `customers`, `orders`, `order_items` when a customer submits checkout.
     - Bypasses RLS by design so anonymous customers can create orders safely.

3. **Supabase Dashboard / SQL**

   - The dashboard itself uses the service role internally for admin operations.
   - When we write RLS policies, we assume:
     - `anon` + `authenticated` requests come from the browser.
     - `service_role` requests come from trusted backend code.

## 9. API keys vs Legacy API keys in Supabase

In the Supabase dashboard under **Settings → API**, you will typically see two areas where keys can appear:

- A tab called **API Keys**
- A tab called **Legacy API keys**

In our project / UI version, **the keys we actually use are shown under “Legacy API keys”**, not under “API Keys”. Supabase has been evolving how it presents and names keys, so different projects and UI versions can look slightly different.

In practice for this project:

- Under **Settings → API → Legacy API keys** you will find:
  - The **anon public key**
  - The **service_role secret key**
- These are the values we plug into:
  - Frontend env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Edge Function env vars: `EDGE_SUPABASE_URL`, `EDGE_SUPABASE_SERVICE_ROLE_KEY`

The newer **API Keys** tab is the place where Supabase is moving key management, but for this project and UI version:

- We **read and use** the keys from **Legacy API keys**.
- The “API Keys” tab can be ignored unless Supabase migrates this project to only use that view in the future.
