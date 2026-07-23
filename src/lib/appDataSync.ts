// Sincroniza el AppData local completo contra Supabase, una fila por identidad (user_app_data).
// "Último que escribe gana" a nivel de todo el documento — sin merge campo por campo, decisión
// explícita para no tener que resolver conflictos concurrentes reales (ver planned-device-key-auth).
// Push: cada cambio local, si hay sesión activa (ver wireAppDataSync en data/store.ts).
// Pull: una vez al abrir la app, y al terminar de vincular un dispositivo nuevo.

import { useEffect, useRef } from 'react'
import { supabase, supabaseEnabled } from './supabase'
import { replaceData } from '../data/store'
import { signInWithDeviceKey } from './pubkeyAuth'
import type { AppData } from '../types'

const PUSH_DEBOUNCE_MS = 2000

export async function pushAppData(data: AppData): Promise<void> {
  if (!supabase) return
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return

  const { error } = await supabase
    .from('user_app_data')
    .upsert({ user_id: userData.user.id, data, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function pullAppData(): Promise<AppData | null> {
  if (!supabase) return null
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data: row, error } = await supabase
    .from('user_app_data')
    .select('data')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (error) throw error
  return (row?.data as AppData | undefined) ?? null
}

/**
 * Wires the whole-app sync lifecycle from a single top-level component (App.tsx):
 * - Once on mount: signs in silently with the device key if there's no session yet, then
 *   pulls this identity's remote copy and replaces local data with it (skipped entirely
 *   while `?link=<code>` is present — that flow does its own sign-in + pull after linking).
 * - On every local data change: pushes to Supabase after a short debounce, also flushed
 *   immediately if the tab is hidden/closed so a change right before backgrounding isn't lost.
 * No-ops everywhere if Supabase isn't configured.
 */
export function useAppDataSync(data: AppData, skipInitialSync: boolean): void {
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!supabaseEnabled || !supabase || skipInitialSync) return
    let cancelled = false

    async function run() {
      const { data: userData } = await supabase!.auth.getUser()
      if (!userData.user) await signInWithDeviceKey().catch(() => {})
      const remote = await pullAppData().catch(() => null)
      if (!cancelled && remote) replaceData(remote)
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipInitialSync])

  useEffect(() => {
    if (!supabaseEnabled) return

    function flush() {
      pushAppData(dataRef.current).catch(() => {})
    }

    const timer = setTimeout(flush, PUSH_DEBOUNCE_MS)
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [data])
}
