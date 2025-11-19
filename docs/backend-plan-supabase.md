# Backend & Database Plan (Supabase)

## 1. Stack & Hosting
- **Supabase** (Postgres + API + Edge Functions) keeps credentials server-side, ships with HTTPS, and supports Row Level Security.
- Data access pattern:
  - Public reads (menu, latest orders) use Supabase REST endpoints with the anon key (read-only, restricted via RLS).
  - Writes (saving orders, future PayPal callbacks) go through Edge Functions that run with the service role key.

## 2. Database Schema (SQL)
```sql
create table public.menu_items (
  id text primary key,
  name text not null,
  description text,
  price numeric(10,2) not null,
  tags text[] default '{}',
  emoji text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  fulfillment text check (fulfillment in ('pickup','delivery')) default 'pickup',
  created_at timestamptz default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  subtotal numeric(10,2) not null,
  service_fee numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_provider text,
  payment_status text,
  notes text,
  created_at timestamptz default now()
);

create table public.order_items (
  order_id uuid references public.orders(id) on delete cascade,
  menu_item_id text references public.menu_items(id),
  quantity integer not null,
  unit_price numeric(10,2) not null,
  primary key (order_id, menu_item_id)
);
```

### Seed menu items
Use the existing `public/json/dishes.json` contents:
```sql
insert into public.menu_items (id, name, description, price, tags, emoji)
values
  ('brezel','Brezel','Freshly baked Bavarian pretzel with flaky salt and a crunchy crust.',3.2,'{"snack"}','🥨'),
  ('riceball','Riceball','Crispy onigiri stuffed with savory mushroom filling and sesame.',4.5,'{"vegan","popular"}','🍙'),
  ('hotpot','Mini Hot Pot','Rich miso broth with seasonal veggies, tofu, and udon.',12,'{"comfort"}','🍲'),
  ('fried-noodles','Gebratene Nudeln','Wok-tossed noodles with crunchy veggies, egg, and soy glaze.',9.5,'{"classic"}','🍜'),
  ('bao-duo','Bao Duo','Two steamed bao buns with pickled veggies and hoisin glaze.',8,'{"street-food"}','🥟');
```

## 3. Security / RLS
Example policies:
```sql
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.customers enable row level security;

create policy "Public read menu" on public.menu_items
  for select using (true);

create policy "Read own data via service role" on public.orders
  for select using (auth.role() = 'service_role');
```
Edge Functions (running with service role key) bypass RLS for writes.

## 4. API Surface
| Endpoint | Method | Handler | Notes |
| --- | --- | --- | --- |
| `/menu` | GET | Supabase REST (`/rest/v1/menu_items?select=*`) | Public read; use anon key |
| `/orders` | GET | (optional) Supabase REST with service role or admin session | Only if dashboard needs it |
| `/orders` | POST | Edge Function `create-order` | Validates payload, inserts into `customers`, `orders`, `order_items`, returns `{ orderId }` |

### Edge Function pseudo-code (`create-order`)
```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

export default async (req) => {
  const { customer, cart, totals, payment } = await req.json()
  // TODO: validate fields

  const { data: customerRow, error: customerError } = await supabase
    .from('customers')
    .insert({ name: customer.name, email: customer.email, fulfillment: customer.fulfillment })
    .select()
    .single()

  if (customerError) return new Response(customerError.message, { status: 400 })

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerRow.id,
      subtotal: totals.subtotal,
      service_fee: totals.serviceFee,
      delivery_fee: totals.deliveryFee ?? 0,
      total: totals.total,
      payment_provider: payment.provider,
      payment_status: payment.status,
      notes: customer.notes,
    })
    .select()
    .single()

  if (orderError) return new Response(orderError.message, { status: 400 })

  const orderItems = cart.map((item) => ({
    order_id: orderRow.id,
    menu_item_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) return new Response(itemsError.message, { status: 400 })

  return new Response(JSON.stringify({ orderId: orderRow.id }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
```

## 5. React Integration Plan
1. **Environment variables**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (build/Edge Function only, never in client)

2. **Data service refactor**
   - Update `fetchMenuItems` to call `fetch(`${SUPABASE_URL}/rest/v1/menu_items?select=*`, { headers: { apikey: anonKey } })`.
   - Keep current JSON/local fallback until Supabase is confirmed.
   - Update `fetchOrders` if we decide to surface order history publicly (or gate behind admin).

3. **Order saving**
   - Replace `saveOrder` with a POST to the Edge Function endpoint (`/functions/v1/create-order`).
   - Handle errors gracefully (network issues, validation feedback).

4. **Deployment**
   - Store anon key in frontend env; store service role key in Supabase Edge Function settings or CI secrets.
   - Update docs + README to describe the new backend workflow.

## 6. Next Steps Checklist
- [ ] Provision Supabase project + env secrets.
- [ ] Run schema SQL & seed menu.
- [ ] Implement `create-order` Edge Function.
- [ ] Wire React data service to Supabase endpoints.
- [ ] Remove temporary JSON/localStorage once verified.
