import { useState } from 'react'
import { useAppData } from '../data/store'
import { addContact, deleteContact, updateContact } from '../data/actions'
import { isContactPickerSupported, pickDeviceContacts } from '../lib/contactPicker'
import type { Contact } from '../types'
import PageHeader from '../components/PageHeader'

export default function Contacts() {
  const data = useAppData()
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const others = data.contacts.filter((c) => !c.isMe)

  async function handleImport() {
    setImporting(true)
    setImportMessage('')
    try {
      const picked = await pickDeviceContacts()
      const existingPhones = new Set(data.contacts.map((c) => c.phone))
      let added = 0
      for (const c of picked) {
        if (!existingPhones.has(c.phone)) {
          addContact(c.name, c.phone)
          existingPhones.add(c.phone)
          added++
        }
      }
      setImportMessage(added === 0 ? 'No se agregó ningún contacto nuevo.' : `Se importaron ${added} contacto${added === 1 ? '' : 's'}.`)
    } catch {
      // Cancelled the picker or permission denied — nothing to do.
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Contactos"
        trailing={
          <div className="flex gap-2">
            {isContactPickerSupported() && (
              <button onClick={handleImport} disabled={importing} className="btn btn-ghost">
                {importing ? 'Importando…' : 'Importar'}
              </button>
            )}
            <button onClick={() => setAdding(true)} className="btn btn-primary">
              + Agregar
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 p-4">
        {importMessage && <p className="hint">{importMessage}</p>}

        {adding && <ContactForm onDone={() => setAdding(false)} />}

        {others.length === 0 && !adding ? (
          <p className="empty-state">Todavía no cargaste contactos.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {others.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ContactForm({
  onDone,
  contact,
}: {
  onDone: () => void
  contact?: Contact
}) {
  const [name, setName] = useState(contact?.name ?? '')
  const [phone, setPhone] = useState(contact?.phone ?? '')
  const [note, setNote] = useState(contact?.note ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    if (contact) {
      updateContact(contact.id, { name: name.trim(), phone: phone.trim(), note: note.trim() || undefined })
    } else {
      addContact(name.trim(), phone.trim(), note.trim() || undefined)
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-2">
      <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input placeholder="Teléfono (+549...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">
          Guardar
        </button>
        <button type="button" onClick={onDone} className="btn btn-ghost flex-1">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function ContactRow({ contact }: { contact: Contact }) {
  const [editing, setEditing] = useState(false)

  if (editing) return <ContactForm contact={contact} onDone={() => setEditing(false)} />

  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="font-semibold text-ink">{contact.name}</p>
        <p className="text-muted text-sm">{contact.phone}</p>
        {contact.note && <p className="hint">{contact.note}</p>}
      </div>
      <div className="flex gap-3 text-sm">
        <button onClick={() => setEditing(true)} className="text-brand font-semibold">
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm(`¿Eliminar a ${contact.name}?`)) deleteContact(contact.id)
          }}
          className="text-danger font-semibold"
        >
          Borrar
        </button>
      </div>
    </div>
  )
}
