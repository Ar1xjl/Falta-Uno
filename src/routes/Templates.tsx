import { useState } from 'react'
import { useAppData } from '../data/store'
import {
  createEventTemplate,
  deleteEventTemplate,
  generateRecurringEvents,
  updateEventTemplate,
} from '../data/actions'
import { SPORTS } from '../data/sports'
import type { EventTemplate, EventTemplateRound } from '../types'

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function Templates() {
  const data = useAppData()
  const [editing, setEditing] = useState<EventTemplate | 'new' | null>(null)

  if (editing) {
    return (
      <TemplateForm
        template={editing === 'new' ? undefined : editing}
        onDone={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Templates</h1>
        <button
          onClick={() => setEditing('new')}
          className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white active:bg-emerald-700"
        >
          + Nuevo
        </button>
      </div>

      {data.eventTemplates.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Todavía no guardaste ningún template.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {data.eventTemplates.map((t) => (
            <div key={t.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t.club} · {t.defaultRounds.length} ronda{t.defaultRounds.length === 1 ? '' : 's'}
                    {t.recurrence &&
                      ` · Todos los ${WEEKDAYS[t.recurrence.weekday].toLowerCase()} ${t.recurrence.time}hs`}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <button onClick={() => setEditing(t)} className="text-emerald-600 dark:text-emerald-400">
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar el template "${t.name}"?`)) deleteEventTemplate(t.id)
                    }}
                    className="text-red-600 dark:text-red-400"
                  >
                    Borrar
                  </button>
                </div>
              </div>
              {t.recurrence && <GenerateRecurringControls template={t} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GenerateRecurringControls({ template }: { template: EventTemplate }) {
  const [mode, setMode] = useState<'count' | 'until'>('count')
  const [count, setCount] = useState(6)
  const [untilDate, setUntilDate] = useState('')
  const [message, setMessage] = useState('')

  function handleGenerate() {
    const created =
      mode === 'count'
        ? generateRecurringEvents(template.id, { count })
        : generateRecurringEvents(template.id, { untilDate })
    setMessage(created === 0 ? 'Ya estaban todos generados.' : `Se crearon ${created} partido${created === 1 ? '' : 's'}.`)
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
      <div className="flex rounded-lg border border-gray-200 p-1 text-xs dark:border-gray-800">
        <button
          type="button"
          onClick={() => setMode('count')}
          className={`flex-1 rounded-md py-1.5 font-medium ${
            mode === 'count' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Próximos N
        </button>
        <button
          type="button"
          onClick={() => setMode('until')}
          className={`flex-1 rounded-md py-1.5 font-medium ${
            mode === 'until' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          Hasta una fecha
        </button>
      </div>
      <div className="flex gap-2">
        {mode === 'count' ? (
          <input
            type="number"
            min={1}
            max={52}
            className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
          />
        ) : (
          <input
            type="date"
            className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
          />
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={mode === 'until' && !untilDate}
          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Generar
        </button>
      </div>
      {message && <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>}
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onDone} className="text-sm text-gray-500 dark:text-gray-400">
          ← Volver
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {template ? 'Editar template' : 'Nuevo template'}
        </h1>
      </div>

      <input
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Nombre (ej. Padel jueves)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <select
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={sportId}
        onChange={(e) => setSportId(e.target.value)}
      >
        {SPORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.requiredPlayers})
          </option>
        ))}
      </select>
      <input
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Club"
        value={club}
        onChange={(e) => setClub(e.target.value)}
      />
      <input
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        placeholder="Cancha (opcional)"
        value={court}
        onChange={(e) => setCourt(e.target.value)}
      />

      <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Es recurrente (día y hora fijos)</span>
        </label>
        {isRecurring && (
          <div className="mt-2 flex gap-2">
            <select
              className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
            >
              {WEEKDAYS.map((w, i) => (
                <option key={w} value={i}>
                  {w}
                </option>
              ))}
            </select>
            <input
              type="time"
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              value={recurTime}
              onChange={(e) => setRecurTime(e.target.value)}
            />
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Núcleo fijo (además de vos)</p>
        <div className="flex flex-col gap-1">
          {others.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input type="checkbox" checked={confirmedIds.includes(c.id)} onChange={() => toggleConfirmed(c.id)} />
              <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rondas por defecto</p>
          <button type="button" onClick={addRound} className="text-sm text-emerald-600 dark:text-emerald-400">
            + Agregar ronda
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {rounds.map((r) => (
            <div key={r.order} className="rounded-lg border border-gray-200 p-2 dark:border-gray-800">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Ronda {r.order}</span>
                <button
                  type="button"
                  onClick={() => removeRound(r.order)}
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  Quitar
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {others
                  .filter((c) => !confirmedIds.includes(c.id))
                  .map((c) => (
                    <label key={c.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.contactIds.includes(c.id)}
                        onChange={() => toggleRoundContact(r.order, c.id)}
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
                    </label>
                  ))}
              </div>
              {data.messageTemplates.length > 0 && (
                <select
                  className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
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

      <button
        type="submit"
        className="mt-2 rounded-lg bg-emerald-600 py-3 text-base font-medium text-white active:bg-emerald-700"
      >
        Guardar
      </button>
    </form>
  )
}
