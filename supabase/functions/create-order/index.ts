import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("EDGE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("EDGE_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variable")
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

async function insertCustomer(customer: any) {
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

async function insertOrder(customerId: string, totals: any, payment: any, notes: string | undefined) {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: customerId,
      subtotal: totals?.subtotal ?? 0,
      service_fee: totals?.serviceFee ?? 0,
      delivery_fee: totals?.deliveryFee ?? 0,
      total: totals?.total ?? 0,
      payment_provider: payment?.provider,
      payment_status: payment?.status,
      notes,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function insertOrderItems(orderId: string, cart: any[]) {
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
    const { customer, cart, totals, payment } = await req.json()

    if (!customer?.name || !Array.isArray(cart) || cart.length === 0) {
      return jsonResponse({ error: "Invalid payload" }, { status: 400 })
    }

    const customerRow = await insertCustomer(customer)
    const orderRow = await insertOrder(customerRow.id, totals, payment, customer?.notes)
    await insertOrderItems(orderRow.id, cart)

    return jsonResponse({ orderId: orderRow.id })
  } catch (error) {
    console.error("create-order failed", error)
    return jsonResponse({ error: error.message ?? "Server error" }, { status: 500 })
  }
})
