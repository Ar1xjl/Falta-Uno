import type { AppData, Event, EventTemplate } from '../types'
import { LEGACY_SPORT_MAP } from './sports'

const STORAGE_KEY = 'faltauno:data'

function emptyData(): AppData {
  return {
    version: 1,
    contacts: [],
    events: [],
    rounds: [],
    invitations: [],
    messageTemplates: [],
    eventTemplates: [],
    expenses: [],
    settlements: [],
    customSports: [],
  }
}

/**
 * Los deportes con cantidad de jugadores fija (Tenis Singles/Dobles, Fútbol 5/11) se
 * fusionaron en uno solo por deporte, con la cantidad movida a cada Event/EventTemplate.
 * Un evento o grupo guardado antes de este cambio no tiene `requiredPlayers` todavía —
 * se lo completamos acá una sola vez, a partir de qué deporte tenía, y de paso lo pasamos
 * al id nuevo. Corre en cada carga, pero solo toca los que de verdad les falta el campo.
 */
function migrateSportsAndRequiredPlayers(data: AppData): { data: AppData; changed: boolean } {
  let changed = false

  function migrateOne<T extends { sportId: string; requiredPlayers?: number }>(item: T): T {
    if (typeof item.requiredPlayers === 'number') return item
    changed = true
    const legacy = LEGACY_SPORT_MAP[item.sportId]
    return {
      ...item,
      sportId: legacy?.newId ?? item.sportId,
      requiredPlayers: legacy?.requiredPlayers ?? 4,
    }
  }

  const events = data.events.map((e) => migrateOne(e as unknown as Event & { requiredPlayers?: number })) as Event[]
  const eventTemplates = data.eventTemplates.map(
    (t) => migrateOne(t as unknown as EventTemplate & { requiredPlayers?: number }),
  ) as EventTemplate[]

  return { data: { ...data, events, eventTemplates }, changed }
}

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as AppData
    const merged = { ...emptyData(), ...parsed }
    const { data, changed } = migrateSportsAndRequiredPlayers(merged)
    if (changed) saveData(data)
    return data
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
