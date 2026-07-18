import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getUpcomingEventsSorted } from '../data/selectors'
import EventCard from '../components/EventCard'
import PageHeader from '../components/PageHeader'

export default function Events() {
  const data = useAppData()
  const navigate = useNavigate()
  const events = getUpcomingEventsSorted(data)

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Próximos partidos"
        trailing={
          <button onClick={() => navigate('/events/new')} className="btn btn-primary">
            + Crear evento
          </button>
        }
      />

      <div className="flex flex-col gap-3 p-4">
        {events.length === 0 ? (
          <p className="empty-state">Todavía no tenés partidos armados.</p>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  )
}
