type ContactProperty = 'name' | 'email' | 'tel' | 'address' | 'icon'

interface ContactsManager {
  select(properties: ContactProperty[], options?: { multiple?: boolean }): Promise<
    Array<{ name?: string[]; tel?: string[] }>
  >
}

function getContactsManager(): ContactsManager | undefined {
  return (navigator as unknown as { contacts?: ContactsManager }).contacts
}

/** The Contact Picker API only ships in Chromium browsers on Android — no iOS Safari/Chrome, no desktop. */
export function isContactPickerSupported(): boolean {
  return typeof getContactsManager()?.select === 'function'
}

export async function pickDeviceContacts(): Promise<Array<{ name: string; phone: string }>> {
  const manager = getContactsManager()
  if (!manager) return []
  const results = await manager.select(['name', 'tel'], { multiple: true })
  return results
    .map((r) => ({ name: r.name?.[0]?.trim() ?? '', phone: r.tel?.[0]?.trim() ?? '' }))
    .filter((c) => c.name && c.phone)
}
