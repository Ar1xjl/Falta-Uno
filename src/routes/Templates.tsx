import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import {
  createEventTemplate,
  deleteEventTemplate,
  generateRecurringEvents,
  updateEventTemplate,
} from '../data/actions'
import { SPORTS } from '../data/sports'
import type { EventTemplate, EventTemplateRound } from '../types'
import PageHeader from '../components/PageHeader'

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Templates() {
  const data = useAppData()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<EventTemplate | 'new' | null>(null)

  if (editing) {
    return <TemplateForm template={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Templates"
        trailing={
          <button onClick={() => setEditing('new')} className="btn btn-primary">
            + Nuevo
          </button>
        }
      />

      <div className="flex flex-col gap-2 p-4">
        {data.eventTemplates.length === 0 ? (
          <p className="empty-state">Todavía no guardaste ningún template.</p>
        ) : (
          data.eventTemplates.map((t) => (
            <div key={t.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-ink">{t.name}</p>
                  <p className="text-muted text-sm">
                    {t.club} · {t.defaultRounds.length} ronda{t.defaultRounds.length === 1 ? '' : 's'}
                    {t.recurrence && ` · Todos los ${WEEKDAYS[t.recurrence.weekday].toLowerCase()} ${t.recurrence.time}hs`}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setEditing(t)} className="text-brand font-semibold">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el template "${t.name}"?`)) deleteEventTemplate(t.id)
                    }}
                    className="text-danger font-semibold"
                  >
                    Borrar
                  </button>
                </div>
              </div>
              <button
                onClick={() => navigate(`/expenses/new?templateId=${t.id}`)}
                className="text-brand mt-2 text-sm font-semibold"
              >
                💰 Agregar gasto (abono)
              </button>
              {t.recurrence && <GenerateRecurringControls template={t} />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function GenerateRecurringControls({ template }: { template: EventTemplate }) {
  const [mode, setMode] = useState<'count' | 'until'>('count')
  const [countInput, setCountInput] = useState('6')
  const [untilDate, setUntilDate] = useState('')
  const [message, setMessage] = useState('')

  function handleGenerate() {
    const count = Math.min(52, Math.max(1, Number(countInput) || 1))
    const created =
      mode === 'count'
        ? generateRecurringEvents(template.id, { count })
        : generateRecurringEvents(template.id, { untilDate })
    setMessage(created === 0 ? 'Ya estaban todos generados.' : `Se crearon ${created} partido${created === 1 ? '' : 's'}.`)
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: 'var(--color-line)' }}>
      <div className="pill-group">
        <button type="button" onClick={() => setMode('count')} className={`pill-btn ${mode === 'count' ? 'active' : ''}`}>
          Próximos N
        </button>
        <button type="button" onClick={() => setMode('until')} className={`pill-btn ${mode === 'until' ? 'active' : ''}`}>
          Hasta una fecha
        </button>
      </div>
      <div className="flex gap-2">
        {mode === 'count' ? (
          <input
            type="number"
            min={1}
            max={52}
            className="w-20"
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
          />
        ) : (
          <input type="date" className="flex-1" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} />
        )}
        <button type="button" onClick={handleGenerate} disabled={mode === 'until' && !untilDate} className="btn btn-primary flex-1">
          Generar
        </button>
      </div>
      {message && <p className="hint">{message}</p>}
    </div>
  )
}

function TemplateForm({ template, onDone }: { template?: EventTemplate; onDone: () => void }) {
  const data = useAppData()
  const meId = data.contacts.find((c) => c.isMe)?.id
  const others = data.contacts.filter((c) => !c.isMe)

  const [name, setName] = useState(template?.name ?? '')
  const [sportId, setSportId] = useState(template?.sportId ?? SPORTS[0].id)
  const [club, setClub] = useState(template?.club ?? '')
  const [court, setCourt] = useState(template?.court ?? '')
  const [confirmedIds, setConfirmedIds] = useState<string[]>(
    (template?.defaultConfirmedContactIds ?? []).filter((id) => id !== meId),
  )
  const [rounds, setRounds] = useState<EventTemplateRound[]>(template?.defaultRounds ?? [])
  const [isRecurring, setIsRecurring] = useState(Boolean(template?.recurrence))
  const [weekday, setWeekday] = useState(template?.recurrence?.weekday ?? 4)
  const [recurTime, setRecurTime] = useState(template?.recurrence?.time ?? '20:00')

  function toggleConfirmed(id: string) {
    setConfirmedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function addRound() {
    setRounds((prev) => [...prev, { order: prev.length ? Math.max(...prev.map((r) => r.order)) + 1 : 1, contactIds: [] }])
  }

  function toggleRoundContact(order: number, contactId: string) {
    setRounds((prev) =>
      prev.map((r) =>
        r.order === order
          ? {
              ...r,
              contactIds: r.contactIds.includes(contactId)
                ? r.contactIds.filter((x) => x !== contactId)
                : [...r.contactIds, contactId],
            }
          : r,
      ),
    )
  }

  function setRoundTemplate(order: number, messageTemplateId: string) {
    setRounds((prev) => prev.map((r) => (r.order === order ? { ...r, messageTemplateId: messageTemplateId || undefined } : r)))
  }

  function removeRound(order: number) {
    setRounds((prev) => prev.filter((r) => r.order !== order))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !club.trim()) return
    const defaultConfirmedContactIds = meId ? [meId, ...confirmedIds] : confirmedIds
    const input = {
      name: name.trim(),
      sportId,
      club: club.trim(),
      court: court.trim() || undefined,
      defaultConfirmedContactIds,
      defaultRounds: rounds,
      recurrence: isRecurring ? { weekday, time: recurTime } : undefined,
    }
    if (template) {
      updateEventTemplate(template.id, input)
    } else {
      createEventTemplate(input)
    }
    onDone()
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={template ? 'Editar template' : 'Nuevo template'}
        leading={
          <button type="button" onClick={onDone} className="text-muted text-sm">
            ← Volver
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
        <input placeholder="Nombre (ej. Padel jueves)" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={sportId} onChange={(e) => setSportId(e.target.value)}>
          {SPORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.requiredPlayers})
            </option>
          ))}
        </select>
        <input placeholder="Club" value={club} onChange={(e) => setClub(e.target.value)} />
        <input placeholder="Cancha (opcional)" value={court} onChange={(e) => setCourt(e.target.value)} />

        <div className="card">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            <span className="section-label">Es recurrente (día y hora fijos)</span>
          </label>
          {isRecurring && (
            <div className="mt-2 flex gap-2">
              <select className="flex-1" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((w, i) => (
                  <option key={w} value={i}>
                    {w}
                  </option>
                ))}
              </select>
              <input type="time" value={recurTime} onChange={(e) => setRecurTime(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <p className="section-label mb-2">Núcleo fijo (además de vos)</p>
          <div className="flex flex-col gap-1">
            {others.map((c) => (
              <label key={c.id} className="list-row">
                <input type="checkbox" checked={confirmedIds.includes(c.id)} onChange={() => toggleConfirmed(c.id)} />
                <span className="text-sm text-ink">{c.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="section-label">Rondas por defecto</p>
            <button type="button" onClick={addRound} className="text-brand text-sm font-semibold">
              + Agregar ronda
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {rounds.map((r) => (
              <div key={r.order} className="card">
                <div className="mb-1 flex items-center justify-between">
                  <span className="hint font-semibold">Ronda {r.order}</span>
                  <button type="button" onClick={() => removeRound(r.order)} className="text-danger text-xs font-semibold">
                    Quitar
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {others
                    .filter((c) => !confirmedIds.includes(c.id))
                    .map((c) => (
                      <label key={c.id} className="list-row">
                        <input
                          type="checkbox"
                          checked={r.contactIds.includes(c.id)}
                          onChange={() => toggleRoundContact(r.order, c.id)}
                        />
                        <span className="text-sm text-ink">{c.name}</span>
                      </label>
                    ))}
                </div>
                {data.messageTemplates.length > 0 && (
                  <select
                    className="mt-2"
                    value={r.messageTemplateId ?? ''}
                    onChange={(e) => setRoundTemplate(r.order, e.target.value)}
                  >
                    <option value="">Mensaje por defecto</option>
                    {data.messageTemplates.map((mt) => (
                      <option key={mt.id} value={mt.id}>
                        {mt.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-2 py-3 text-base">
          Guardar
        </button>
      </form>
    </div>
  )
}
