import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getData } from '../data/store'
import { createEvent, mergeContactsFromShareMembers } from '../data/actions'
import { getSportConfig } from '../data/sports'
import { joinEventShare } from '../lib/eventShares'
import { getEventSharePreview, upsertOwnMemberProfile } from '../lib/eventShareMembers'
import type { EventSharePreview } from '../lib/eventShareMembers'
import { signInWithDeviceKey } from '../lib/pubkeyAuth'
import { supabase } from '../lib/supabase'
import { toErrorMessage } from '../lib/errors'

// Punto de entrada real para un link de invitación (?invite=<shareId>). Antes de sumarse,
// muestra quién juega (para poder decidir si interesa) — solo al tocar "Sumarme" se une de
// verdad, publica el propio nombre/teléfono, y agrega a la agenda a los compañeros que todavía
// no tenía guardados.
export default function JoinInvite({ shareId }: { shareId: string }) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState<EventSharePreview | null>(null)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const existing = getData().events.find((e) => e.sharedId === shareId)
      if (existing) {
        navigate(`/events/${existing.id}`, { replace: true })
        return
      }

      try {
        if (!supabase) throw new Error('Supabase no está configurado.')
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) await signInWithDeviceKey()

        const share = await getEventSharePreview(shareId)
        if (!share) throw new Error('No encontramos esa invitación — puede que ya no exista.')
        if (!share.sport_id || !share.club || !share.date || !share.time) {
          throw new Error('La invitación no tiene los datos del evento.')
        }
        if (!cancelled) setPreview(share)
      } catch (e) {
        if (!cancelled) setError(toErrorMessage(e))
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [shareId, navigate])

  async function handleAccept() {
    if (!preview) return
    setJoining(true)
    setError(null)
    try {
      await joinEventShare(shareId)

      const me = getData().contacts.find((c) => c.isMe)
      if (me) await upsertOwnMemberProfile(shareId, me.name, me.phone)

      // El preview se pidió antes de unirme, así que member todavía no me incluye a mí mismo.
      mergeContactsFromShareMembers(preview.members)

      const localId = createEvent({
        sportId: preview.sport_id!,
        club: preview.club!,
        court: preview.court ?? undefined,
        date: preview.date!,
        time: preview.time!,
        requiredPlayers,
        confirmedContactIds: [],
        sharedId: preview.id,
      })

      navigate(`/events/${localId}`, { replace: true })
    } catch (e) {
      setError(toErrorMessage(e))
      setJoining(false)
    }
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-danger text-sm">{error}</p>
        <button className="btn btn-ghost" onClick={() => navigate('/', { replace: true })}>
          Ir al inicio
        </button>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="hint">Buscando la invitación…</p>
      </div>
    )
  }

  const sport = getSportConfig(preview.sport_id!)
  const requiredPlayers = preview.required_players ?? sport.defaultRequiredPlayers

  return (
    <div className="flex h-full flex-col justify-center gap-4 px-6">
      <div className="card flex flex-col gap-3">
        <div>
          <p className="font-semibold text-ink">Te invitaron a jugar</p>
          <p className="text-muted text-sm">
            {sport.name} · {preview.club}
            {preview.court ? ` · Cancha ${preview.court}` : ''}
          </p>
          <p className="text-muted text-sm">
            {preview.date} · {preview.time}hs
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-ink">
            Juegan ({preview.confirmed_count}/{requiredPlayers})
          </p>
          {preview.members.length === 0 ? (
            <p className="hint">Todavía nadie confirmó.</p>
          ) : (
            <p className="hint">{preview.members.map((m) => m.name).join(', ')}</p>
          )}
        </div>

        <button onClick={handleAccept} disabled={joining} className="btn btn-primary">
          {joining ? 'Sumándote…' : 'Sumarme'}
        </button>
        <button onClick={() => navigate('/', { replace: true })} className="btn btn-ghost" disabled={joining}>
          Ahora no
        </button>
      </div>
    </div>
  )
}
