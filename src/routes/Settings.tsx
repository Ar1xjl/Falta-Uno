import { useState } from 'react'
import { useAppData } from '../data/store'
import { addMessageTemplate, deleteMessageTemplate, updateContact, updateMessageTemplate } from '../data/actions'
import type { MessageTemplate } from '../types'
import { DEFAULT_MESSAGE_TEMPLATE_TEXT } from '../lib/whatsapp'
import PageHeader from '../components/PageHeader'
import HowItWorks from '../components/HowItWorks'

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
    <div className="flex flex-col">
      <PageHeader title="Ajustes" />

      <div className="flex flex-col gap-6 p-4">
        <section className="card flex flex-col gap-2">
          <h2 className="card-title mb-0">Tu perfil</h2>
          <form onSubmit={handleSaveMe} className="flex flex-col gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button type="submit" className="btn btn-primary">
              Guardar
            </button>
          </form>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="card-title mb-0">Templates de mensaje</h2>
          <p className="hint">
            Si no elegís ninguno al invitar, se usa: “{DEFAULT_MESSAGE_TEMPLATE_TEXT}”
          </p>
          <MessageTemplateList templates={data.messageTemplates} />
        </section>

        <HowItWorks />
      </div>
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
        <button onClick={() => setAdding(true)} className="btn btn-ghost">
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
    <div className="card flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-semibold text-ink">{template.name}</p>
        <p className="hint">{template.text}</p>
      </div>
      <div className="flex shrink-0 gap-3 text-sm">
        <button onClick={() => setEditing(true)} className="text-brand font-semibold">
          Editar
        </button>
        <button
          onClick={() => {
            if (confirm(`¿Eliminar el template "${template.name}"?`)) deleteMessageTemplate(template.id)
          }}
          className="text-danger font-semibold"
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
    <form onSubmit={handleSubmit} className="card flex flex-col gap-2">
      <input placeholder="Nombre (ej. Casual, Urgente)" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea
        placeholder="Texto con {sport} {club} {court} {date} {time}"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
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
