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
    <button
      onClick={() => navigate(`/events/${event.id}`)}
      className="flex w-full flex-col gap-1 rounded-xl border border-gray-200 p-4 text-left active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-900"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 dark:text-gray-100">{sport.name}</span>
        {hasOpenVacancy ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Vacante abierta
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Cupo lleno
          </span>
        )}
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {event.club}
        {event.court ? ` · Cancha ${event.court}` : ''}
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {event.date} · {event.time}hs
      </span>
      {hasOpenVacancy && (
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Faltan {vacancies} jugador{vacancies === 1 ? '' : 'es'}
        </span>
      )}
    </button>
  )
}
