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

function writeStoredOrders(orders) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(orders))
  } catch (error) {
    console.warn('Failed to persist orders locally', error)
  }
}

export async function fetchMenuItems() {
  const response = await fetch(MENU_PATH)
  if (!response.ok) {
    throw new Error(`Failed to load menu (${response.status})`)
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function fetchOrders() {
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
