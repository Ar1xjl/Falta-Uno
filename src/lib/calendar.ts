import type { Event, SportConfig } from '../types'

const DEFAULT_DURATION_MINUTES: Record<string, number> = {
  padel: 90,
  tenis: 90,
  futbol: 90,
  golf: 240,
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toICSDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`
}

function toICSDateTimeUTC(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

function escapeICSText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Builds a .ics file with an embedded 1h-before reminder — relies on the OS calendar app's own notifications, not web push. */
export function buildICS(event: Event, sport: SportConfig): string {
  const start = new Date(`${event.date}T${event.time}:00`)
  const durationMinutes = DEFAULT_DURATION_MINUTES[sport.category] ?? 90
  const end = new Date(start.getTime() + durationMinutes * 60000)

  const summary = escapeICSText(`${sport.name} - ${event.club}`)
  const location = escapeICSText(event.court ? `${event.club} (Cancha ${event.court})` : event.club)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FaltaUno!!//ES',
    'BEGIN:VEVENT',
    `UID:${event.id}@faltauno`,
    `DTSTAMP:${toICSDateTimeUTC(new Date())}`,
    `DTSTART:${toICSDateTimeLocal(start)}`,
    `DTEND:${toICSDateTimeLocal(end)}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    'DESCRIPTION:Organizado con FaltaUno!!',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Recordatorio de partido',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

export function downloadICS(event: Event, sport: SportConfig): void {
  const ics = buildICS(event, sport)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${event.club.replace(/[^a-z0-9]/gi, '_') || 'evento'}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function buildMapsLink(club: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(club)}`
}
