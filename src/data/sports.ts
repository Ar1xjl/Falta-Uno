import type { SportConfig } from '../types'

export const SPORTS: SportConfig[] = [
  { id: 'padel', name: 'Padel', requiredPlayers: 4, category: 'padel' },
  { id: 'tennis_singles', name: 'Tenis Singles', requiredPlayers: 2, category: 'tenis' },
  { id: 'tennis_doubles', name: 'Tenis Dobles', requiredPlayers: 4, category: 'tenis' },
  { id: 'football_5', name: 'Fútbol 5', requiredPlayers: 5, category: 'futbol' },
  { id: 'football_11', name: 'Fútbol 11', requiredPlayers: 11, category: 'futbol' },
  { id: 'golf', name: 'Golf', requiredPlayers: 4, category: 'golf' },
]

/** Coarse sport tags for Contacts (independent of the specific event format, e.g. Tenis Singles vs Dobles). */
export const SPORT_TAGS: { id: string; label: string }[] = [
  { id: 'padel', label: 'Padel' },
  { id: 'tenis', label: 'Tenis' },
  { id: 'futbol', label: 'Futbol' },
  { id: 'golf', label: 'Golf' },
]

export function getSportConfig(sportId: string): SportConfig {
  const sport = SPORTS.find((s) => s.id === sportId)
  if (!sport) throw new Error(`Unknown sportId: ${sportId}`)
  return sport
}
