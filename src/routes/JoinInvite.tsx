import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getData } from '../data/store'
import { createEvent } from '../data/actions'
import { getEventShare, joinEventShare } from '../lib/eventShares'
import { signInWithDeviceKey } from '../lib/pubkeyAuth'
import { supabase } from '../lib/supabase'
import { toErrorMessage } from '../lib/errors'

// Punto de entrada real para un link de invitación (?invite=<shareId>). Firma con la clave del
// dispositivo si hace falta, se une a la sala en Supabase, y arma un Event local a partir de los
// datos que viajan en el share — así la persona invitada ve el evento real, no una sala vacía.
export default function JoinInvite({ shareId }: { shareId: string }) {
  const navigate = useNavigate()
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

        await joinEventShare(shareId)
        const share = await getEventShare(shareId)
        if (!share) throw new Error('No encontramos esa invitación — puede que ya no exista.')
        if (!share.sport_id || !share.club || !share.date || !share.time) {
          throw new Error('La invitación no tiene los datos del evento.')
        }

        const localId = createEvent({
          sportId: share.sport_id,
          club: share.club,
          court: share.court ?? undefined,
          date: share.date,
          time: share.time,
          confirmedContactIds: [],
          sharedId: share.id,
        })

        if (!cancelled) navigate(`/events/${localId}`, { replace: true })
      } catch (e) {
        if (!cancelled) setError(toErrorMessage(e))
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [shareId, navigate])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      {error ? (
        <>
          <p className="text-danger text-sm">{error}</p>
          <button className="btn btn-ghost" onClick={() => navigate('/', { replace: true })}>
            Ir al inicio
          </button>
        </>
      ) : (
        <p className="hint">Sumándote al evento…</p>
      )}
    </div>
  )
}
