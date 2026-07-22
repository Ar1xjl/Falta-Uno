import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getData, useAppData } from '../data/store'
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
  linkEventToShare,
  markEventCompleted,
  mergeContactsFromShareMembers,
  quickInvite,
  rejoinEvent,
  removeConfirmedContact,
  saveEventAsTemplate,
} from '../data/actions'
import { getSportConfig } from '../data/sports'
import { buildMapsLink, downloadICS } from '../lib/calendar'
import { createEventShare } from '../lib/eventShares'
import { listEventShareMembers, subscribeToEventShareMembers, upsertOwnMemberProfile } from '../lib/eventShareMembers'
import type { EventShareMemberRow } from '../lib/eventShareMembers'
import { signInWithDeviceKey } from '../lib/pubkeyAuth'
import { supabase, supabaseEnabled } from '../lib/supabase'
import { buildWaMeShareLink } from '../lib/whatsapp'
import { toErrorMessage } from '../lib/errors'
import type { Event, Round } from '../types'
import InvitationRow from '../components/InvitationRow'
import WhatsAppQueue from '../components/WhatsAppQueue'
import PageHeader from '../components/PageHeader'

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const data = useAppData()
  const navigate = useNavigate()
  const [queueRoundId, setQueueRoundId] = useState<string | null>(null)

  const event = data.events.find((e) => e.id === eventId)
  if (!event) {
    return (
      <div className="p-4">
        <p className="text-muted text-sm">Evento no encontrado.</p>
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
    <div className="flex flex-col">
      <PageHeader
        title={sport.name}
        sticky
        leading={
          <button onClick={() => navigate('/')} className="text-muted text-sm">
            ← Volver
          </button>
        }
      />

      <div className="flex flex-col gap-5 p-4">
        <div>
          <p className="text-muted text-sm">
            {event.club}
            {event.court ? ` · Cancha ${event.court}` : ''}
          </p>
          <p className="text-muted text-sm">
            {event.date} · {event.time}hs
          </p>
          {event.status !== 'upcoming' && (
            <span className="badge-neutral mt-1 inline-block">
              {event.status === 'completed' ? 'Jugado' : 'Cancelado'}
            </span>
          )}
        </div>

        {event.status === 'upcoming' && (
          <div className="flex gap-2">
            <button onClick={() => downloadICS(event)} className="btn btn-ghost flex-1">
              📅 Agendar
            </button>
            <a
              href={buildMapsLink(event.club)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost flex-1 text-center"
            >
              📍 Cómo llegar
            </a>
            <button onClick={() => navigate(`/expenses/new?eventId=${event.id}`)} className="btn btn-ghost flex-1">
              💰 Gasto
            </button>
          </div>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="card-title mb-0">
              Confirmados ({confirmed.length}/{sport.requiredPlayers})
            </h2>
            {vacancies > 0 ? (
              <span className="text-xs font-semibold" style={{ color: '#92400e' }}>
                Faltan {vacancies}
              </span>
            ) : (
              <span className="text-brand text-xs font-semibold">Cupo lleno</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {confirmed.map((c) => (
              <div key={c.id} className="list-row justify-between">
                <span className="text-sm text-ink">
                  {c.name}
                  {c.isMe && ' (vos)'}
                </span>
                {event.status === 'upcoming' && (
                  <button
                    onClick={() => {
                      const question = c.isMe ? '¿Te bajás del partido?' : `¿${c.name} se baja del partido?`
                      if (confirm(question)) removeConfirmedContact(event.id, c.id)
                    }}
                    className="text-danger text-xs font-semibold"
                  >
                    Se baja
                  </button>
                )}
              </div>
            ))}
          </div>
          {event.status === 'upcoming' && !confirmed.some((c) => c.isMe) && (
            <div className="list-row mt-1 justify-between">
              <span className="text-sm text-ink">Vos no estás anotado</span>
              <button onClick={() => rejoinEvent(event.id)} disabled={vacancies <= 0} className="text-brand text-xs font-semibold disabled:opacity-40">
                Sumarme
              </button>
            </div>
          )}
        </section>

        {event.status === 'upcoming' && <ShareSection event={event} />}

        {event.status === 'upcoming' && (
          <section className="flex flex-col gap-3">
            <h2 className="card-title mb-0">Rondas de invitación</h2>

            {rounds.map((round) => (
              <RoundCard key={round.id} round={round} onSendWhatsApp={() => setQueueRoundId(round.id)} />
            ))}

            {activeRound ? (
              <button onClick={() => closeActiveRound(event.id)} className="btn btn-ghost">
                Pasar a la próxima ronda
              </button>
            ) : (
              vacancies > 0 && (
                <NewRoundControls
                  eventId={event.id}
                  eligibleContactIds={eligible.map((c) => c.id)}
                  sportCategory={sport.category}
                  sportName={sport.name}
                />
              )
            )}
          </section>
        )}

        {event.status === 'upcoming' && (
          <section className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: 'var(--color-line)' }}>
            <button onClick={() => markEventCompleted(event.id)} className="btn btn-ghost active">
              Marcar como jugado
            </button>
            <button
              onClick={() => {
                const name = prompt('Nombre del grupo', `${sport.name} ${event.club}`)
                if (name) saveEventAsTemplate(event.id, name)
              }}
              className="btn btn-ghost"
            >
              Guardar como grupo
            </button>
            <button
              onClick={() => {
                if (confirm('¿Cancelar este evento?')) cancelEvent(event.id)
              }}
              className="btn-danger"
            >
              Cancelar evento
            </button>
          </section>
        )}

        {queueRoundId && <WhatsAppQueue roundId={queueRoundId} eventId={event.id} onClose={() => setQueueRoundId(null)} />}
      </div>
    </div>
  )
}

function inviteLink(shareId: string): string {
  return `${window.location.origin}/?invite=${shareId}`
}

function ShareSection({ event }: { event: Event }) {
  const [members, setMembers] = useState<EventShareMemberRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!event.sharedId || !supabaseEnabled) return
    let cancelled = false
    listEventShareMembers(event.sharedId)
      .then((rows) => {
        if (!cancelled) setMembers(rows)
      })
      .catch(() => {})
    return subscribeToEventShareMembers(event.sharedId, setMembers)
  }, [event.sharedId])

  // Cada vez que cambia la lista de compañeros de sala, agrego a mi agenda a los que no tenía.
  useEffect(() => {
    if (members.length === 0) return
    mergeContactsFromShareMembers(members)
  }, [members])

  if (!supabaseEnabled) return null

  async function handleShare() {
    setLoading(true)
    setError(null)
    try {
      if (!supabase) throw new Error('Supabase no está configurado.')
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) await signInWithDeviceKey()
      const created = await createEventShare(event.id, {
        sportId: event.sportId,
        club: event.club,
        court: event.court,
        date: event.date,
        time: event.time,
      })
      linkEventToShare(event.id, created.id)

      const me = getData().contacts.find((c) => c.isMe)
      if (me) await upsertOwnMemberProfile(created.id, me.name, me.phone)
      setMembers(await listEventShareMembers(created.id))
    } catch (e) {
      setError(toErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card flex flex-col gap-2">
      <h2 className="card-title mb-0">Compartir por link</h2>
      {!event.sharedId ? (
        <>
          <p className="hint">
            Mandale un link a quien ya tenés agendado en WhatsApp — entra directo a este evento, sin
            pedirle nada más.
          </p>
          <button onClick={handleShare} disabled={loading} className="btn btn-primary">
            {loading ? 'Generando…' : 'Compartir por WhatsApp'}
          </button>
        </>
      ) : (
        <>
          <p className="hint">
            {members.length === 0
              ? 'Todavía nadie se sumó por este link.'
              : `Por este link: ${members.map((m) => m.name).join(', ')}`}
          </p>
          <a
            className="btn btn-primary text-center"
            href={buildWaMeShareLink(`Dale que jugamos, sumate acá: ${inviteLink(event.sharedId)}`)}
            target="_blank"
            rel="noreferrer"
          >
            Invitar por WhatsApp
          </a>
        </>
      )}
      {error && <p className="text-danger text-sm">{error}</p>}
    </section>
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
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Ronda {round.order}</span>
        <span className="hint">{statusLabel[round.status]}</span>
      </div>

      {round.status === 'pending' && (
        <div className="flex flex-col gap-2">
          <p className="hint">
            {round.contactIds.length} contacto{round.contactIds.length === 1 ? '' : 's'} listo
            {round.contactIds.length === 1 ? '' : 's'} para invitar.
          </p>
          <button onClick={() => activateRound(round.id)} className="btn btn-primary">
            Activar Ronda {round.order}
          </button>
        </div>
      )}

      {round.status === 'active' && (
        <div className="flex flex-col gap-2">
          <button onClick={onSendWhatsApp} className="btn btn-primary">
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
  sportCategory,
  sportName,
}: {
  eventId: string
  eligibleContactIds: string[]
  sportCategory: string
  sportName: string
}) {
  const data = useAppData()
  const [building, setBuilding] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [quickPickId, setQuickPickId] = useState('')
  const [onlyThisSport, setOnlyThisSport] = useState(false)

  const eligible = eligibleContactIds.map((id) => getContact(data, id)!).filter(Boolean)
  // Untagged contacts always show — filtering only ever hides someone tagged for a *different* sport.
  const shown = onlyThisSport
    ? eligible.filter((c) => !c.sports || c.sports.length === 0 || c.sports.includes(sportCategory))
    : eligible

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  if (eligible.length === 0) {
    return <p className="hint">No quedan contactos disponibles para invitar.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={onlyThisSport} onChange={(e) => setOnlyThisSport(e.target.checked)} />
        <span className="hint">Sólo quienes juegan {sportName}</span>
      </label>

      {shown.length === 0 ? (
        <p className="hint">Nadie tiene esa etiqueta todavía — probá sin el filtro.</p>
      ) : (
        <>
          <div className="flex gap-2">
            <select className="flex-1" value={quickPickId} onChange={(e) => setQuickPickId(e.target.value)}>
              <option value="">Invitar directamente a...</option>
              {shown.map((c) => (
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
              className="btn btn-primary"
            >
              Invitar
            </button>
          </div>

          {!building ? (
            <button onClick={() => setBuilding(true)} className="btn btn-ghost">
              Armar una ronda con varios
            </button>
          ) : (
            <div className="card flex flex-col gap-2">
              {shown.map((c) => (
                <label key={c.id} className="list-row">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span className="text-sm text-ink">{c.name}</span>
                </label>
              ))}
              <button
                disabled={selected.length === 0}
                onClick={() => {
                  createRound(eventId, selected)
                  setSelected([])
                  setBuilding(false)
                }}
                className="btn btn-primary"
              >
                Armar ronda
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
