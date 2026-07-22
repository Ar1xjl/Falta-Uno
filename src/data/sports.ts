import type { SportConfig } from '../types'

export const SPORTS: SportConfig[] = [
  { id: 'padel', name: 'Padel', defaultRequiredPlayers: 4, category: 'padel' },
  { id: 'tenis', name: 'Tenis', defaultRequiredPlayers: 4, category: 'tenis' },
  { id: 'futbol', name: 'Fútbol', defaultRequiredPlayers: 5, category: 'futbol' },
  { id: 'golf', name: 'Golf', defaultRequiredPlayers: 4, category: 'golf' },
]

/** Coarse sport tags for Contacts (independent of the specific event format). */
export const SPORT_TAGS: { id: string; label: string }[] = [
  { id: 'padel', label: 'Padel' },
  { id: 'tenis', label: 'Tenis' },
  { id: 'futbol', label: 'Futbol' },
  { id: 'golf', label: 'Golf' },
]

/**
 * IDs viejos que ya no existen como deportes separados (se fusionaron en uno solo con
 * cantidad de jugadores variable) — usado solo por la migración en storage.ts para no
 * perder datos de eventos/grupos creados antes de este cambio.
 */
export const LEGACY_SPORT_MAP: Record<string, { newId: string; requiredPlayers: number }> = {
  padel: { newId: 'padel', requiredPlayers: 4 },
  tennis_singles: { newId: 'tenis', requiredPlayers: 2 },
  tennis_doubles: { newId: 'tenis', requiredPlayers: 4 },
  football_5: { newId: 'futbol', requiredPlayers: 5 },
  football_11: { newId: 'futbol', requiredPlayers: 11 },
  golf: { newId: 'golf', requiredPlayers: 4 },
}

export function getAllSports(customSports: SportConfig[] = []): SportConfig[] {
  return [...SPORTS, ...customSports]
}

export function getAllSportTags(customSports: SportConfig[] = []): { id: string; label: string }[] {
  const customTags = customSports
    .filter((s) => !SPORT_TAGS.some((t) => t.id === s.category))
    .map((s) => ({ id: s.category, label: s.name }))
  return [...SPORT_TAGS, ...customTags]
}

/**
 * Nunca revienta con un id desconocido — puede pasar con un deporte personalizado de otro
 * dispositivo (los deportes custom no viajan por el link de invitación, solo son locales).
 * En ese caso devuelve un fallback mostrable en vez de tirar un error.
 */
export function getSportConfig(sportId: string, customSports: SportConfig[] = []): SportConfig {
  const sport = getAllSports(customSports).find((s) => s.id === sportId)
  if (sport) return sport
  return { id: sportId, name: sportId, defaultRequiredPlayers: 4, category: 'otros' }
}
