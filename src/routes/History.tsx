import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getHistoryEvents } from '../data/selectors'
import { getSportConfig } from '../data/sports'

export default function History() {
  const data = useAppData()
  const navigate = useNavigate()
  const events = getHistoryEvents(data)

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Historial</h1>

      {events.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Todavía no hay partidos jugados o cancelados.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((event) => {
            const sport = getSportConfig(event.sportId)
            return (
              <button
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="flex flex-col gap-0.5 rounded-xl border border-gray-200 p-3 text-left dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{sport.name}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {event.status === 'completed' ? 'Jugado' : 'Cancelado'}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {event.club} · {event.date} {event.time}hs
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
