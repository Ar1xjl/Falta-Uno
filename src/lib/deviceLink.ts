// Vincular un dispositivo nuevo a la identidad ya autenticada de este ("estilo WhatsApp Web"):
// este dispositivo genera un código corto de un solo uso (ver device_link_codes.sql); el
// dispositivo nuevo lo consume al iniciar sesión (signInWithDeviceKey(linkCode), en pubkeyAuth.ts).

import { supabase } from './supabase'
import { signInWithDeviceKey } from './pubkeyAuth'

export async function createDeviceLinkCode(): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado (faltan las env vars).')
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) await signInWithDeviceKey()

  const { data, error } = await supabase.rpc('create_device_link_code')
  if (error) throw error
  return data as string
}

export function buildDeviceLinkUrl(code: string): string {
  return `${window.location.origin}/?link=${code}`
}
