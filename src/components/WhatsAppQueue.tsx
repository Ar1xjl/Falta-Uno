import { useState } from 'react'
import { useAppData } from '../data/store'
import { getContact, getInvitationsForRound, isEventFull } from '../data/selectors'
import { buildWaMeLink, DEFAULT_MESSAGE_TEMPLATE_TEXT, fillMessageTemplate } from '../lib/whatsapp'

export default function WhatsAppQueue({
  roundId,
  eventId,
  onClose,
}: {
  roundId: string
  eventId: string
  onClose: () => void
}) {
  const data = useAppData()
  const [index, setIndex] = useState(0)

  const event = data.events.find((e) => e.id === eventId)
  const round = data.rounds.find((r) => r.id === roundId)
  if (!event || !round) return null

  const pending = getInvitationsForRound(data, roundId).filter(
    (i) => i.status === 'invited' && !isEventFull(event),
  )

  const template = round.messageTemplateId
    ? data.messageTemplates.find((t) => t.id === round.messageTemplateId)
    : undefined
  const messageText = fillMessageTemplate(template?.text ?? DEFAULT_MESSAGE_TEMPLATE_TEXT, event)

  const current = pending[index]
  const contact = current ? getContact(data, current.contactId) : undefined

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40">
      <div className="card mx-auto w-full max-w-md rounded-b-none">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="card-title mb-0">Cola de WhatsApp</h3>
          <button onClick={onClose} className="text-muted text-sm">
            Cerrar
          </button>
        </div>

        {!current || !contact ? (
          <p className="empty-state">No quedan invitaciones pendientes de enviar en esta ronda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="hint">
              {index + 1} de {pending.length}
            </p>
            <p className="text-base font-semibold text-ink">{contact.name}</p>
            <p className="rounded-[7px] p-3 text-sm text-ink" style={{ background: 'var(--color-bg)' }}>
              {messageText}
            </p>
            <a href={buildWaMeLink(contact.phone, messageText)} target="_blank" rel="noreferrer" className="btn btn-primary text-center">
              Abrir WhatsApp
            </a>
            <button onClick={() => setIndex((i) => i + 1)} className="btn btn-ghost">
              Ya envié, siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
