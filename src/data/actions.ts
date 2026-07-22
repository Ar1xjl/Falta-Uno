import { newId } from './id'
import { getData, update } from './store'
import { getActiveRound, getEligibleContactsForEvent, isEventFull } from './selectors'
import type {
  AppData,
  Contact,
  Event,
  EventTemplate,
  Expense,
  MessageTemplate,
  Round,
  Settlement,
} from '../types'

// ---------- Contacts ----------

export function ensureMeContact(name: string, phone: string): void {
  update((data) => {
    if (data.contacts.some((c) => c.isMe)) return data
    const me: Contact = { id: newId(), name, phone, isMe: true }
    return { ...data, contacts: [...data.contacts, me] }
  })
}

export function addContact(name: string, phone: string, note?: string, sports?: string[], paymentAlias?: string): void {
  update((data) => ({
    ...data,
    contacts: [...data.contacts, { id: newId(), name, phone, note, isMe: false, sports, paymentAlias }],
  }))
}

export function updateContact(
  id: string,
  patch: Partial<Pick<Contact, 'name' | 'phone' | 'note' | 'sports' | 'paymentAlias'>>,
): void {
  update((data) => ({
    ...data,
    contacts: data.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }))
}

export function deleteContact(id: string): void {
  update((data) => {
    const contact = data.contacts.find((c) => c.id === id)
    if (!contact || contact.isMe) return data
    return { ...data, contacts: data.contacts.filter((c) => c.id !== id) }
  })
}

// ---------- Events ----------

export function createEvent(input: {
  sportId: string
  club: string
  court?: string
  date: string
  time: string
  confirmedContactIds: string[]
  templateId?: string
  sharedId?: string
}): string {
  const id = newId()
  update((data) => {
    const meId = data.contacts.find((c) => c.isMe)?.id
    const confirmedContactIds = meId
      ? Array.from(new Set([meId, ...input.confirmedContactIds]))
      : input.confirmedContactIds
    const event: Event = {
      id,
      sportId: input.sportId,
      club: input.club,
      court: input.court,
      date: input.date,
      time: input.time,
      confirmedContactIds,
      status: 'upcoming',
      templateId: input.templateId,
      sharedId: input.sharedId,
    }
    return { ...data, events: [...data.events, event] }
  })
  return id
}

/** Ata un evento local ya existente al event_share que se acaba de crear para compartirlo. */
export function linkEventToShare(eventId: string, sharedId: string): void {
  update((data) => ({
    ...data,
    events: data.events.map((e) => (e.id === eventId ? { ...e, sharedId } : e)),
  }))
}

export function createEventFromTemplate(templateId: string, date: string, time: string): string {
  const id = newId()
  update((data) => {
    const template = data.eventTemplates.find((t) => t.id === templateId)
    if (!template) return data
    const event: Event = {
      id,
      sportId: template.sportId,
      club: template.club,
      court: template.court,
      date,
      time,
      confirmedContactIds: template.defaultConfirmedContactIds,
      status: 'upcoming',
      templateId: template.id,
    }
    const rounds: Round[] = template.defaultRounds.map((r) => ({
      id: newId(),
      eventId: id,
      order: r.order,
      contactIds: r.contactIds,
      status: 'pending',
      messageTemplateId: r.messageTemplateId,
    }))
    return { ...data, events: [...data.events, event], rounds: [...data.rounds, ...rounds] }
  })
  return id
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function computeRecurringDates(weekday: number, opts: { count: number } | { untilDate: string }): string[] {
  const dates: string[] = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  cursor.setDate(cursor.getDate() + ((weekday - cursor.getDay() + 7) % 7))

  if ('count' in opts) {
    for (let i = 0; i < opts.count; i++) {
      dates.push(toISODate(cursor))
      cursor.setDate(cursor.getDate() + 7)
    }
  } else {
    const until = new Date(`${opts.untilDate}T00:00:00`)
    while (cursor <= until) {
      dates.push(toISODate(cursor))
      cursor.setDate(cursor.getDate() + 7)
    }
  }
  return dates
}

/** Bulk-creates upcoming Events from a template's recurrence (weekday + time), skipping dates already generated. Returns how many were created. */
export function generateRecurringEvents(templateId: string, opts: { count: number } | { untilDate: string }): number {
  const data = getData()
  const template = data.eventTemplates.find((t) => t.id === templateId)
  if (!template?.recurrence) return 0
  const existingDates = new Set(data.events.filter((e) => e.templateId === templateId).map((e) => e.date))
  const newDates = computeRecurringDates(template.recurrence.weekday, opts).filter((d) => !existingDates.has(d))
  for (const date of newDates) {
    createEventFromTemplate(templateId, date, template.recurrence.time)
  }
  return newDates.length
}

/** "Se baja": remove a confirmed player (including the organizer) from an event, reopening a vacancy instantly. */
export function removeConfirmedContact(eventId: string, contactId: string): void {
  update((data) => {
    const contact = data.contacts.find((c) => c.id === contactId)
    if (!contact) return data
    return {
      ...data,
      events: data.events.map((e) =>
        e.id === eventId
          ? { ...e, confirmedContactIds: e.confirmedContactIds.filter((id) => id !== contactId) }
          : e,
      ),
    }
  })
}

/** Lets the organizer rejoin an event they'd previously dropped out of, if there's still room. */
export function rejoinEvent(eventId: string): void {
  update((data) => {
    const event = data.events.find((e) => e.id === eventId)
    const me = data.contacts.find((c) => c.isMe)
    if (!event || !me) return data
    if (event.confirmedContactIds.includes(me.id) || isEventFull(event)) return data
    return {
      ...data,
      events: data.events.map((e) =>
        e.id === eventId ? { ...e, confirmedContactIds: [...e.confirmedContactIds, me.id] } : e,
      ),
    }
  })
}

/** Manual "Marcar como jugado" — the only way an Event becomes historical (rule 8). */
export function markEventCompleted(eventId: string): void {
  update((data) => ({
    ...data,
    events: data.events.map((e) => (e.id === eventId ? { ...e, status: 'completed' } : e)),
  }))
}

export function cancelEvent(eventId: string): void {
  update((data) => ({
    ...data,
    events: data.events.map((e) => (e.id === eventId ? { ...e, status: 'cancelled' } : e)),
  }))
}

export function saveEventAsTemplate(eventId: string, name: string): void {
  update((data) => {
    const event = data.events.find((e) => e.id === eventId)
    if (!event) return data
    const rounds = data.rounds
      .filter((r) => r.eventId === eventId)
      .sort((a, b) => a.order - b.order)
    const template: EventTemplate = {
      id: newId(),
      name,
      sportId: event.sportId,
      club: event.club,
      court: event.court,
      defaultConfirmedContactIds: event.confirmedContactIds,
      defaultRounds: rounds.map((r) => ({
        order: r.order,
        contactIds: r.contactIds,
        messageTemplateId: r.messageTemplateId,
      })),
    }
    return { ...data, eventTemplates: [...data.eventTemplates, template] }
  })
}

// ---------- Rounds ----------

function nextRoundOrder(data: AppData, eventId: string): number {
  const orders = data.rounds.filter((r) => r.eventId === eventId).map((r) => r.order)
  return orders.length ? Math.max(...orders) + 1 : 1
}

export function createRound(eventId: string, contactIds: string[], messageTemplateId?: string): string {
  const id = newId()
  update((data) => {
    const round: Round = {
      id,
      eventId,
      order: nextRoundOrder(data, eventId),
      contactIds,
      status: 'pending',
      messageTemplateId,
    }
    return { ...data, rounds: [...data.rounds, round] }
  })
  return id
}

/** Rule 5: only one active Round per Event. Creates an Invitation per contact (rule: created when Round becomes active). */
export function activateRound(roundId: string): void {
  update((data) => {
    const round = data.rounds.find((r) => r.id === roundId)
    if (!round) return data
    if (getActiveRound(data, round.eventId)) return data // guard: an active round already exists
    const now = new Date().toISOString()
    const invitations = round.contactIds.map((contactId) => ({
      id: newId(),
      roundId: round.id,
      contactId,
      status: 'invited' as const,
      invitedAt: now,
    }))
    return {
      ...data,
      rounds: data.rounds.map((r) => (r.id === roundId ? { ...r, status: 'active' as const } : r)),
      invitations: [...data.invitations, ...invitations],
    }
  })
}

/** "Pasar a Ronda N": closes the active round. Outcome is automatic — completed if there were any responses, skipped otherwise. */
export function closeActiveRound(eventId: string): void {
  update((data) => {
    const round = getActiveRound(data, eventId)
    if (!round) return data
    const invitations = data.invitations.filter((i) => i.roundId === round.id)
    const hadResponses = invitations.some((i) => i.status !== 'invited')
    return {
      ...data,
      rounds: data.rounds.map((r) =>
        r.id === round.id ? { ...r, status: hadResponses ? 'completed' : 'skipped' } : r,
      ),
    }
  })
}

/** Quick-invite shortcut: one contact, no round-building UI — implemented as a 1-contact Round created + activated. */
export function quickInvite(eventId: string, contactId: string, messageTemplateId?: string): void {
  const data = getData()
  const event = data.events.find((e) => e.id === eventId)
  if (!event) return
  const eligible = getEligibleContactsForEvent(data, eventId, event).some((c) => c.id === contactId)
  if (!eligible) return
  if (getActiveRound(data, eventId)) return // rule 5: must close the active round first
  const roundId = createRound(eventId, [contactId], messageTemplateId)
  activateRound(roundId)
}

// ---------- Invitations ----------

function findInvitationContext(data: AppData, invitationId: string) {
  const invitation = data.invitations.find((i) => i.id === invitationId)
  if (!invitation) return undefined
  const round = data.rounds.find((r) => r.id === invitation.roundId)
  if (!round) return undefined
  const event = data.events.find((e) => e.id === round.eventId)
  if (!event) return undefined
  return { invitation, round, event }
}

/** Shared by acceptInvitation and reopenInvitation(accepted): marks accepted + adds to confirmedContactIds, unless locked (rule 7). */
function applyAccept(data: AppData, invitationId: string): AppData {
  const ctx = findInvitationContext(data, invitationId)
  if (!ctx) return data
  if (isEventFull(ctx.event)) return data // locked — UI should offer "Cupo cubierto" instead
  const now = new Date().toISOString()
  return {
    ...data,
    invitations: data.invitations.map((i) =>
      i.id === invitationId ? { ...i, status: 'accepted', respondedAt: now } : i,
    ),
    events: data.events.map((e) =>
      e.id === ctx.event.id
        ? { ...e, confirmedContactIds: Array.from(new Set([...e.confirmedContactIds, ctx.invitation.contactId])) }
        : e,
    ),
  }
}

/** Rule 1 + rule 7: accepting adds the contact to confirmedContactIds, but is blocked once the event is already full. */
export function acceptInvitation(invitationId: string): void {
  update((data) => applyAccept(data, invitationId))
}

export function declineInvitation(invitationId: string): void {
  setInvitationStatus(invitationId, 'declined')
}

export function expireInvitation(invitationId: string): void {
  setInvitationStatus(invitationId, 'expired')
}

/** Rule 7 courtesy flow: contact accepted too late: locked out, marked expired instead of accepted. */
export function markCupoCubierto(invitationId: string): void {
  setInvitationStatus(invitationId, 'expired')
}

function setInvitationStatus(invitationId: string, status: 'declined' | 'expired'): void {
  update((data) => {
    const now = new Date().toISOString()
    return {
      ...data,
      invitations: data.invitations.map((i) =>
        i.id === invitationId ? { ...i, status, respondedAt: now } : i,
      ),
    }
  })
}

/** Rule 3: declined/expired are reopenable. Edits the existing Invitation — never creates a new one. */
export function reopenInvitation(invitationId: string, newStatus: 'invited' | 'accepted'): void {
  if (newStatus === 'accepted') {
    update((data) => applyAccept(data, invitationId))
    return
  }
  update((data) => ({
    ...data,
    invitations: data.invitations.map((i) =>
      i.id === invitationId ? { ...i, status: 'invited', respondedAt: undefined } : i,
    ),
  }))
}

/** Invitation sent by error — deletable with confirmation (UI's job to confirm). */
export function deleteInvitation(invitationId: string): void {
  update((data) => {
    const invitation = data.invitations.find((i) => i.id === invitationId)
    if (!invitation) return data
    const wasAccepted = invitation.status === 'accepted'
    return {
      ...data,
      invitations: data.invitations.filter((i) => i.id !== invitationId),
      events: wasAccepted
        ? data.events.map((e) =>
            e.confirmedContactIds.includes(invitation.contactId)
              ? { ...e, confirmedContactIds: e.confirmedContactIds.filter((id) => id !== invitation.contactId) }
              : e,
          )
        : data.events,
    }
  })
}

// ---------- MessageTemplates ----------

export function addMessageTemplate(name: string, text: string): string {
  const id = newId()
  update((data) => ({
    ...data,
    messageTemplates: [...data.messageTemplates, { id, name, text } as MessageTemplate],
  }))
  return id
}

export function updateMessageTemplate(id: string, patch: Partial<Pick<MessageTemplate, 'name' | 'text'>>): void {
  update((data) => ({
    ...data,
    messageTemplates: data.messageTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }))
}

export function deleteMessageTemplate(id: string): void {
  update((data) => ({
    ...data,
    messageTemplates: data.messageTemplates.filter((t) => t.id !== id),
  }))
}

// ---------- EventTemplates ----------

export function createEventTemplate(input: Omit<EventTemplate, 'id'>): string {
  const id = newId()
  update((data) => ({
    ...data,
    eventTemplates: [...data.eventTemplates, { id, ...input }],
  }))
  return id
}

export function updateEventTemplate(id: string, patch: Partial<Omit<EventTemplate, 'id'>>): void {
  update((data) => ({
    ...data,
    eventTemplates: data.eventTemplates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  }))
}

export function deleteEventTemplate(id: string): void {
  update((data) => ({
    ...data,
    eventTemplates: data.eventTemplates.filter((t) => t.id !== id),
  }))
}

// ---------- Expenses & Settlements ----------

/** Picks the next `count` upcoming (non-cancelled) events for a template from `fromDate`, generating new ones from its recurrence if not enough exist yet. */
export function getUpcomingTemplateEventIds(templateId: string, fromDate: string, count: number): string[] {
  const template = getData().eventTemplates.find((t) => t.id === templateId)
  if (!template) return []

  function upcoming(): Event[] {
    return getData()
      .events.filter((e) => e.templateId === templateId && e.status !== 'cancelled' && e.date >= fromDate)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  if (upcoming().length < count && template.recurrence) {
    generateRecurringEvents(templateId, { count })
  }
  return upcoming()
    .slice(0, count)
    .map((e) => e.id)
}

export function addExpense(input: Omit<Expense, 'id'>): string {
  const id = newId()
  update((data) => ({
    ...data,
    expenses: [...data.expenses, { id, ...input }],
  }))
  return id
}

export function deleteExpense(id: string): void {
  update((data) => ({
    ...data,
    expenses: data.expenses.filter((e) => e.id !== id),
  }))
}

/** Records a manual payment between two contacts, zeroing out (part of) a balance. */
export function addSettlement(input: Omit<Settlement, 'id'>): string {
  const id = newId()
  update((data) => ({
    ...data,
    settlements: [...data.settlements, { id, ...input }],
  }))
  return id
}

export function deleteSettlement(id: string): void {
  update((data) => ({
    ...data,
    settlements: data.settlements.filter((s) => s.id !== id),
  }))
}
