import type { AppData } from '../types'

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
  }
}

export function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyData()
  try {
    const parsed = JSON.parse(raw) as AppData
    return { ...emptyData(), ...parsed }
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
