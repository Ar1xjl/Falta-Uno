export interface SportConfig {
  id: string
  name: string
  requiredPlayers: number
  category: string // coarse tag used to match against Contact.sports, e.g. "tenis" covers both Tenis Singles and Dobles
}

export interface Contact {
  id: string
  name: string
  phone: string // E.164, e.g. "+5491122334455"
  note?: string
  isMe: boolean
  sports?: string[] // sport tag ids the contact plays, e.g. ["padel", "golf"]
  paymentAlias?: string // MP alias, CVU, or CBU — free text, only ever displayed/copied, never parsed
}

export type EventStatus = 'upcoming' | 'completed' | 'cancelled'

export interface Event {
  id: string
  sportId: string
  club: string
  court?: string
  date: string // ISO date "YYYY-MM-DD"
  time: string // "HH:mm"
  confirmedContactIds: string[]
  status: EventStatus
  templateId?: string
  sharedId?: string // id del event_shares en Supabase, si este evento se compartió por link
}

export type RoundStatus = 'pending' | 'active' | 'completed' | 'skipped'

export interface Round {
  id: string
  eventId: string
  order: number
  contactIds: string[]
  status: RoundStatus
  messageTemplateId?: string
}

export type InvitationStatus =
  | 'not_invited'
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'expired'

export interface Invitation {
  id: string
  roundId: string
  contactId: string
  status: InvitationStatus
  invitedAt?: string
  respondedAt?: string
}

export interface MessageTemplate {
  id: string
  name: string
  text: string // placeholders: {sport} {club} {court} {date} {time}
}

export interface EventTemplateRound {
  order: number
  contactIds: string[]
  messageTemplateId?: string
}

export interface EventTemplateRecurrence {
  weekday: number // 0 (domingo) - 6 (sábado)
  time: string // "HH:mm"
}

export interface EventTemplate {
  id: string
  name: string
  sportId: string
  club: string
  court?: string
  defaultConfirmedContactIds: string[]
  defaultRounds: EventTemplateRound[]
  recurrence?: EventTemplateRecurrence
}

/**
 * A cost, in one of two modes:
 * - Single-event: `eventId` set, split equally among `splitContactIds` (picked explicitly, usually
 *   defaulted to that event's confirmed roster).
 * - Multi-event abono: `eventTemplateId` + `coveredEventIds` set (no `splitContactIds`). The amount
 *   is divided evenly across the covered events, and each event's slice is split among *that event's*
 *   actual `confirmedContactIds` at balance-calculation time — so a mid-series substitute only ever
 *   owes for the events they actually played, and credit accrues to the payer event by event.
 */
export interface Expense {
  id: string
  description: string
  amount: number
  paidByContactId: string
  date: string // ISO date "YYYY-MM-DD"
  eventId?: string
  splitContactIds?: string[] // required when eventId is set (or neither eventId/eventTemplateId — a standalone expense)
  eventTemplateId?: string
  coveredEventIds?: string[] // required when eventTemplateId is set — the N event occurrences this abono pays for
}

/**
 * Records an actual manual payment between two contacts, to zero out a balance over time.
 * `groupKey` scopes it to one balance pool (see `getExpenseGroupKey`) — settling Padel-lunes debts
 * never touches Padel-viernes balances, even between the same two people.
 */
export interface Settlement {
  id: string
  groupKey: string
  fromContactId: string
  toContactId: string
  amount: number
  date: string // ISO date "YYYY-MM-DD"
}

export interface AppData {
  version: 1
  contacts: Contact[]
  events: Event[]
  rounds: Round[]
  invitations: Invitation[]
  messageTemplates: MessageTemplate[]
  eventTemplates: EventTemplate[]
  expenses: Expense[]
  settlements: Settlement[]
}
