import { useState } from 'react'
import { useAppData } from '../data/store'
import { addMessageTemplate, deleteMessageTemplate, updateContact, updateMessageTemplate } from '../data/actions'
import type { MessageTemplate } from '../types'
import { DEFAULT_MESSAGE_TEMPLATE_TEXT } from '../lib/whatsapp'

export default function Settings() {
  const data = useAppData()
  const me = data.contacts.find((c) => c.isMe)
  const [name, setName] = useState(me?.name ?? '')
  const [phone, setPhone] = useState(me?.phone ?? '')

  if (!me) return null

  function handleSaveMe(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    updateContact(me!.id, { name: name.trim(), phone: phone.trim() })
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Ajustes</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tu perfil</h2>
        <form onSubmit={handleSaveMe} className="flex flex-col gap-2">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white active:bg-emerald-700"
          >
            Guardar
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Templates de mensaje</h2>
        <p className="text-xs text-gray-400">
          Si no elegís ninguno al invitar, se usa: “{DEFAULT_MESSAGE_TEMPLATE_TEXT}”
        </p>
        <MessageTemplateList templates={data.messageTemplates} />
      </section>
    </div>
  )
}

function MessageTemplateList({ templates }: { templates: MessageTemplate[] }) {
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {templates.map((t) => (
        <MessageTemplateRow key={t.id} template={t} />
      ))}

      {adding ? (
        <MessageTemplateForm onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
        >
          + Nuevo template de mensaje
        </button>
      )}
    </div>
  )
}

function MessageTemplateRow({ template }: { template: MessageTemplate }) {
  const [editing, setEditing] = useState(false)
  if (editing) return <MessageTemplateForm template={template} onDone={() => setEditing(false)} />

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{template.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{template.text}</p>
      </div>
      <div className="flex shrink-0 gap-3 text-sm">
        <button onClick={() => setEditing(true)} className="text-emerald-600 dark:text-emerald-400">
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm(`¿Eliminar el template "${template.name}"?`)) deleteMessageTemplate(template.id)
          }}
          className="text-red-600 dark:text-red-400"
        >
          Borrar
        </button>
      </div>
    </div>
  )
}

function MessageTemplateForm({ template, onDone }: { template?: MessageTemplate; onDone: () => void }) {
  const [name, setName] = useState(template?.name ?? '')
  const [text, setText] = useState(template?.text ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !text.trim()) return
    if (template) {
      updateMessageTemplate(template.id, { name: name.trim(), text: text.trim() })
    } else {
      addMessageTemplate(name.trim(), text.trim())
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <input
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Nombre (ej. Casual, Urgente)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Texto con {sport} {club} {court} {date} {time}"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
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
