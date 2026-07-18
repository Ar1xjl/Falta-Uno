import type { AppData, Contact, Event, Invitation, Round } from '../types'
import { getSportConfig } from './sports'

export function getContact(data: AppData, contactId: string): Contact | undefined {
  return data.contacts.find((c) => c.id === contactId)
}

export function getMeContact(data: AppData): Contact | undefined {
  return data.contacts.find((c) => c.isMe)
}

export function getVacancies(event: Event): number {
  const sport = getSportConfig(event.sportId)
  return sport.requiredPlayers - event.confirmedContactIds.length
}

export function isEventFull(event: Event): boolean {
  return getVacancies(event) <= 0
}

export function getConfirmedContacts(data: AppData, event: Event): Contact[] {
  return event.confirmedContactIds
    .map((id) => getContact(data, id))
    .filter((c): c is Contact => Boolean(c))
}

export function getRoundsForEvent(data: AppData, eventId: string): Round[] {
  return data.rounds
    .filter((r) => r.eventId === eventId)
    .sort((a, b) => a.order - b.order)
}

export function getActiveRound(data: AppData, eventId: string): Round | undefined {
  return data.rounds.find((r) => r.eventId === eventId && r.status === 'active')
}

export function getInvitationsForRound(data: AppData, roundId: string): Invitation[] {
  return data.invitations.filter((i) => i.roundId === roundId)
}

export function getInvitationsForEvent(data: AppData, eventId: string): Invitation[] {
  const roundIds = new Set(getRoundsForEvent(data, eventId).map((r) => r.id))
  return data.invitations.filter((i) => roundIds.has(i.roundId))
}

/** Any contact that already has an Invitation (any status, any round) for this event — rule 2: no double invitation. */
export function getInvitedContactIdsForEvent(data: AppData, eventId: string): Set<string> {
  return new Set(getInvitationsForEvent(data, eventId).map((i) => i.contactId))
}

/** Contacts eligible to appear in an invite picker for this event: not isMe, not already confirmed, not already invited. */
export function getEligibleContactsForEvent(data: AppData, eventId: string, event: Event): Contact[] {
  const invited = getInvitedContactIdsForEvent(data, eventId)
  const confirmed = new Set(event.confirmedContactIds)
  return data.contacts.filter((c) => !c.isMe && !confirmed.has(c.id) && !invited.has(c.id))
}

export function getUpcomingEventsSorted(data: AppData): Event[] {
  return data.events
    .filter((e) => e.status === 'upcoming')
    .sort((a, b) => {
      const aOpen = getVacancies(a) > 0
      const bOpen = getVacancies(b) > 0
      if (aOpen !== bOpen) return aOpen ? -1 : 1
      return `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    })
}

export function getHistoryEvents(data: AppData): Event[] {
  return data.events
    .filter((e) => e.status === 'completed' || e.status === 'cancelled')
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
}

/** True once vacancies hit 0 — used to lock further "Aceptó" taps (rule 7), independent of Event.status. */
export function isAcceptLocked(event: Event): boolean {
  return isEventFull(event)
}

/** Count of upcoming events whose active round still has an invitation awaiting a response — drives the nav alert badge. */
export function getAttentionCount(data: AppData): number {
  const ids = new Set<string>()
  for (const event of data.events) {
    if (event.status !== 'upcoming') continue
    const round = getActiveRound(data, event.id)
    if (!round) continue
    const pending = getInvitationsForRound(data, round.id).some((i) => i.status === 'invited')
    if (pending) ids.add(event.id)
  }
  return ids.size
}
