// Identidad del dispositivo: un par de claves ECDSA P-256 generado localmente,
// cuya clave privada nunca es extraíble (queda en IndexedDB como CryptoKey, WebCrypto
// no permite leer su bit material ni siquiera vía XSS). Se usa para probar "soy el mismo
// dispositivo" firmando un desafío del servidor, sin depender de SMS/email/WhatsApp.

const DB_NAME = 'falta-uno-device-key'
const STORE = 'keys'
const RECORD_ID = 'device'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGet(db: IDBDatabase, key: string): Promise<CryptoKeyPair | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(db: IDBDatabase, key: string, value: CryptoKeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' }

export async function getOrCreateDeviceKeyPair(): Promise<CryptoKeyPair> {
  const db = await openDb()
  try {
    const existing = await idbGet(db, RECORD_ID)
    if (existing) return existing

    const pair = await crypto.subtle.generateKey(ALGORITHM, false, ['sign', 'verify'])
    await idbSet(db, RECORD_ID, pair)
    return pair
  } finally {
    db.close()
  }
}

export async function exportPublicKeyJwk(publicKey: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', publicKey)
}

export async function signChallenge(privateKey: CryptoKey, challenge: string): Promise<string> {
  const data = new TextEncoder().encode(challenge)
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, data)
  return arrayBufferToBase64(signature)
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
