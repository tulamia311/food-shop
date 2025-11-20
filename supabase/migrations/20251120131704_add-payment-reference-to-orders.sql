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