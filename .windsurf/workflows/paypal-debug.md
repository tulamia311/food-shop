---
description: Debug PayPal buttons not showing
auto_execution_mode: 1
---

You are Cascade. The PayPal buttons are NOT showing in my React CheckoutForm.

We use:
- Supabase for backend
- Vite React frontend
- PayPal JS SDK loaded with VITE_PAYPAL_CLIENT_ID and VITE_ENABLE_PAYPAL
- Edge Function `capture-paypal-order`

Guide me through debugging with:
1. Checks in the browser console (for PayPal SDK 400s, env flags).
2. What to log from the component (for example PAYPAL_ENV_FLAG, hasPaypalClientId, supabaseAvailable, paypalEnabled, showPayPalButtons).
3. Typical causes:
   - Missing VITE_PAYPAL_CLIENT_ID or VITE_ENABLE_PAYPAL
   - Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
   - Wrong PayPal SDK URL parameters (like wrong intent value)
4. Exact code snippets I should add or verify in CheckoutForm.jsx, BUT keep them small and focused.

Use very simple words and explain technical terms in parentheses the first time.