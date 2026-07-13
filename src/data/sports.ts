import type { SportConfig } from '../types'

export const SPORTS: SportConfig[] = [
  { id: 'padel', name: 'Padel', requiredPlayers: 4 },
  { id: 'tennis_singles', name: 'Tenis Singles', requiredPlayers: 2 },
  { id: 'tennis_doubles', name: 'Tenis Dobles', requiredPlayers: 4 },
  { id: 'football_5', name: 'Fútbol 5', requiredPlayers: 5 },
  { id: 'football_11', name: 'Fútbol 11', requiredPlayers: 11 },
]

export function getSportConfig(sportId: string): SportConfig {
  const sport = SPORTS.find((s) => s.id === sportId)
  if (!sport) throw new Error(`Unknown sportId: ${sportId}`)
  return sport
}
