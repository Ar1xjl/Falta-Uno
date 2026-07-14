import { useNavigate } from 'react-router-dom'
import type { Event } from '../types'
import { getSportConfig } from '../data/sports'
import { getVacancies } from '../data/selectors'

export default function EventCard({ event }: { event: Event }) {
  const navigate = useNavigate()
  const sport = getSportConfig(event.sportId)
  const vacancies = getVacancies(event)
  const hasOpenVacancy = vacancies > 0

  return (
    <button onClick={() => navigate(`/events/${event.id}`)} className="card flex w-full flex-col gap-1 text-left">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">{sport.name}</span>
        {hasOpenVacancy ? (
          <span className="badge-amber">Vacante abierta</span>
        ) : (
          <span className="badge-brand">Cupo lleno</span>
        )}
      </div>
      <span className="text-muted text-sm">
        {event.club}
        {event.court ? ` · Cancha ${event.court}` : ''}
      </span>
      <span className="text-muted text-sm">
        {event.date} · {event.time}hs
      </span>
      {hasOpenVacancy && (
        <span className="text-sm font-semibold" style={{ color: '#92400e' }}>
          Faltan {vacancies} jugador{vacancies === 1 ? '' : 'es'}
        </span>
      )}
    </button>
  )
}
