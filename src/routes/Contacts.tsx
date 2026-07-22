import { useRef, useState } from 'react'
import { useAppData } from '../data/store'
import { addContact, deleteContact, updateContact } from '../data/actions'
import { isContactPickerSupported, pickDeviceContacts } from '../lib/contactPicker'
import { parseVCard, shareOrDownloadVCard } from '../lib/vcard'
import { SPORT_TAGS } from '../data/sports'
import type { Contact } from '../types'
import PageHeader from '../components/PageHeader'

export default function Contacts() {
  const data = useAppData()
  const [adding, setAdding] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [toolsTab, setToolsTab] = useState<'importar' | 'exportar'>('importar')
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const others = data.contacts.filter((c) => !c.isMe).sort((a, b) => a.name.localeCompare(b.name))
  const me = data.contacts.find((c) => c.isMe)

  function addImported(picked: Array<{ name: string; phone: string }>) {
    const existingPhones = new Set(data.contacts.map((c) => c.phone))
    let added = 0
    for (const c of picked) {
      if (c.name && c.phone && !existingPhones.has(c.phone)) {
        addContact(c.name, c.phone)
        existingPhones.add(c.phone)
        added++
      }
    }
    setImportMessage(added === 0 ? 'No se agregó ningún contacto nuevo.' : `Se importaron ${added} contacto${added === 1 ? '' : 's'}.`)
  }

  async function handlePickerImport() {
    setImporting(true)
    setImportMessage('')
    try {
      addImported(await pickDeviceContacts())
    } catch {
      // Cancelled the picker or permission denied — nothing to do.
    } finally {
      setImporting(false)
    }
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setImportMessage('')
    const texts = await Promise.all(files.map((f) => f.text()))
    addImported(texts.flatMap(parseVCard))
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Contactos"
        trailing={
          <div className="flex gap-2">
            <button onClick={() => setToolsOpen((o) => !o)} className={`btn btn-ghost ${toolsOpen ? 'active' : ''}`}>
              Importar
            </button>
            <button onClick={() => setAdding(true)} className="btn btn-primary">
              + Agregar
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 p-4">
        {toolsOpen && (
          <div className="card flex flex-col gap-3">
            <div className="pill-group">
              <button onClick={() => setToolsTab('importar')} className={`pill-btn ${toolsTab === 'importar' ? 'active' : ''}`}>
                Importar
              </button>
              <button onClick={() => setToolsTab('exportar')} className={`pill-btn ${toolsTab === 'exportar' ? 'active' : ''}`}>
                Exportar
              </button>
            </div>

            {toolsTab === 'importar' ? (
              <div className="flex flex-col gap-3">
                {isContactPickerSupported() && (
                  <button onClick={handlePickerImport} disabled={importing} className="btn btn-ghost">
                    {importing ? 'Importando…' : 'Importar desde contactos del dispositivo'}
                  </button>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">Importar desde un archivo (.vcf)</p>
                    <p className="hint">Exportá tus contactos como vCard y subí el archivo acá.</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost shrink-0">
                    Elegir archivo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".vcf,text/vcard,text/x-vcard"
                    multiple
                    className="hidden"
                    onChange={handleFileImport}
                  />
                </div>
                <ImportHelp />
                {importMessage && <p className="hint">{importMessage}</p>}
              </div>
            ) : (
              <ExportTab contacts={others} me={me} />
            )}
          </div>
        )}

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

function ImportHelp() {
  const [open, setOpen] = useState(false)
  const [platform, setPlatform] = useState<'iphone' | 'android'>('iphone')

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="text-brand text-sm font-semibold">
        {open ? 'Ocultar instrucciones' : '¿Cómo hago esto?'}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="pill-group">
            <button onClick={() => setPlatform('iphone')} className={`pill-btn ${platform === 'iphone' ? 'active' : ''}`}>
              iPhone
            </button>
            <button onClick={() => setPlatform('android')} className={`pill-btn ${platform === 'android' ? 'active' : ''}`}>
              Android
            </button>
          </div>

          {platform === 'iphone' ? (
            <div className="flex flex-col gap-3">
              <div>
                <p className="section-label mb-1">Para importar muchos de una vez (lo más simple)</p>
                <ol className="hint list-decimal space-y-1 pl-4">
                  <li>
                    Desde Safari (en el celu o la compu), entrá a{' '}
                    <span style={{ fontFamily: 'monospace' }}>icloud.com/contacts</span> e iniciá sesión con tu Apple ID.
                  </li>
                  <li>Seleccioná los contactos que querés (⌘/Ctrl+click para elegir varios, o Ctrl+A para todos).</li>
                  <li>
                    Tocá el ícono ⚙️ (abajo a la izquierda) → <strong>"Exportar vCard"</strong>.
                  </li>
                  <li>Se descarga un archivo .vcf con todos los contactos elegidos.</li>
                  <li>Volvé acá y tocá "Elegir archivo" para subirlo.</li>
                </ol>
              </div>
              <div>
                <p className="section-label mb-1">Para uno o dos contactos puntuales</p>
                <ol className="hint list-decimal space-y-1 pl-4">
                  <li>Abrí la app Contactos.</li>
                  <li>Tocá "Seleccionar" (arriba a la derecha) y elegí los contactos.</li>
                  <li>
                    Tocá compartir → <strong>"Guardar en Archivos"</strong>.
                  </li>
                  <li>Volvé acá y tocá "Elegir archivo" para buscarlo.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <p className="section-label mb-1">Para importar muchos de una vez (lo más simple)</p>
                <ol className="hint list-decimal space-y-1 pl-4">
                  <li>
                    Desde cualquier navegador, entrá a{' '}
                    <span style={{ fontFamily: 'monospace' }}>contacts.google.com</span> con tu cuenta de Google.
                  </li>
                  <li>Seleccioná los contactos que querés (o marcá todos).</li>
                  <li>
                    Tocá <strong>"Exportar"</strong> y elegí el formato vCard (.vcf).
                  </li>
                  <li>Se descarga el archivo.</li>
                  <li>Volvé acá y tocá "Elegir archivo" para subirlo.</li>
                </ol>
              </div>
              <div>
                <p className="section-label mb-1">Directo desde el teléfono</p>
                <ol className="hint list-decimal space-y-1 pl-4">
                  <li>Abrí la app Contactos.</li>
                  <li>
                    Menú (≡) → <strong>Configuración → Exportar</strong>.
                  </li>
                  <li>Elegí "Exportar a archivo .vcf" y confirmá (suele guardarse en Descargas).</li>
                  <li>Volvé acá y tocá "Elegir archivo" para buscarlo.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ExportHelp() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="text-brand text-sm font-semibold">
        {open ? 'Ocultar instrucciones' : '¿Cómo hago esto?'}
      </button>

      {open && (
        <div className="mt-3">
          <ol className="hint list-decimal space-y-1 pl-4">
            <li>Elegí los contactos (individualmente, por deporte, o todos) y tocá "Exportar".</li>
            <li>
              Si tu celular lo soporta, se abre directo el menú para compartir del sistema — elegí{' '}
              <strong>WhatsApp</strong> y el chat, listo.
            </li>
            <li>
              Si en cambio se descarga un archivo <span style={{ fontFamily: 'monospace' }}>contactos-faltauno.vcf</span>,
              abrí WhatsApp, entrá al chat, tocá el clip 📎 → <strong>Documento</strong> (o "Archivo"), y buscalo en
              Descargas.
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}

function ExportTab({ contacts, me }: { contacts: Contact[]; me?: Contact }) {
  const exportable = me ? [me, ...contacts] : contacts
  const [selectedIds, setSelectedIds] = useState<string[]>(() => exportable.map((c) => c.id))
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const allSelected = exportable.length > 0 && selectedIds.length === exportable.length
  const filtered = exportable.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))

  function toggleOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : exportable.map((c) => c.id))
  }

  function selectTag(tagId: string) {
    const taggedIds = exportable.filter((c) => c.sports?.includes(tagId)).map((c) => c.id)
    setSelectedIds((prev) => Array.from(new Set([...prev, ...taggedIds])))
  }

  async function handleExport() {
    const selected = exportable.filter((c) => selectedIds.includes(c.id))
    if (selected.length === 0) return
    setMessage('')
    const result = await shareOrDownloadVCard(
      selected.map((c) => ({ name: c.name, phone: c.phone, note: c.note })),
      'contactos-faltauno.vcf',
    )
    if (result === 'downloaded') {
      setMessage(
        'Se descargó contactos-faltauno.vcf y copiamos un mensaje con instrucciones al portapapeles — compartilo por WhatsApp junto con el archivo.',
      )
    } else if (result === 'shared') {
      setMessage(
        '¡Listo! Por las dudas copiamos el mensaje con instrucciones al portapapeles también — si no llegó junto con el archivo, pegalo a mano.',
      )
    }
  }

  if (exportable.length === 0) {
    return <p className="empty-state">Todavía no cargaste contactos para exportar.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <ExportHelp />

      <p className="hint">Compartí tu lista por WhatsApp para que un amigo la importe de una.</p>

      <div>
        <p className="hint mb-1">Elegir por deporte</p>
        <div className="flex flex-wrap gap-2">
          {SPORT_TAGS.map((tag) => (
            <button key={tag.id} type="button" onClick={() => selectTag(tag.id)} className="tag-toggle">
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <label className="list-row">
        <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
        <span className="text-sm font-semibold text-ink">Seleccionar todos</span>
      </label>

      <input placeholder="Buscar contacto..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div className="flex flex-col gap-1">
        {filtered.length === 0 ? (
          <p className="hint">Ningún contacto coincide con "{search}".</p>
        ) : (
          filtered.map((c) => (
            <label key={c.id} className="list-row">
              <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleOne(c.id)} />
              <span className="text-sm text-ink">
                {c.name}
                {c.isMe ? ' (vos)' : ''}
              </span>
            </label>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={selectedIds.length === 0}
        className="btn btn-primary disabled:opacity-40"
      >
        Exportar ({selectedIds.length})
      </button>

      {message && <p className="hint">{message}</p>}
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
  const [sports, setSports] = useState<string[]>(contact?.sports ?? [])
  const [paymentAlias, setPaymentAlias] = useState(contact?.paymentAlias ?? '')

  function toggleSport(id: string) {
    setSports((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    if (contact) {
      updateContact(contact.id, {
        name: name.trim(),
        phone: phone.trim(),
        note: note.trim() || undefined,
        sports,
        paymentAlias: paymentAlias.trim() || undefined,
      })
    } else {
      addContact(name.trim(), phone.trim(), note.trim() || undefined, sports, paymentAlias.trim() || undefined)
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-2">
      <input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <input placeholder="Teléfono (+549...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <input
        placeholder="Alias / CVU / CBU (opcional)"
        value={paymentAlias}
        onChange={(e) => setPaymentAlias(e.target.value)}
      />
      <div>
        <p className="hint mb-1">Deportes que juega</p>
        <div className="flex flex-wrap gap-2">
          {SPORT_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleSport(tag.id)}
              className={`tag-toggle ${sports.includes(tag.id) ? 'active' : ''}`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
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
        {contact.paymentAlias && <p className="hint">💰 {contact.paymentAlias}</p>}
        {contact.sports && contact.sports.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {contact.sports.map((s) => (
              <span key={s} className="badge-neutral">
                {SPORT_TAGS.find((t) => t.id === s)?.label ?? s}
              </span>
            ))}
          </div>
        )}
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
