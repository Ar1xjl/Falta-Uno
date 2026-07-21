import { supabase } from './supabase'

export interface EventShareExpenseRow {
  id: string
  event_share_id: string
  description: string
  amount: number
  paid_by_user_id: string
  split_user_ids: string[]
  created_at: string
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado (faltan las env vars).')
  return supabase
}

export async function addExpense(
  eventShareId: string,
  description: string,
  amount: number,
  splitUserIds: string[],
): Promise<EventShareExpenseRow> {
  const db = client()
  const { data: userData, error: userError } = await db.auth.getUser()
  if (userError || !userData.user) throw new Error('No hay sesión activa.')

  const { data, error } = await db
    .from('event_share_expenses')
    .insert({
      event_share_id: eventShareId,
      description,
      amount,
      paid_by_user_id: userData.user.id,
      split_user_ids: splitUserIds,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function listExpenses(eventShareId: string): Promise<EventShareExpenseRow[]> {
  const db = client()
  const { data, error } = await db
    .from('event_share_expenses')
    .select('*')
    .eq('event_share_id', eventShareId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export function subscribeToExpenses(eventShareId: string, onInsert: (row: EventShareExpenseRow) => void) {
  const db = client()
  const channel = db
    .channel(`event_share_expenses:${eventShareId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'event_share_expenses', filter: `event_share_id=eq.${eventShareId}` },
      (payload) => onInsert(payload.new as EventShareExpenseRow),
    )
    .subscribe()

  return () => {
    db.removeChannel(channel)
  }
}

/** Balance neto por usuario: positivo = le deben, negativo = debe. Split siempre parejo entre split_user_ids. */
export function computeShareBalances(expenses: EventShareExpenseRow[]): Map<string, number> {
  const balances = new Map<string, number>()
  function add(userId: string, delta: number) {
    balances.set(userId, (balances.get(userId) ?? 0) + delta)
  }

  for (const expense of expenses) {
    add(expense.paid_by_user_id, expense.amount)
    if (expense.split_user_ids.length === 0) continue
    const share = expense.amount / expense.split_user_ids.length
    for (const userId of expense.split_user_ids) add(userId, -share)
  }

  return balances
}
