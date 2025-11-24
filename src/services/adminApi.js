import { supabase } from './supabaseClient'

function ensureSupabase() {
  if (!supabase) {
    return { error: new Error('Supabase client is not configured. Check env variables.') }
  }
  return { error: null }
}

export async function upsertMenuItem(values) {
  const { error: supabaseError } = ensureSupabase()
  if (supabaseError) return { error: supabaseError }

  const payload = {
    id: values.id?.trim(),
    name: values.name?.trim(),
    description: values.description?.trim() || null,
    description_i18n: values.description_i18n || null,
    price: Number(values.price ?? 0),
    emoji: values.emoji?.trim() || null,
    tags: Array.isArray(values.tags) ? values.tags : null,
    is_active: values.is_active ?? true,
  }

  const { data, error } = await supabase
    .from('menu_items')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()

  return { data, error }
}

export async function deleteMenuItem(id) {
  const { error: supabaseError } = ensureSupabase()
  if (supabaseError) return { error: supabaseError }

  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  return { error }
}

export async function updateOrderStatus(orderId, status) {
  const { error: supabaseError } = ensureSupabase()
  if (supabaseError) return { error: supabaseError }

  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', orderId)
    .select()
    .single()

  return { data, error }
}

export async function deleteOrder(orderId) {
  const { error: supabaseError } = ensureSupabase()
  if (supabaseError) return { error: supabaseError }

  const { error } = await supabase.from('orders').delete().eq('id', orderId)
  return { error }
}
