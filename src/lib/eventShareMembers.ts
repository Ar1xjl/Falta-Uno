import { supabase } from './supabase'

export interface EventShareMemberRow {
  share_id: string
  user_id: string
  name: string
  phone: string | null
  updated_at: string
}

export interface EventSharePreview {
  id: string
  sport_id: string | null
  club: string | null
  court: string | null
  date: string | null
  time: string | null
  required_players: number | null
  member_count: number
  confirmed_count: number
  members: { user_id: string; name: string; phone: string | null }[]
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado (faltan las env vars).')
  return supabase
}

/** Requiere sesión pero NO ser miembro todavía — sirve para mostrar "quién juega" antes de aceptar. */
export async function getEventSharePreview(shareId: string): Promise<EventSharePreview | null> {
  const db = client()
  const { data, error } = await db.rpc('get_event_share_preview', { p_share_id: shareId })
  if (error) throw error
  return data as EventSharePreview | null
}

/** Publica (o actualiza) mi propio nombre/teléfono en la sala — solo funciona si ya soy miembro. */
export async function upsertOwnMemberProfile(shareId: string, name: string, phone: string): Promise<void> {
  const db = client()
  const { data: userData, error: userError } = await db.auth.getUser()
  if (userError || !userData.user) throw new Error('No hay sesión activa.')

  const { error } = await db
    .from('event_share_members')
    .upsert({ share_id: shareId, user_id: userData.user.id, name, phone })
  if (error) throw error
}

export async function listEventShareMembers(shareId: string): Promise<EventShareMemberRow[]> {
  const db = client()
  const { data, error } = await db.from('event_share_members').select('*').eq('share_id', shareId)
  if (error) throw error
  return data
}

export function subscribeToEventShareMembers(
  shareId: string,
  onChange: (rows: EventShareMemberRow[]) => void,
): () => void {
  const db = client()
  const channel = db
    .channel(`event_share_members:${shareId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'event_share_members', filter: `share_id=eq.${shareId}` },
      () => {
        listEventShareMembers(shareId).then(onChange).catch(() => {})
      },
    )
    .subscribe()

  return () => {
    db.removeChannel(channel)
  }
}
