export interface SportConfig {
  id: string
  name: string
  requiredPlayers: number
}

export interface Contact {
  id: string
  name: string
  phone: string // E.164, e.g. "+5491122334455"
  note?: string
  isMe: boolean
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

export interface AppData {
  version: 1
  contacts: Contact[]
  events: Event[]
  rounds: Round[]
  invitations: Invitation[]
  messageTemplates: MessageTemplate[]
  eventTemplates: EventTemplate[]
}
