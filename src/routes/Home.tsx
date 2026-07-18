import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getActiveRound, getInvitationsForRound, getUpcomingEventsSorted, getVacancies } from '../data/selectors'
import { getSportConfig } from '../data/sports'
import type { Event } from '../types'
import AdBanner from '../components/AdBanner'
import QuickLinks from '../components/QuickLinks'

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
          <button onClick={() => navigate('/events')} className="flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{getSportConfig(nextEvent.sportId).name}</span>
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
              const sport = getSportConfig(event.sportId)
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

function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="card">
      <button onClick={() => setOpen((o) => !o)} className="text-brand text-sm font-semibold">
        {open ? 'Ocultar' : '¿Cómo funciona la app?'}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          <p className="hint">
            FaltaUno!! te ayuda a completar rápido los cupos vacantes de un partido cuando alguien se baja. No es una
            red social: es un organizador que reduce mensajes y automatiza las invitaciones por WhatsApp.
          </p>

          <div>
            <p className="section-label mb-1">Qué es cada pestaña</p>
            <ul className="hint flex flex-col gap-1.5">
              <li>
                <strong className="text-ink">Inicio</strong> — tu resumen: próximo partido, rondas que esperan
                respuesta y accesos rápidos.
              </li>
              <li>
                <strong className="text-ink">Eventos</strong> — todos tus próximos partidos. El que tiene una vacante
                recién abierta aparece arriba con el cartel "Vacante abierta".
              </li>
              <li>
                <strong className="text-ink">Contactos</strong> — tu lista de gente para invitar. Podés cargarlos a
                mano o importarlos de una vez desde un archivo.
              </li>
              <li>
                <strong className="text-ink">Templates</strong> — partidos que se repiten (ej. "Padel jueves"). Creá
                el próximo en un toque, incluso de forma automática cada semana.
              </li>
              <li>
                <strong className="text-ink">Historial</strong> — partidos ya jugados o cancelados.
              </li>
              <li>
                <strong className="text-ink">Ajustes</strong> — tu perfil y los mensajes de WhatsApp que se usan al
                invitar.
              </li>
            </ul>
          </div>

          <div>
            <p className="section-label mb-1">Para arrancar</p>
            <ol className="hint list-decimal space-y-1 pl-4">
              <li>Cargá tus contactos habituales en la pestaña Contactos.</li>
              <li>
                Tocá <strong className="text-ink">+</strong> y anotá quién ya está confirmado.
              </li>
              <li>Si falta gente, armá una ronda o invitá directo a alguien puntual.</li>
              <li>Mandale el mensaje por WhatsApp con un toque y marcá quién aceptó.</li>
              <li>
                Si alguien se baja después, tocá <strong className="text-ink">"Se baja"</strong> en el partido: la
                vacante se reabre y te avisa acá, en Inicio.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
