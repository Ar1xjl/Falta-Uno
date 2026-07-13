import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppData } from '../data/store'
import {
  getActiveRound,
  getConfirmedContacts,
  getContact,
  getEligibleContactsForEvent,
  getInvitationsForRound,
  getRoundsForEvent,
  getVacancies,
} from '../data/selectors'
import {
  activateRound,
  cancelEvent,
  closeActiveRound,
  createRound,
  markEventCompleted,
  quickInvite,
  removeConfirmedContact,
  saveEventAsTemplate,
} from '../data/actions'
import { getSportConfig } from '../data/sports'
import type { Round } from '../types'
import InvitationRow from '../components/InvitationRow'
import WhatsAppQueue from '../components/WhatsAppQueue'

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const data = useAppData()
  const navigate = useNavigate()
  const [queueRoundId, setQueueRoundId] = useState<string | null>(null)

  const event = data.events.find((e) => e.id === eventId)
  if (!event) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">Evento no encontrado.</p>
      </div>
    )
  }

  const sport = getSportConfig(event.sportId)
  const vacancies = getVacancies(event)
  const confirmed = getConfirmedContacts(data, event)
  const rounds = getRoundsForEvent(data, event.id)
  const activeRound = getActiveRound(data, event.id)
  const eligible = getEligibleContactsForEvent(data, event.id, event)

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 dark:text-gray-400">
          ← Volver
        </button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{sport.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {event.club}
          {event.court ? ` · Cancha ${event.court}` : ''}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {event.date} · {event.time}hs
        </p>
        {event.status !== 'upcoming' && (
          <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {event.status === 'completed' ? 'Jugado' : 'Cancelado'}
          </span>
        )}
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Confirmados ({confirmed.length}/{sport.requiredPlayers})
          </h2>
          {vacancies > 0 ? (
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Faltan {vacancies}
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Cupo lleno</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {confirmed.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
            >
              <span className="text-sm text-gray-800 dark:text-gray-200">
                {c.name}
                {c.isMe && ' (vos)'}
              </span>
              {!c.isMe && event.status === 'upcoming' && (
                <button
                  onClick={() => {
                    if (confirm(`¿${c.name} se baja del partido?`)) removeConfirmedContact(event.id, c.id)
                  }}
                  className="text-xs font-medium text-red-600 dark:text-red-400"
                >
                  Se baja
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {event.status === 'upcoming' && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rondas de invitación</h2>

          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              onSendWhatsApp={() => setQueueRoundId(round.id)}
            />
          ))}

          {activeRound ? (
            <button
              onClick={() => closeActiveRound(event.id)}
              className="rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Pasar a la próxima ronda
            </button>
          ) : (
            vacancies > 0 && (
              <NewRoundControls eventId={event.id} eligibleContactIds={eligible.map((c) => c.id)} />
            )
          )}
        </section>
      )}

      {event.status === 'upcoming' && (
        <section className="flex flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
          <button
            onClick={() => markEventCompleted(event.id)}
            className="rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
          >
            Marcar como jugado
          </button>
          <button
            onClick={() => {
              const name = prompt('Nombre del template', `${sport.name} ${event.club}`)
              if (name) saveEventAsTemplate(event.id, name)
            }}
            className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Guardar como template
          </button>
          <button
            onClick={() => {
              if (confirm('¿Cancelar este evento?')) cancelEvent(event.id)
            }}
            className="rounded-lg py-2 text-sm font-medium text-red-600 dark:text-red-400"
          >
            Cancelar evento
          </button>
        </section>
      )}

      {queueRoundId && (
        <WhatsAppQueue
          roundId={queueRoundId}
          eventId={event.id}
          onClose={() => setQueueRoundId(null)}
        />
      )}
    </div>
  )
}

function RoundCard({ round, onSendWhatsApp }: { round: Round; onSendWhatsApp: () => void }) {
  const data = useAppData()
  const invitations = getInvitationsForRound(data, round.id)
  const statusLabel: Record<Round['status'], string> = {
    pending: 'Por activar',
    active: 'Activa',
    completed: 'Completada',
    skipped: 'Saltada',
  }

  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Ronda {round.order}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{statusLabel[round.status]}</span>
      </div>

      {round.status === 'pending' && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {round.contactIds.length} contacto{round.contactIds.length === 1 ? '' : 's'} listo
            {round.contactIds.length === 1 ? '' : 's'} para invitar.
          </p>
          <button
            onClick={() => activateRound(round.id)}
            className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white active:bg-emerald-700"
          >
            Activar Ronda {round.order}
          </button>
        </div>
      )}

      {round.status === 'active' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={onSendWhatsApp}
            className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white active:bg-emerald-700"
          >
            Enviar por WhatsApp
          </button>
          <div className="flex flex-col gap-1">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} />
            ))}
          </div>
        </div>
      )}

      {(round.status === 'completed' || round.status === 'skipped') && (
        <div className="flex flex-col gap-1">
          {invitations.map((inv) => (
            <InvitationRow key={inv.id} invitation={inv} readOnlyIfClosed />
          ))}
        </div>
      )}
    </div>
  )
}

function NewRoundControls({
  eventId,
  eligibleContactIds,
}: {
  eventId: string
  eligibleContactIds: string[]
}) {
  const data = useAppData()
  const [building, setBuilding] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [quickPickId, setQuickPickId] = useState('')

  const eligible = eligibleContactIds.map((id) => getContact(data, id)!).filter(Boolean)

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  if (eligible.length === 0) {
    return <p className="text-sm text-gray-400">No quedan contactos disponibles para invitar.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          value={quickPickId}
          onChange={(e) => setQuickPickId(e.target.value)}
        >
          <option value="">Invitar directamente a...</option>
          {eligible.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          disabled={!quickPickId}
          onClick={() => {
            quickInvite(eventId, quickPickId)
            setQuickPickId('')
          }}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Invitar
        </button>
      </div>

      {!building ? (
        <button
          onClick={() => setBuilding(true)}
          className="rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          Armar una ronda con varios
        </button>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
          {eligible.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
              <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
            </label>
          ))}
          <button
            disabled={selected.length === 0}
            onClick={() => {
              createRound(eventId, selected)
              setSelected([])
              setBuilding(false)
            }}
            className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Armar ronda
          </button>
        </div>
      )}
    </div>
  )
}
