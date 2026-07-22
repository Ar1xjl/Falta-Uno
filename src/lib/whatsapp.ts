import type { Event } from '../types'

export const DEFAULT_MESSAGE_TEMPLATE_TEXT =
  'Hola {name}! ¿Te copás a jugar {sport} el {date} {time}hs en {club}?'

export function fillMessageTemplate(text: string, event: Event, sportName: string, contactName?: string): string {
  return text
    .replaceAll('{name}', contactName ?? '')
    .replaceAll('{sport}', sportName)
    .replaceAll('{club}', event.club)
    .replaceAll('{court}', event.court ?? '')
    .replaceAll('{date}', event.date)
    .replaceAll('{time}', event.time)
}

export function buildWaMeLink(phone: string, message: string): string {
  const digitsOnly = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`
}

/** Sin número — abre el selector de contacto/chat de WhatsApp en vez de apuntar a uno fijo. */
export function buildWaMeShareLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
