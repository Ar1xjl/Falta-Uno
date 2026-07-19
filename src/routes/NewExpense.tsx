import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../data/store'
import { addExpense, getUpcomingTemplateEventIds } from '../data/actions'
import { getSportConfig } from '../data/sports'
import PageHeader from '../components/PageHeader'

interface LineItem {
  description: string
  amount: string
  paidByContactId: string
}

function emptyItem(paidByContactId: string): LineItem {
  return { description: '', amount: '', paidByContactId }
}

export default function NewExpense() {
  const data = useAppData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') ?? undefined
  const templateId = searchParams.get('templateId') ?? undefined

  const event = eventId ? data.events.find((e) => e.id === eventId) : undefined
  const template = templateId ? data.eventTemplates.find((t) => t.id === templateId) : undefined
  const meId = data.contacts.find((c) => c.isMe)?.id

  const [items, setItems] = useState<LineItem[]>([emptyItem(meId ?? '')])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [participants, setParticipants] = useState<string[]>(event?.confirmedContactIds ?? [])
  const [eventCount, setEventCount] = useState(4)
  const [error, setError] = useState('')

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  function addItemRow() {
    setItems((prev) => [...prev, emptyItem(meId ?? '')])
  }

  function removeItemRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function toggleParticipant(id: string) {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valid = items.filter((it) => it.description.trim() && Number(it.amount) > 0 && it.paidByContactId)
    if (valid.length === 0) {
      setError('Cargá al menos un gasto con descripción, monto y quién pagó.')
      return
    }
    if (template) {
      if (eventCount < 1) {
        setError('El abono tiene que alcanzar al menos 1 evento.')
        return
      }
    } else if (participants.length === 0) {
      setError('Elegí al menos un participante para dividir el gasto.')
      return
    }
    setError('')

    const coveredEventIds = template ? getUpcomingTemplateEventIds(template.id, date, eventCount) : undefined

    for (const item of valid) {
      addExpense({
        description: item.description.trim(),
        amount: Number(item.amount),
        paidByContactId: item.paidByContactId,
        date,
        eventId,
        splitContactIds: template ? undefined : participants,
        eventTemplateId: template?.id,
        coveredEventIds,
      })
    }
    navigate('/expenses')
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Nuevo gasto"
        sticky
        leading={
          <button onClick={() => navigate(-1)} className="text-muted text-sm">
            ← Volver
          </button>
        }
      />

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 p-4">
        {(event || template) && (
          <p className="hint">
            Vinculado a{' '}
            {event
              ? `el evento de ${getSportConfig(event.sportId).name} del ${event.date}`
              : `la serie "${template!.name}"`}
            .
          </p>
        )}

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        {template && (
          <div>
            <p className="section-label mb-1">¿A cuántos eventos alcanza?</p>
            <input
              type="number"
              min={1}
              max={52}
              value={eventCount}
              onChange={(e) => setEventCount(Number(e.target.value) || 1)}
            />
            <p className="hint mt-1">
              Se divide en partes iguales entre los próximos {eventCount} evento{eventCount === 1 ? '' : 's'} de esta
              serie, según quién esté confirmado en cada uno.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="card flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="hint font-semibold">Ítem {i + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItemRow(i)} className="text-danger text-xs font-semibold">
                    Quitar
                  </button>
                )}
              </div>
              <input
                placeholder="Descripción (ej. Pelotas, Cancha, Abono julio)"
                value={item.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto"
                value={item.amount}
                onChange={(e) => updateItem(i, { amount: e.target.value })}
              />
              <select value={item.paidByContactId} onChange={(e) => updateItem(i, { paidByContactId: e.target.value })}>
                <option value="">¿Quién pagó?</option>
                {data.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isMe ? ' (vos)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button type="button" onClick={addItemRow} className="btn btn-ghost">
          + Agregar otro ítem
        </button>

        {!template && (
          <div>
            <p className="section-label mb-2">¿Entre quiénes se divide?</p>
            <div className="flex flex-col gap-1">
              {data.contacts.map((c) => (
                <label key={c.id} className="list-row">
                  <input type="checkbox" checked={participants.includes(c.id)} onChange={() => toggleParticipant(c.id)} />
                  <span className="text-sm text-ink">
                    {c.name}
                    {c.isMe ? ' (vos)' : ''}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-danger text-sm">{error}</p>}

        <button type="submit" className="btn btn-primary mt-2 py-3 text-base">
          Guardar
        </button>
      </form>
    </div>
  )
}
