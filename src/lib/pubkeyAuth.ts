// Login sin Twilio ni SMTP: el dispositivo prueba su identidad firmando un desafío con su
// propia clave (ver deviceKey.ts) contra la Edge Function pubkey-auth, que devuelve un
// token_hash canjeable por una sesión real de Supabase. Cero terceros de por medio.

import { supabase } from './supabase'
import { exportPublicKeyJwk, getOrCreateDeviceKeyPair, signChallenge } from './deviceKey'

function functionsUrl(path: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string
  return `${base.replace(/\/$/, '')}/functions/v1/${path}`
}

// React StrictMode (y cualquier doble click) puede disparar dos intentos de login en paralelo
// desde la misma pestaña; como los dos usan el mismo par de claves, el segundo choca contra el
// usuario que acaba de crear el primero. Un solo vuelo en curso evita esa carrera.
let inFlight: Promise<void> | null = null

/**
 * `linkCode` (opcional) viene de vincular un dispositivo nuevo a una identidad ya autenticada
 * en otro dispositivo (ver deviceLink.ts) — si esta pubkey todavía no existe en el servidor,
 * se ata a esa identidad en vez de crear un usuario nuevo.
 */
export function signInWithDeviceKey(linkCode?: string): Promise<void> {
  if (!inFlight) {
    inFlight = doSignIn(linkCode).finally(() => {
      inFlight = null
    })
  }
  return inFlight
}

async function doSignIn(linkCode?: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado (faltan las env vars).')
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const { privateKey, publicKey } = await getOrCreateDeviceKeyPair()
  const publicKeyJwk = await exportPublicKeyJwk(publicKey)

  const nonceRes = await fetch(functionsUrl('pubkey-auth'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
  })
  if (!nonceRes.ok) throw new Error(`No se pudo pedir el nonce (${nonceRes.status}).`)
  const { nonce } = (await nonceRes.json()) as { nonce: string }

  const signature = await signChallenge(privateKey, nonce)

  const verifyRes = await fetch(functionsUrl('pubkey-auth'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKeyJwk, signature, nonce, linkCode }),
  })
  const verifyBody = await verifyRes.json()
  if (!verifyRes.ok) throw new Error(verifyBody.error ?? `Falló la verificación (${verifyRes.status}).`)

  const { error } = await supabase.auth.verifyOtp({ token_hash: verifyBody.tokenHash, type: 'email' })
  if (error) throw error
}
