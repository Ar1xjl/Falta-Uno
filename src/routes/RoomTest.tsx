import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from '../lib/supabase'
import { createEventShare, getEventShare, joinEventShare, setConfirmed, subscribeToEventShare } from '../lib/eventShares'
import type { EventShareRow } from '../lib/eventShares'
import { addExpense, computeShareBalances, listExpenses, subscribeToExpenses } from '../lib/eventShareExpenses'
import type { EventShareExpenseRow } from '../lib/eventShareExpenses'
import {
  applySettlements,
  confirmSettlement,
  declineSettlement,
  listSettlements,
  proposeSettlement,
  subscribeToSettlements,
} from '../lib/eventShareSettlements'
import type { EventShareSettlementRow } from '../lib/eventShareSettlements'
import { simplifyDebts } from '../lib/balances'
import { signInWithDeviceKey } from '../lib/pubkeyAuth'
import { buildWaMeShareLink } from '../lib/whatsapp'
import { toErrorMessage } from '../lib/errors'
import PageHeader from '../components/PageHeader'

function inviteFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('invite')
}

function inviteLink(shareId: string): string {
  return `${window.location.origin}/dev/room-test?invite=${shareId}`
}

export default function RoomTest() {
  const [userId, setUserId] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const [shareId, setShareId] = useState('')
  const [room, setRoom] = useState<EventShareRow | null>(null)
  const [expenses, setExpenses] = useState<EventShareExpenseRow[]>([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [settlements, setSettlements] = useState<EventShareSettlementRow[]>([])
  const [settleTo, setSettleTo] = useState('')
  const [settleAmount, setSettleAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const db = supabase
    db.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        return
      }
      // Sin sesión: firmamos con la clave del dispositivo en vez de mandar a /dev/auth-test.
      // Esto es lo que hace posible que alguien entre directo desde un link de invitación.
      setSigningIn(true)
      try {
        await signInWithDeviceKey()
        const { data: after } = await db.auth.getUser()
        setUserId(after.user?.id ?? null)
      } catch (e) {
        setError(toErrorMessage(e))
      } finally {
        setSigningIn(false)
      }
    })
  }, [])

  // Una vez que hay sesión, si vinimos de un link de invitación (?invite=<shareId>) nos unimos solos.
  useEffect(() => {
    if (!userId || room) return
    const invite = inviteFromUrl()
    if (!invite) return
    setError(null)
    joinEventShare(invite)
      .then(() => getEventShare(invite))
      .then((joined) => {
        setRoom(joined)
        setShareId(invite)
        const url = new URL(window.location.href)
        url.searchParams.delete('invite')
        window.history.replaceState({}, '', url)
      })
      .catch((e) => setError(toErrorMessage(e)))
  }, [userId, room])

  useEffect(() => {
    if (!room) return
    return subscribeToEventShare(room.id, setRoom)
  }, [room?.id])

  useEffect(() => {
    if (!room) return
    listExpenses(room.id).then(setExpenses).catch((e) => setError(toErrorMessage(e)))
    return subscribeToExpenses(room.id, (row) => setExpenses((prev) => [...prev, row]))
  }, [room?.id])

  useEffect(() => {
    if (!room) return
    listSettlements(room.id)
      .then(setSettlements)
      .catch((e) => setError(toErrorMessage(e)))
    return subscribeToSettlements(room.id, (row) => {
      setSettlements((prev) => {
        const idx = prev.findIndex((s) => s.id === row.id)
        if (idx === -1) return [...prev, row]
        const next = [...prev]
        next[idx] = row
        return next
      })
    })
  }, [room?.id])

  async function handleCreate() {
    setError(null)
    try {
      const created = await createEventShare(crypto.randomUUID(), {
        sportId: 'padel',
        club: 'Club de prueba',
        date: new Date().toISOString().slice(0, 10),
        time: '20:00',
      })
      setRoom(created)
      setShareId(created.id)
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  async function handleJoin() {
    setError(null)
    try {
      await joinEventShare(shareId)
      const joined = await getEventShare(shareId)
      setRoom(joined)
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  async function handleToggleConfirmed(next: boolean) {
    if (!room) return
    setError(null)
    try {
      await setConfirmed(room.id, next)
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!room) return
    const parsed = Number(amount)
    if (!description.trim() || !parsed || parsed <= 0) return
    setError(null)
    try {
      await addExpense(room.id, description.trim(), parsed, room.member_user_ids)
      setDescription('')
      setAmount('')
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  async function handleProposeSettlement(e: React.FormEvent) {
    e.preventDefault()
    if (!room) return
    const parsed = Number(settleAmount)
    if (!settleTo || !parsed || parsed <= 0) return
    setError(null)
    try {
      await proposeSettlement(room.id, settleTo, parsed)
      setSettleAmount('')
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  async function handleDecide(id: string, decision: 'confirmed' | 'declined') {
    setError(null)
    try {
      if (decision === 'confirmed') await confirmSettlement(id)
      else await declineSettlement(id)
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  const amConfirmed = Boolean(room && userId && room.confirmed_user_ids.includes(userId))
  const balances = applySettlements(computeShareBalances(expenses), settlements)
  const suggestions = simplifyDebts(balances)
  const otherMembers = room?.member_user_ids.filter((id) => id !== userId) ?? []

  return (
    <div className="flex flex-col">
      <PageHeader title="Prueba: sala compartida" />
      <div className="flex flex-col gap-4 p-4">
        <p className="hint">
          Ruta de desarrollo — crea o une una sala (<code>event_shares</code>) y sincroniza en vivo quién
          está confirmado. La sesión se firma sola con la clave del dispositivo, no hace falta pasar
          por <code>/dev/auth-test</code>.
        </p>

        {!supabaseEnabled ? (
          <p className="card text-danger">Faltan las env vars de Supabase.</p>
        ) : signingIn ? (
          <p className="hint">Firmando con la clave del dispositivo…</p>
        ) : !userId ? (
          <p className="card text-danger">No se pudo iniciar sesión. {error}</p>
        ) : (
          <>
            <p className="hint">Tu user.id: {userId}</p>

            {!room && (
              <div className="card flex flex-col gap-2">
                <button className="btn btn-primary" onClick={handleCreate}>
                  Crear sala nueva
                </button>
                <div className="flex gap-2">
                  <input placeholder="ID de sala existente" value={shareId} onChange={(e) => setShareId(e.target.value)} />
                  <button className="btn btn-ghost" onClick={handleJoin}>
                    Unirme
                  </button>
                </div>
              </div>
            )}

            {room && (
              <div className="card flex flex-col gap-2">
                <p className="hint">
                  Sala: <code>{room.id}</code>
                </p>
                <a
                  className="btn btn-primary text-center"
                  href={buildWaMeShareLink(`Dale que jugamos, sumate acá: ${inviteLink(room.id)}`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Invitar por WhatsApp
                </a>
                <p className="text-sm font-semibold text-ink">Miembros ({room.member_user_ids.length})</p>
                <p className="hint break-all">{room.member_user_ids.join(', ')}</p>
                <p className="text-sm font-semibold text-ink">Confirmados ({room.confirmed_user_ids.length})</p>
                <p className="hint break-all">{room.confirmed_user_ids.join(', ') || '(nadie todavía)'}</p>

                <button className="btn btn-primary" onClick={() => handleToggleConfirmed(!amConfirmed)}>
                  {amConfirmed ? 'Bajarme del partido' : 'Anotarme'}
                </button>
              </div>
            )}

            {room && (
              <div className="card flex flex-col gap-2">
                <p className="text-sm font-semibold text-ink">Gastos ({expenses.length})</p>
                {expenses.length === 0 && <p className="hint">(ninguno todavía)</p>}
                {expenses.map((e) => (
                  <p key={e.id} className="hint break-all">
                    {e.description} — ${e.amount} — pagó {e.paid_by_user_id.slice(0, 8)}…, dividido entre{' '}
                    {e.split_user_ids.length}
                  </p>
                ))}

                <form onSubmit={handleAddExpense} className="flex flex-col gap-2">
                  <input placeholder="Descripción (ej. Cancha)" value={description} onChange={(ev) => setDescription(ev.target.value)} />
                  <input
                    placeholder="Monto"
                    inputMode="decimal"
                    value={amount}
                    onChange={(ev) => setAmount(ev.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">
                    Agregar gasto (dividido entre los {room.member_user_ids.length} miembros)
                  </button>
                </form>

                <p className="text-sm font-semibold text-ink mt-2">Balance</p>
                {[...balances.entries()].map(([uid, net]) => (
                  <p key={uid} className="hint break-all">
                    {uid.slice(0, 8)}…: {net >= 0 ? '+' : ''}
                    {net.toFixed(2)}
                  </p>
                ))}

                {suggestions.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-ink mt-2">Para saldar</p>
                    {suggestions.map((s, i) => (
                      <p key={i} className="hint break-all">
                        {s.fromContactId.slice(0, 8)}… le paga ${s.amount.toFixed(2)} a {s.toContactId.slice(0, 8)}…
                      </p>
                    ))}
                  </>
                )}
              </div>
            )}

            {room && (
              <div className="card flex flex-col gap-2">
                <p className="text-sm font-semibold text-ink">Pagos ({settlements.length})</p>
                {settlements.length === 0 && <p className="hint">(ninguno todavía)</p>}
                {settlements.map((s) => (
                  <div key={s.id} className="flex flex-col gap-1 border-t border-line pt-2 first:border-0 first:pt-0">
                    <p className="hint break-all">
                      {s.from_user_id.slice(0, 8)}… le pagó ${s.amount} a {s.to_user_id.slice(0, 8)}… —{' '}
                      <span className="font-semibold text-ink">{s.status}</span>
                    </p>
                    {s.status === 'pending' && s.to_user_id === userId && (
                      <div className="flex gap-2">
                        <button className="btn btn-primary" onClick={() => handleDecide(s.id, 'confirmed')}>
                          Confirmar
                        </button>
                        <button className="btn btn-ghost" onClick={() => handleDecide(s.id, 'declined')}>
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <form onSubmit={handleProposeSettlement} className="flex flex-col gap-2 mt-2">
                  <label className="text-sm font-semibold text-ink" htmlFor="settleTo">
                    Le pagué a
                  </label>
                  <select id="settleTo" value={settleTo} onChange={(ev) => setSettleTo(ev.target.value)}>
                    <option value="">Elegir miembro…</option>
                    {otherMembers.map((id) => (
                      <option key={id} value={id}>
                        {id.slice(0, 8)}…
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Monto"
                    inputMode="decimal"
                    value={settleAmount}
                    onChange={(ev) => setSettleAmount(ev.target.value)}
                  />
                  <button type="submit" className="btn btn-primary">
                    Marcar como pagado
                  </button>
                </form>
              </div>
            )}

            {error && <p className="card text-danger">{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}
