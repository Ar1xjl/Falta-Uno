// Deploy: supabase functions deploy pubkey-auth
// (o pegar este archivo en Dashboard -> Edge Functions -> pubkey-auth -> editor, si no tenés la CLI)
//
// GET  -> emite un nonce de un solo uso, de vida corta.
// POST { publicKeyJwk, signature, nonce, linkCode? } -> verifica que `signature` sea una firma
// ECDSA válida de `nonce` hecha con la clave privada correspondiente a `publicKeyJwk`. Si es así:
//   - si esa pubkey ya está mapeada a un usuario, inicia sesión como ese usuario de siempre.
//   - si no, y viene un `linkCode` válido (ver device_link_codes.sql), ata esta pubkey nueva
//     al mismo user_id que generó el código, en vez de crear un usuario — así un dispositivo
//     nuevo se suma a una identidad existente ("vincular dispositivo", estilo WhatsApp Web).
//   - si no hay linkCode (o es inválido), crea un auth.users nuevo (primer login de siempre).
// En los tres casos devuelve un token_hash que el cliente canjea con
// supabase.auth.verifyOtp({ token_hash, type: 'email' }) para obtener una sesión real. No se
// envía ningún email de verdad: generateLink solo emite el token, nunca dispara el proveedor.

import { createClient } from 'npm:@supabase/supabase-js@2'

const NONCE_TTL_MS = 2 * 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function canonicalPubkey(jwk: JsonWebKey): string {
  return `${jwk.kty}:${jwk.crv}:${jwk.x}:${jwk.y}`
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const db = admin()

  if (req.method === 'GET') {
    const nonce = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString()
    const { error } = await db.from('auth_nonces').insert({ nonce, expires_at: expiresAt })
    if (error) return json({ error: error.message }, 500)
    return json({ nonce })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null)
    const publicKeyJwk = body?.publicKeyJwk as JsonWebKey | undefined
    const signature = body?.signature as string | undefined
    const nonce = body?.nonce as string | undefined
    const linkCode = body?.linkCode as string | undefined
    if (!publicKeyJwk || !signature || !nonce) return json({ error: 'Faltan campos.' }, 400)

    const { data: nonceRow, error: nonceError } = await db
      .from('auth_nonces')
      .select('expires_at')
      .eq('nonce', nonce)
      .maybeSingle()
    if (nonceError) return json({ error: nonceError.message }, 500)
    if (!nonceRow) return json({ error: 'Nonce inválido o ya usado.' }, 401)
    await db.from('auth_nonces').delete().eq('nonce', nonce)
    if (new Date(nonceRow.expires_at).getTime() < Date.now()) {
      return json({ error: 'Nonce expirado.' }, 401)
    }

    let cryptoKey: CryptoKey
    try {
      cryptoKey = await crypto.subtle.importKey(
        'jwk',
        publicKeyJwk,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify'],
      )
    } catch {
      return json({ error: 'Clave pública inválida.' }, 400)
    }

    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      base64ToArrayBuffer(signature),
      new TextEncoder().encode(nonce),
    )
    if (!valid) return json({ error: 'Firma inválida.' }, 401)

    const pubkeyHash = await sha256Hex(canonicalPubkey(publicKeyJwk))

    const { data: mapping, error: mappingError } = await db
      .from('user_pubkeys')
      .select('user_id')
      .eq('pubkey_hash', pubkeyHash)
      .maybeSingle()
    if (mappingError) return json({ error: mappingError.message }, 500)

    let emailForSession: string

    if (mapping) {
      // Pubkey ya conocida (dispositivo que ya había iniciado sesión antes) — mismo usuario de siempre.
      const { data: existing, error: getError } = await db.auth.admin.getUserById(mapping.user_id)
      if (getError || !existing.user?.email) {
        return json({ error: getError?.message ?? 'No se encontró el usuario.' }, 500)
      }
      emailForSession = existing.user.email
    } else if (linkCode) {
      // Pubkey nueva + código de vinculación: se ata a la identidad que generó el código,
      // en vez de crear un usuario nuevo (ver device_link_codes.sql).
      const { data: codeRow, error: codeError } = await db
        .from('device_link_codes')
        .select('user_id, expires_at, used_at')
        .eq('code', linkCode)
        .maybeSingle()
      if (codeError) return json({ error: codeError.message }, 500)
      if (!codeRow) return json({ error: 'Código de vinculación inválido.' }, 401)
      if (codeRow.used_at) return json({ error: 'Ese código ya fue usado.' }, 401)
      if (new Date(codeRow.expires_at).getTime() < Date.now()) {
        return json({ error: 'El código expiró — generá uno nuevo desde el otro dispositivo.' }, 401)
      }

      await db.from('device_link_codes').update({ used_at: new Date().toISOString() }).eq('code', linkCode)

      const { error: insertError } = await db
        .from('user_pubkeys')
        .insert({ pubkey_hash: pubkeyHash, user_id: codeRow.user_id })
      if (insertError) return json({ error: insertError.message }, 500)

      const { data: existing, error: getError } = await db.auth.admin.getUserById(codeRow.user_id)
      if (getError || !existing.user?.email) {
        return json({ error: getError?.message ?? 'No se encontró el usuario a vincular.' }, 500)
      }
      emailForSession = existing.user.email
    } else {
      // Pubkey nunca vista, sin código de vinculación: primer login de siempre, usuario nuevo.
      const syntheticEmail = `p-${pubkeyHash}@device.falta-uno.local`
      const { data: created, error: createError } = await db.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
        user_metadata: { pubkey_hash: pubkeyHash },
      })
      if (createError || !created.user) return json({ error: createError?.message ?? 'No se pudo crear el usuario.' }, 500)

      const { error: insertError } = await db
        .from('user_pubkeys')
        .insert({ pubkey_hash: pubkeyHash, user_id: created.user.id })
      if (insertError) return json({ error: insertError.message }, 500)

      emailForSession = syntheticEmail
    }

    const { data: link, error: linkError } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email: emailForSession,
    })
    if (linkError || !link) return json({ error: linkError?.message ?? 'No se pudo emitir la sesión.' }, 500)

    return json({ tokenHash: link.properties.hashed_token })
  }

  return json({ error: 'Método no soportado.' }, 405)
})
