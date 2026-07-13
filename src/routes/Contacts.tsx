import { useState } from 'react'
import { useAppData } from '../data/store'
import { addContact, deleteContact, updateContact } from '../data/actions'
import type { Contact } from '../types'

export default function Contacts() {
  const data = useAppData()
  const [adding, setAdding] = useState(false)
  const others = data.contacts.filter((c) => !c.isMe)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Contactos</h1>
        <button
          onClick={() => setAdding(true)}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
        >
          + Agregar
        </button>
      </div>

      {adding && <ContactForm onDone={() => setAdding(false)} />}

      {others.length === 0 && !adding ? (
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Todavía no cargaste contactos.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {others.map((contact) => (
            <ContactRow key={contact.id} contact={contact} />
          ))}
        </div>
      )}
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
    >
      <input
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
      <input
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Teléfono (+549...)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Nota (opcional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white active:bg-emerald-700"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
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
    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div>
        <p className="font-medium text-gray-900 dark:text-gray-100">{contact.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{contact.phone}</p>
        {contact.note && <p className="text-xs text-gray-400 dark:text-gray-500">{contact.note}</p>}
      </div>
      <div className="flex gap-3 text-sm">
        <button onClick={() => setEditing(true)} className="text-emerald-600 dark:text-emerald-400">
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm(`¿Eliminar a ${contact.name}?`)) deleteContact(contact.id)
          }}
          className="text-red-600 dark:text-red-400"
        >
          Borrar
        </button>
      </div>
    </div>
  )
}
