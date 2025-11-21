---
description: PayPal sandbox QA guide
auto_execution_mode: 1
---

You are Cascade. I want to run a full PayPal SANDBOX QA for my React app.

Please:
1. Assume the backend is Supabase with an Edge Function called `capture-paypal-order`.
2. Assume the frontend is a Vite React app with a [CheckoutForm](cci:1://file:///home/toni/TULAMIA/DBE/React/food-shop/src/components/CheckoutForm.jsx:16:0-273:1) that uses PayPal Smart Buttons.

Give me a SHORT checklist that covers:
- Required env vars for:
  - supabase/.env (EDGE_PAYPAL_CLIENT_ID, EDGE_PAYPAL_CLIENT_SECRET)
  - shell exports (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  - root .env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ENABLE_PAYPAL, VITE_PAYPAL_CLIENT_ID)
- Commands to start:
  - supabase stack
  - Edge Functions server
  - Vite dev server
- Exact browser steps to:
  - Add items to cart, choose PayPal, click PayPal button
  - Log in with sandbox account
  - Verify DB row in `public.orders` with payment_provider='paypal' and a payment_reference
Keep it concise and use simple language.