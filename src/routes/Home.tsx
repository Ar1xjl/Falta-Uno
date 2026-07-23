import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getActiveRound, getInvitationsForRound, getUpcomingEventsSorted, getVacancies } from '../data/selectors'
import { getSportConfig } from '../data/sports'
import type { Event } from '../types'
import AdBanner from '../components/AdBanner'
import QuickLinks from '../components/QuickLinks'
import HowItWorks from '../components/HowItWorks'

export default function Home() {
  const data = useAppData()
  const navigate = useNavigate()
  const events = getUpcomingEventsSorted(data)
  const nextEvent = events[0]

  const needsAttention = events
    .map((event) => {
      const round = getActiveRound(data, event.id)
      if (!round) return null
      const pending = getInvitationsForRound(data, round.id).filter((i) => i.status === 'invited').length
      return pending > 0 ? { event, pending } : null
    })
    .filter((x): x is { event: Event; pending: number } => x !== null)

  return (
    <div className="flex flex-col gap-4 p-4">
      <AdBanner sportId={nextEvent?.sportId} />

      <div className="card flex flex-col gap-1">
        <div className="mb-1 flex items-center justify-between">
          <p className="card-title mb-0">Tu próximo partido</p>
          <button
            onClick={() => navigate('/events/new')}
            aria-label="Crear evento"
            className="btn btn-primary flex h-7 w-7 shrink-0 items-center justify-center !rounded-full !p-0 text-base leading-none"
          >
            +
          </button>
        </div>
        {nextEvent ? (
          <button onClick={() => navigate(`/events/${nextEvent.id}`)} className="flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{getSportConfig(nextEvent.sportId, data.customSports).name}</span>
              {getVacancies(nextEvent) > 0 ? (
                <span className="badge-amber">Vacante abierta</span>
              ) : (
                <span className="badge-brand">Cupo lleno</span>
              )}
            </div>
            <span className="text-muted text-sm">
              {nextEvent.club}
              {nextEvent.court ? ` · Cancha ${nextEvent.court}` : ''}
            </span>
            <span className="text-muted text-sm">
              {nextEvent.date} · {nextEvent.time}hs
            </span>
          </button>
        ) : (
          <p className="hint">Todavía no tenés partidos armados.</p>
        )}
      </div>

      {needsAttention.length > 0 && (
        <div className="card">
          <p className="card-title mb-0">Rondas esperando respuesta</p>
          <div className="mt-2 flex flex-col gap-1">
            {needsAttention.map(({ event, pending }) => {
              const sport = getSportConfig(event.sportId, data.customSports)
              return (
                <button
                  key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="list-row justify-between text-left"
                >
                  <span className="text-sm text-ink">
                    {sport.name} · {event.club}
                  </span>
                  <span className="badge-amber">
                    {pending} pendiente{pending === 1 ? '' : 's'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <QuickLinks contactsCount={data.contacts.filter((c) => !c.isMe).length} />

      <HowItWorks />
    </div>
  )
}
