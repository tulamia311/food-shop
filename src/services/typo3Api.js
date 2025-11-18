const API_BASE = import.meta.env.VITE_TULAMIA_API_BASE ?? 'http://tulamia-v12.local/index.php'
const DATA_EID = import.meta.env.VITE_TULAMIA_API_EID ?? 'tulamia_site_api_json_data'
const SAVE_EID = import.meta.env.VITE_TULAMIA_API_SAVE_EID ?? 'tulamia_site_api_json_save'
const ORDER_EID = import.meta.env.VITE_TULAMIA_API_ORDER_EID ?? 'tulamia_site_api_order_save'
const FILE_UID = import.meta.env.VITE_TULAMIA_MENU_FILE_UID ?? '64'
const ORDER_FILE_UID = import.meta.env.VITE_TULAMIA_ORDER_FILE_UID ?? ''
const API_KEY = import.meta.env.VITE_TULAMIA_API_KEY ?? ''

function buildUrl(eid, searchParams = {}) {
  const url = new URL(API_BASE)
  url.searchParams.set('eID', eid)
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value)
    }
  })
  return url.toString()
}

function buildHeaders(overrides = {}) {
  return {
    'Content-Type': 'application/json',
    ...(API_KEY ? { 'X-Api-Key': API_KEY } : {}),
    ...overrides,
  }
}

async function handleResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.error) {
    const message = payload.error ?? `Request failed with status ${response.status}`
    throw new Error(message)
  }
  return payload
}

export async function fetchMenuItems() {
  const response = await fetch(buildUrl(DATA_EID, { fileUid: FILE_UID }), {
    headers: buildHeaders(),
  })
  const payload = await handleResponse(response)
  return payload.data ?? []
}

export async function saveMenuItems(data) {
  const response = await fetch(buildUrl(SAVE_EID, { fileUid: FILE_UID }), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ data }),
  })
  const payload = await handleResponse(response)
  return payload.success === true
}

export async function fetchOrders() {
  if (!ORDER_FILE_UID) {
    throw new Error('Order storage file UID is not configured')
  }

  const response = await fetch(buildUrl(DATA_EID, { fileUid: ORDER_FILE_UID }), {
    headers: buildHeaders(),
  })
  const payload = await handleResponse(response)
  return payload.data ?? []
}

export async function saveOrder(order) {
  if (!ORDER_FILE_UID) {
    throw new Error('Order storage file UID is not configured')
  }

  const response = await fetch(buildUrl(ORDER_EID, { fileUid: ORDER_FILE_UID }), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ order }),
  })
  const payload = await handleResponse(response)
  return payload.orderId
}

export const apiConfig = {
  baseUrl: API_BASE,
  dataEid: DATA_EID,
  saveEid: SAVE_EID,
  orderEid: ORDER_EID,
  fileUid: FILE_UID,
  orderFileUid: ORDER_FILE_UID,
  hasApiKey: Boolean(API_KEY),
}
