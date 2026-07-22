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
import { getSportConfig } from '../data/sports'
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
    <div className="list-row justify-between">
      <div>
        <p className="text-sm text-ink">{contact.name}</p>
        <p className="hint">{STATUS_LABEL[invitation.status]}</p>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {invitation.status === 'invited' && !locked && (
          <>
            <button onClick={() => acceptInvitation(invitation.id)} className="text-brand text-xs font-semibold">
              Aceptó
            </button>
            <button onClick={() => declineInvitation(invitation.id)} className="text-danger text-xs font-semibold">
              Rechazó
            </button>
            <button onClick={() => expireInvitation(invitation.id)} className="text-muted text-xs font-semibold">
              Expiró
            </button>
          </>
        )}

        {locked && (
          <button
            onClick={() => {
              const sportName = getSportConfig(event.sportId, data.customSports).name
              const message = fillMessageTemplate(CUPO_CUBIERTO_TEXT, event, sportName, contact.name)
              window.open(buildWaMeLink(contact.phone, message), '_blank')
              markCupoCubierto(invitation.id)
            }}
            className="text-xs font-semibold"
            style={{ color: '#92400e' }}
          >
            Cupo cubierto
          </button>
        )}

        {!readOnlyIfClosed && (invitation.status === 'declined' || invitation.status === 'expired') && (
          <button onClick={() => reopenInvitation(invitation.id, 'invited')} className="text-brand text-xs font-semibold">
            Reabrir
          </button>
        )}

        {!readOnlyIfClosed && (
          <button
            onClick={() => {
              if (confirm('¿Eliminar esta invitación?')) deleteInvitation(invitation.id)
            }}
            className="text-muted text-xs font-semibold"
          >
            Borrar
          </button>
        )}
      </div>
    </div>
  )
}
