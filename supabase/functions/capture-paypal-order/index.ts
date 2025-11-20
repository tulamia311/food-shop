import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const PAYPAL_CLIENT_ID = Deno.env.get("EDGE_PAYPAL_CLIENT_ID") ?? Deno.env.get("PAYPAL_CLIENT_ID")
const PAYPAL_CLIENT_SECRET =
  Deno.env.get("EDGE_PAYPAL_CLIENT_SECRET") ?? Deno.env.get("PAYPAL_CLIENT_SECRET")
const PAYPAL_API_BASE =
  Deno.env.get("EDGE_PAYPAL_API_BASE") ?? Deno.env.get("PAYPAL_API_BASE") ??
    "https://api-m.sandbox.paypal.com"

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variable")
}

if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  throw new Error("Missing PayPal client credentials")
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  })
}

type PayPalOrderPayload = {
  orderId: string
  customer: {
    name: string
    email?: string
    fulfillment?: string
    notes?: string
  }
  cart: Array<{ id: string; quantity: number; price: number }>
  totals: {
    subtotal: number
    serviceFee?: number
    deliveryFee?: number
    total: number
  }
}

async function getPayPalAccessToken() {
  const basicAuth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`PayPal auth failed: ${response.status} ${errorBody}`)
  }

  const json = await response.json() as { access_token: string }
  if (!json.access_token) throw new Error("PayPal auth response missing access_token")
  return json.access_token
}

async function capturePayPalOrder(orderId: string, accessToken: string) {
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
      Prefer: "return=representation",
    },
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`PayPal capture failed: ${response.status} ${errorBody}`)
  }

  const json = await response.json()
  return json
}

async function insertCustomer(customer: PayPalOrderPayload["customer"]) {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: customer?.name,
      email: customer?.email,
      fulfillment: customer?.fulfillment ?? "pickup",
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function insertOrder(
  customerId: string,
  totals: PayPalOrderPayload["totals"],
  paypalOrderId: string,
  captureState: string,
  notes: string | undefined,
) {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      subtotal: totals?.subtotal ?? 0,
      service_fee: totals?.serviceFee ?? 0,
      delivery_fee: totals?.deliveryFee ?? 0,
      total: totals?.total ?? 0,
      payment_provider: "paypal",
      payment_status: captureState,
      payment_reference: paypalOrderId,
      notes,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function insertOrderItems(orderId: string, cart: PayPalOrderPayload["cart"]) {
  const rows = cart.map((item) => ({
    order_id: orderId,
    menu_item_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
  }))

  const { error } = await supabase.from("order_items").insert(rows)
  if (error) throw error
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 })
  }

  try {
    const payload = await req.json() as PayPalOrderPayload
    if (!payload?.orderId || !payload?.customer?.name || !Array.isArray(payload?.cart)) {
      return jsonResponse({ error: "Invalid payload" }, { status: 400 })
    }

    const accessToken = await getPayPalAccessToken()
    const capture = await capturePayPalOrder(payload.orderId, accessToken)
    const captureStatus = capture?.status ?? "unknown"

    if (captureStatus !== "COMPLETED") {
      return jsonResponse({ error: "PayPal order not completed", status: captureStatus }, { status: 400 })
    }

    const customerRow = await insertCustomer(payload.customer)
    const orderRow = await insertOrder(
      customerRow.id,
      payload.totals,
      payload.orderId,
      captureStatus.toLowerCase(),
      payload.customer?.notes,
    )
    await insertOrderItems(orderRow.id, payload.cart)

    return jsonResponse({ orderId: orderRow.id, paypalOrderId: payload.orderId, capture })
  } catch (error) {
    console.error("capture-paypal-order failed", error)
    const message = error instanceof Error ? error.message : "Server error"
    return jsonResponse({ error: message }, { status: 500 })
  }
})

/*
 To invoke locally:

 1. Run `supabase start`
 2. curl -X POST "http://127.0.0.1:54321/functions/v1/capture-paypal-order" \
      -H "Authorization: Bearer <anon-key>" \
      -H "Content-Type: application/json" \
      -d '{"orderId":"PAYPAL_ORDER_ID","customer":{"name":"Guest"},"cart":[],"totals":{"subtotal":0,"total":0}}'
*/
