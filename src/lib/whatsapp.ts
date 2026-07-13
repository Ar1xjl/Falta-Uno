import type { Event } from '../types'
import { getSportConfig } from '../data/sports'

export const DEFAULT_MESSAGE_TEMPLATE_TEXT =
  'Hola! ¿Te copás a jugar {sport} el {date} {time}hs en {club}?'

export function fillMessageTemplate(text: string, event: Event): string {
  const sport = getSportConfig(event.sportId)
  return text
    .replaceAll('{sport}', sport.name)
    .replaceAll('{club}', event.club)
    .replaceAll('{court}', event.court ?? '')
    .replaceAll('{date}', event.date)
    .replaceAll('{time}', event.time)
}

export function buildWaMeLink(phone: string, message: string): string {
  const digitsOnly = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}
