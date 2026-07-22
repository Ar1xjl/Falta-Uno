import { supabase } from './supabase'

export interface EventShareRow {
  id: string
  created_by: string
  local_event_id: string
  member_user_ids: string[]
  confirmed_user_ids: string[]
  created_at: string
  sport_id: string | null
  club: string | null
  court: string | null
  date: string | null
  time: string | null
}

export interface EventShareDetails {
  sportId: string
  club: string
  court?: string
  date: string
  time: string
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado (faltan las env vars).')
  return supabase
}

export async function createEventShare(localEventId: string, details: EventShareDetails): Promise<EventShareRow> {
  const db = client()
  const { data: userData, error: userError } = await db.auth.getUser()
  if (userError || !userData.user) throw new Error('No hay sesión activa.')

  const { data, error } = await db
    .from('event_shares')
    .insert({
      created_by: userData.user.id,
      local_event_id: localEventId,
      member_user_ids: [userData.user.id],
      confirmed_user_ids: [],
      sport_id: details.sportId,
      club: details.club,
      court: details.court ?? null,
      date: details.date,
      time: details.time,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function joinEventShare(shareId: string): Promise<void> {
  const db = client()
  const { error } = await db.rpc('join_event_share', { share_id: shareId })
  if (error) throw error
}

export async function getEventShare(shareId: string): Promise<EventShareRow | null> {
  const db = client()
  const { data, error } = await db.from('event_shares').select('*').eq('id', shareId).maybeSingle()
  if (error) throw error
  return data
}

export async function setConfirmed(shareId: string, confirmed: boolean): Promise<void> {
  const db = client()
  const { data: userData, error: userError } = await db.auth.getUser()
  if (userError || !userData.user) throw new Error('No hay sesión activa.')
  const uid = userData.user.id

  const current = await getEventShare(shareId)
  if (!current) throw new Error('Sala no encontrada.')

  const nextConfirmed = confirmed
    ? Array.from(new Set([...current.confirmed_user_ids, uid]))
    : current.confirmed_user_ids.filter((id) => id !== uid)

  const { error } = await db.from('event_shares').update({ confirmed_user_ids: nextConfirmed }).eq('id', shareId)
  if (error) throw error
}

export function subscribeToEventShare(shareId: string, onChange: (row: EventShareRow) => void) {
  const db = client()
  const channel = db
    .channel(`event_share:${shareId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'event_shares', filter: `id=eq.${shareId}` },
      (payload) => onChange(payload.new as EventShareRow),
    )
    .subscribe()

  return () => {
    db.removeChannel(channel)
  }
}
