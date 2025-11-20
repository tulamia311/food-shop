# Supabase in this project, and comparison with TYPO3 and PocketBase

This document explains the current role of **Supabase** in the food-shop project, compares it with **TYPO3** and **PocketBase**, and discusses whether the Supabase Free plan is sufficient for multiple similar projects.

---

## 1. The role of Supabase in this food-shop project

Supabase is currently responsible for four main areas:

1. **Primary database**
   - Tables: `menu_items`, `customers`, `orders`, `order_items`.
   - Stores menu configuration, customers, and all orders.

2. **Authentication provider**
   - Email/password login for the **admin** (customers remain anonymous).
   - Uses `app_metadata.admin = true` in the Supabase user record to distinguish admins.

3. **API + Row Level Security (RLS)**
   - Supabase JS client (with the anon key) is used in the React app for all DB access.
   - RLS policies enforce:
     - Anonymous customers: read-only access (menu, optional orders).
     - Admin with JWT (`admin: true`): can insert/update/delete menu items and orders.

4. **Edge Functions runtime**
   - `supabase/functions/create-order/index.ts` is an Edge Function that:
     - Receives checkout payloads from the frontend.
     - Inserts `customers`, `orders`, `order_items` using the **service_role** key.
     - Bypasses RLS by design, so anonymous customers can always place orders.

In short: Supabase acts as our **backend-as-a-service** for database, auth, authorization rules, and a small serverless function.

---

## 2. Supabase vs TYPO3 for this use case

### 2.1 Supabase advantages (for a React SPA + admin dashboard)

- **Database-first design**
  - Dedicated Postgres database.
  - Strong relational model, constraints, indexes.
  - Direct access with SQL and a consistent JS client.

- **Authentication and authorization out of the box**
  - Email/password, OAuth, JWT, MFA options.
  - Built-in helpers like `auth.jwt()` and `auth.uid()` for RLS policies.
  - Easy to implement role-based access (like `admin` vs anonymous).

- **Modern API experience**
  - First-class JS client with TypeScript support.
  - REST and Realtime APIs auto-generated from the schema.
  - Edge Functions close to the DB for small backend tasks.

- **Good fit for SPAs**
  - The React app can talk directly to Supabase.
  - No need to build and host a separate traditional backend.

### 2.2 TYPO3 advantages (as a CMS / web framework)

- **Content management**
  - Rich backend UI for editors: page tree, content elements, plugins.
  - Content versioning, workflows, complex page layouts.

- **Full-site framework**
  - Routing, templating, caching, localization, access control for pages.
  - Large ecosystem of extensions for content-heavy sites.

- **User/role system for website users and editors**
  - Backend users/groups for content editors and admins.
  - Frontend users/groups for member-only areas.

### 2.3 Why Supabase is a better fit here

For this **food-shop React SPA**, we primarily need:

- Data storage for menu and orders.
- Admin login and a secure admin API.
- One Edge Function for order creation.

TYPO3 could do this with extensions and custom APIs, but:

- TYPO3 is optimized for CMS-style content and server-rendered pages.
- We would have to maintain a TYPO3 extension to provide JSON APIs, auth tokens, and possibly JWT.
- The editor-focused backend is less important for this use case.

Supabase gives us a leaner stack: React + Supabase (DB + Auth + Edge Functions) without a heavy CMS layer.

---

## 3. Can TYPO3 offer similar capabilities to Supabase?

### 3.1 Database

- TYPO3 uses a relational database (MySQL/MariaDB/Postgres) underneath.
- It has an ORM-like DataHandler and Extbase models.
- You **can** define your own tables and manage them with TYPO3 extensions.

However:

- Exposing those tables as a clean JSON API for a SPA requires custom controllers or an API extension.
- You must handle versioning, authentication, and authorization logic yourself.

### 3.2 Authentication

- TYPO3 has built-in concepts of:
  - **Backend users** (editors/admins).
  - **Frontend users** (site members).
- You can protect pages, actions, and content based on these roles.

To mimic Supabase-style JWT-based auth for a React frontend, you would:

- Implement an API for login that returns tokens.
- Validate tokens on each request to your custom REST endpoints.
- Possibly integrate an extension or external identity provider.

### 3.3 Other functionality

- Forms, email sending, workflows, and content editing are very strong in TYPO3.
- But Supabase’s features like **Edge Functions**, **RLS**, and **hosted Postgres** are not built-in; they would be custom or external.

**Conclusion:** TYPO3 is powerful and extensible, but you would be building and maintaining more custom backend logic to reach the same DX that Supabase provides out-of-the-box for SPAs.

---

## 4. Supabase Free plan for several projects

### 4.1 Free plan limits (simplified)

Per project, as of November 2025:

- **Database size:** 500 MB
- **Storage:** 1 GB file storage
- **Auth:** 50,000 monthly active users (MAUs)
- **API / Realtime:** Generous default limits for connections and messages
- **Backups / PITR:** No automatic point-in-time recovery on Free
- **Pausing:** Project may pause after a period of inactivity

For this food-shop project:

- Menu and orders are small tables.
- Even thousands of orders will be far below 500 MB.
- Admin auth uses only a few users.

### 4.2 Multiple projects on Free

Running **3–4 projects similar to this food-shop** on Supabase Free is realistic if:

- Each project is its own Supabase project.
- Each stays within ~500 MB DB and 1 GB storage.
- Traffic is moderate (demo/small client sites, not huge public apps).

If any one project grows significantly (lots of data or traffic), you can upgrade just that project to a paid plan.

---

## 5. Supabase Free vs PocketBase

### 5.1 Supabase Free strengths

- Managed Postgres with migrations, SQL, and strong ecosystem.
- Integrated Auth with JWT, RLS, and fine-grained policies.
- Managed Edge Functions close to the DB.
- Minimal operations: no need to manage your own server, backups, SSL, etc.

For small-to-medium projects, Free gives you:

- Enough DB and storage.
- Strong security guarantees via RLS.
- Hosted infrastructure without extra ops.

### 5.2 PocketBase (very high-level)

- Self-hosted backend (single Go binary) with:
  - Collections (similar to tables).
  - Built-in auth.
  - Realtime subscriptions.
- You run it yourself on a VPS, Docker, or similar.

Pros:

- No SaaS pricing; you control hosting costs.
- Lightweight and fast; good for hobby or single-server deployments.

Cons compared to Supabase:

- You manage infrastructure: server uptime, backups, scaling, security patches.
- No managed Postgres; data model is PocketBase-specific.
- Fewer built-in primitives like RLS and a full SQL engine.

### 5.3 Is it worth migrating to PocketBase?

In this project’s current state:

- You are **well within** Supabase Free limits.
- You benefit from:
  - Hosted Postgres.
  - Auth + RLS.
  - Edge Functions.
- Your main focus is app logic and UI, not infrastructure.

Migrating to PocketBase could make sense if:

- You want **full control** and self-host all backends.
- You are comfortable managing backups, high availability, and updates yourself.
- You prefer a single binary over managed Postgres.

For a few small projects like this food-shop, the **Supabase Free plan is a good trade-off**:

- Strong features.
- Little operational burden.
- Easy to upgrade only the projects that outgrow Free.
