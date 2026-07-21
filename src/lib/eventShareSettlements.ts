import { supabase } from './supabase'

export type SettlementStatus = 'pending' | 'confirmed' | 'declined'

export interface EventShareSettlementRow {
  id: string
  event_share_id: string
  from_user_id: string
  to_user_id: string
  amount: number
  status: SettlementStatus
  created_at: string
  confirmed_at: string | null
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado (faltan las env vars).')
  return supabase
}

export async function proposeSettlement(
  eventShareId: string,
  toUserId: string,
  amount: number,
): Promise<EventShareSettlementRow> {
  const db = client()
  const { data: userData, error: userError } = await db.auth.getUser()
  if (userError || !userData.user) throw new Error('No hay sesión activa.')

  const { data, error } = await db
    .from('event_share_settlements')
    .insert({ event_share_id: eventShareId, from_user_id: userData.user.id, to_user_id: toUserId, amount })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listSettlements(eventShareId: string): Promise<EventShareSettlementRow[]> {
  const db = client()
  const { data, error } = await db
    .from('event_share_settlements')
    .select('*')
    .eq('event_share_id', eventShareId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

async function updateStatus(id: string, status: 'confirmed' | 'declined') {
  const db = client()
  const { error } = await db
    .from('event_share_settlements')
    .update({ status, confirmed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export const confirmSettlement = (id: string) => updateStatus(id, 'confirmed')
export const declineSettlement = (id: string) => updateStatus(id, 'declined')

export function subscribeToSettlements(eventShareId: string, onChange: (row: EventShareSettlementRow) => void) {
  const db = client()
  const channel = db
    .channel(`event_share_settlements:${eventShareId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'event_share_settlements', filter: `event_share_id=eq.${eventShareId}` },
      (payload) => onChange(payload.new as EventShareSettlementRow),
    )
    .subscribe()

  return () => {
    db.removeChannel(channel)
  }
}

/** Solo los settlements confirmados netean el balance — los pending no cuentan todavía. */
export function applySettlements(
  balances: Map<string, number>,
  settlements: EventShareSettlementRow[],
): Map<string, number> {
  const result = new Map(balances)
  function add(userId: string, delta: number) {
    result.set(userId, (result.get(userId) ?? 0) + delta)
  }
  for (const s of settlements) {
    if (s.status !== 'confirmed') continue
    add(s.from_user_id, s.amount)
    add(s.to_user_id, -s.amount)
  }
  return result
}
