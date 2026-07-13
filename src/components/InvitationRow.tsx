import { useAppData } from '../data/store'
import { getContact, isEventFull } from '../data/selectors'
import {
  acceptInvitation,
  declineInvitation,
  deleteInvitation,
  expireInvitation,
  markCupoCubierto,
  reopenInvitation,
} from '../data/actions'
import type { Invitation } from '../types'
import { buildWaMeLink, fillMessageTemplate } from '../lib/whatsapp'

const CUPO_CUBIERTO_TEXT = 'La posición está cubierta, si se abre un hueco te aviso. Si no, la próxima.'

const STATUS_LABEL: Record<Invitation['status'], string> = {
  not_invited: 'No invitado',
  invited: 'Invitado',
  accepted: 'Aceptó',
  declined: 'Rechazó',
  expired: 'Expiró',
}

export default function InvitationRow({
  invitation,
  readOnlyIfClosed,
}: {
  invitation: Invitation
  readOnlyIfClosed?: boolean
}) {
  const data = useAppData()
  const contact = getContact(data, invitation.contactId)
  const round = data.rounds.find((r) => r.id === invitation.roundId)
  const event = round ? data.events.find((e) => e.id === round.eventId) : undefined
  if (!contact || !event) return null

  const locked = invitation.status === 'invited' && isEventFull(event)

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800">
      <div>
        <p className="text-sm text-gray-800 dark:text-gray-200">{contact.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{STATUS_LABEL[invitation.status]}</p>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {invitation.status === 'invited' && !locked && (
          <>
            <button
              onClick={() => acceptInvitation(invitation.id)}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              Aceptó
            </button>
            <button
              onClick={() => declineInvitation(invitation.id)}
              className="text-xs font-medium text-red-600 dark:text-red-400"
            >
              Rechazó
            </button>
            <button
              onClick={() => expireInvitation(invitation.id)}
              className="text-xs font-medium text-gray-500 dark:text-gray-400"
            >
              Expiró
            </button>
          </>
        )}

        {locked && (
          <button
            onClick={() => {
              const message = fillMessageTemplate(CUPO_CUBIERTO_TEXT, event)
              window.open(buildWaMeLink(contact.phone, message), '_blank')
              markCupoCubierto(invitation.id)
            }}
            className="text-xs font-medium text-amber-700 dark:text-amber-400"
          >
            Cupo cubierto
          </button>
        )}

        {!readOnlyIfClosed && (invitation.status === 'declined' || invitation.status === 'expired') && (
          <button
            onClick={() => reopenInvitation(invitation.id, 'invited')}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            Reabrir
          </button>
        )}

        {!readOnlyIfClosed && (
          <button
            onClick={() => {
              if (confirm('¿Eliminar esta invitación?')) deleteInvitation(invitation.id)
            }}
            className="text-xs font-medium text-gray-400 dark:text-gray-500"
          >
            Borrar
          </button>
        )}
      </div>
    </div>
  )
}
