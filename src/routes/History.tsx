import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getHistoryEvents } from '../data/selectors'
import { getSportConfig } from '../data/sports'
import PageHeader from '../components/PageHeader'

export default function History() {
  const data = useAppData()
  const navigate = useNavigate()
  const events = getHistoryEvents(data)

  return (
    <div className="flex flex-col">
      <PageHeader title="Historial" />

      <div className="flex flex-col gap-2 p-4">
        {events.length === 0 ? (
          <p className="empty-state">Todavía no hay partidos jugados o cancelados.</p>
        ) : (
          events.map((event) => {
            const sport = getSportConfig(event.sportId)
            return (
              <button key={event.id} onClick={() => navigate(`/events/${event.id}`)} className="card flex flex-col gap-0.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{sport.name}</span>
                  <span className="badge-neutral">
                    {event.status === 'completed' ? 'Jugado' : event.status === 'cancelled' ? 'Cancelado' : 'Pasado'}
                  </span>
                </div>
                <span className="text-muted text-sm">
                  {event.club} · {event.date} {event.time}hs
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
