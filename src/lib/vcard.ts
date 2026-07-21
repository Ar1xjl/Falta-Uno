export interface ParsedContact {
  name: string
  phone: string
}

export interface ExportableContact {
  name: string
  phone: string
  note?: string
}

function escapeVCardText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

/** Builds a single .vcf file with one VCARD entry per contact — the same universal format the app already imports. */
export function buildVCard(contacts: ExportableContact[]): string {
  return contacts
    .map((c) => {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCardText(c.name)}`, `TEL:${c.phone}`]
      if (c.note) lines.push(`NOTE:${escapeVCardText(c.note)}`)
      lines.push('END:VCARD')
      return lines.join('\r\n')
    })
    .join('\r\n')
}

type ShareResult = 'shared' | 'downloaded' | 'cancelled'

/** Step-by-step instructions for whoever receives the exported .vcf, so they know what to do with it even if they've never used the app. */
export function buildExportMessage(): string {
  const url = window.location.origin
  return [
    'Te paso mis contactos de FaltaUno!! 📋',
    '',
    '1. Descargá el archivo adjunto (contactos-faltauno.vcf).',
    `2. Entrá a ${url} (o abrí la app si ya la tenés instalada).`,
    '3. Andá a Contactos → tocá "Importar" → "Elegir archivo", y seleccioná el que descargaste.',
  ].join('\n')
}

/**
 * Shares the .vcf via the native OS share sheet (WhatsApp included) when the Web Share API supports
 * file sharing — Android Chrome and iOS Safari 15+. Falls back to a plain download everywhere else,
 * copying the accompanying instructions to the clipboard so they can be pasted alongside the file.
 *
 * The shared file is deliberately typed as `text/plain`, not `text/vcard`/`text/x-vcard`: WhatsApp (and
 * Android's share sheet in general) special-cases the vCard MIME type by unpacking a multi-contact .vcf
 * into separate "Contact" bubbles instead of sending it as one attachment — exactly the multi-contact
 * case this export is built for. A generic text type sidesteps that and arrives as a single file, which
 * is also what a manual download + "attach as document" in WhatsApp already does reliably.
 */
export async function shareOrDownloadVCard(contacts: ExportableContact[], filename: string): Promise<ShareResult> {
  const vcf = buildVCard(contacts)
  const file = new File([vcf], filename, { type: 'text/plain' })
  const message = buildExportMessage()

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean
    share?: (data: ShareData) => Promise<void>
  }

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Contactos FaltaUno', text: message })
      return 'shared'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled'
      // Real failure (not a user cancel) — fall through to the download fallback below.
    }
  }

  const blob = new Blob([vcf], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  try {
    await navigator.clipboard.writeText(message)
  } catch {
    // Clipboard access denied/unavailable — the user can still type the instructions themselves.
  }

  return 'downloaded'
}

/** Parses one or more vCard (.vcf) contacts — the standard export format from iOS/Android/Google Contacts. */
export function parseVCard(text: string): ParsedContact[] {
  const unfolded = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
  const lines = unfolded.split('\n')

  const contacts: ParsedContact[] = []
  let current: { fn?: string; tel?: string } | null = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const upper = line.toUpperCase()

    if (upper === 'BEGIN:VCARD') {
      current = {}
      continue
    }
    if (upper === 'END:VCARD') {
      if (current?.fn && current?.tel) contacts.push({ name: current.fn, phone: current.tel })
      current = null
      continue
    }
    if (!current) continue

    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).toUpperCase()
    const value = line.slice(colonIndex + 1).trim()

    if (key === 'FN' && !current.fn) {
      current.fn = value
    } else if (key === 'N' && !current.fn) {
      const parts = value.split(';')
      const assembled = [parts[1], parts[0]].filter(Boolean).join(' ').trim()
      if (assembled) current.fn = assembled
    } else if (key.startsWith('TEL') && !current.tel) {
      current.tel = value
    }
  }

  return contacts
}
