import { useSyncExternalStore } from 'react'
import { loadData, saveData } from './storage'
import type { AppData } from '../types'

let data: AppData = loadData()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/** Internal: apply a mutation, persist, and notify subscribers. Only actions.ts should call this. */
export function update(mutator: (data: AppData) => AppData): void {
  data = mutator(data)
  saveData(data)
  notify()
}

/** Overwrites the entire local dataset (e.g. after pulling from Supabase on a linked device) — same effect as `update`, but replaces wholesale instead of mutating. */
export function replaceData(newData: AppData): void {
  data = newData
  saveData(data)
  notify()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): AppData {
  return data
}

/** React hook: re-renders the component whenever any part of the app data changes. */
export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** Non-reactive read, for use outside components (e.g. inside actions). */
export function getData(): AppData {
  return data
}
