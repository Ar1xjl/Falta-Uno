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
      <div className="mx-auto w-full max-w-md rounded-t-2xl bg-white p-4 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Cola de WhatsApp</h3>
          <button onClick={onClose} className="text-sm text-gray-500 dark:text-gray-400">
            Cerrar
          </button>
        </div>

        {!current || !contact ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No quedan invitaciones pendientes de enviar en esta ronda.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400">
              {index + 1} de {pending.length}
            </p>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100">{contact.name}</p>
            <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {messageText}
            </p>
            <a
              href={buildWaMeLink(contact.phone, messageText)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-emerald-600 py-3 text-center text-sm font-medium text-white active:bg-emerald-700"
            >
              Abrir WhatsApp
            </a>
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Ya envié, siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
