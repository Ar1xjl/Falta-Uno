export interface ParsedContact {
  name: string
  phone: string
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
