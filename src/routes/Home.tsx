import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getUpcomingEventsSorted } from '../data/selectors'
import EventCard from '../components/EventCard'

export default function Home() {
  const data = useAppData()
  const navigate = useNavigate()
  const events = getUpcomingEventsSorted(data)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Próximos partidos</h1>
        <button
          onClick={() => navigate('/events/new')}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
        >
          + Crear evento
        </button>
      </div>

      {events.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Todavía no tenés partidos armados.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
