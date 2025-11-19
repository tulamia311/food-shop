import { supabase, isSupabaseEnabled } from './supabaseClient'

const STATIC_BASE = import.meta.env.BASE_URL ?? '/'
const MENU_PATH = `${STATIC_BASE}json/dishes.json`
const ORDERS_PATH = `${STATIC_BASE}json/orders.json`
const LOCAL_STORAGE_KEY = 'tulamia-orders'

function readStoredOrders() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Failed to parse stored orders', error)
    return []
  }
}

function normalizeSupabaseOrders(rows) {
  if (!Array.isArray(rows)) return []

  return rows.map((row) => {
    const cart = Array.isArray(row.order_items)
      ? row.order_items.map((item) => {
          const menu = item.menu_item ?? {}
          const unitPrice = Number(item.unit_price ?? menu.price ?? 0)
          const quantity = Number(item.quantity ?? 0)

          return {
            id: menu.id ?? item.menu_item_id ?? crypto.randomUUID(),
            name: menu.name ?? 'Menu item',
            quantity,
            price: unitPrice,
            lineTotal: Number((unitPrice * quantity).toFixed(2)),
          }
        })
      : []

    return {
      id: row.id,
      createdAt: row.created_at,
      customer: {
        name: row.customer?.name ?? 'Guest',
        email: row.customer?.email ?? '',
        fulfillment: row.customer?.fulfillment ?? 'pickup',
      },
      payment: {
        provider: row.payment_provider ?? 'cash',
        status: row.payment_status ?? 'pending',
      },
      totals: {
        subtotal: Number(row.subtotal ?? 0),
        serviceFee: Number(row.service_fee ?? 0),
        deliveryFee: Number(row.delivery_fee ?? 0),
        total: Number(row.total ?? 0),
      },
      cart,
    }
  })
}

function writeStoredOrders(orders) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders))
  } catch (error) {
    console.warn('Failed to persist orders locally', error)
  }
}

export async function fetchMenuItems() {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.warn('Supabase menu fetch failed, falling back to static JSON', error)
    } else if (Array.isArray(data) && data.length > 0) {
      console.info('[Supabase] Menu fetch succeeded', { rows: data.length })
      return data
    }
  }

  const response = await fetch(MENU_PATH)
  if (!response.ok) {
    throw new Error(`Failed to load menu (${response.status})`)
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function fetchOrders() {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        created_at,
        subtotal,
        service_fee,
        delivery_fee,
        total,
        payment_provider,
        payment_status,
        customer:customers (
          name,
          email,
          fulfillment
        ),
        order_items (
          quantity,
          unit_price,
          menu_item:menu_items (
            id,
            name,
            price
          )
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(25)

    if (error) {
      console.warn('Supabase orders fetch failed, falling back to static JSON', error)
    } else {
      const normalized = normalizeSupabaseOrders(data)
      console.info('[Supabase] Orders fetch succeeded', { rows: normalized.length })
      return normalized
    }
  }

  let staticOrders = []
  try {
    const response = await fetch(ORDERS_PATH)
    if (response.ok) {
      const data = await response.json()
      staticOrders = Array.isArray(data) ? data : []
    }
  } catch (error) {
    console.warn('Failed to load static orders', error)
  }

  const storedOrders = readStoredOrders()
  return [...staticOrders, ...storedOrders]
}

export async function saveOrder(order) {
  if (isSupabaseEnabled()) {
    const { data, error } = await supabase.functions.invoke('create-order', {
      body: order,
    })

    if (error) {
      console.warn('Supabase order save failed, falling back to local storage', error)
    } else if (data?.orderId) {
      console.info('[Supabase] Order saved', { orderId: data.orderId })
      return data.orderId
    } else {
      console.warn('Supabase order save responded without orderId, falling back', data)
    }
  }

  const newOrder = {
    ...order,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }

  const storedOrders = readStoredOrders()
  storedOrders.push(newOrder)
  writeStoredOrders(storedOrders)
  return newOrder.id
}

export const apiConfig = {
  baseUrl: STATIC_BASE,
  usesLocalData: true,
}
