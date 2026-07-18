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

/** A one-off cost (balls, snacks, a single court rental) or a recurring membership/abono payment. */
export interface Expense {
  id: string
  description: string
  amount: number
  paidByContactId: string
  splitContactIds: string[] // equal split among these; add a second Expense for edge cases rather than prorating
  date: string // ISO date "YYYY-MM-DD"
  eventId?: string // one-off cost tied to a specific Event
  eventTemplateId?: string // recurring membership tied to a Template's core group
}

/** Records an actual manual payment between two contacts, to zero out a balance over time. */
export interface Settlement {
  id: string
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
