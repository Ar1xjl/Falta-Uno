import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppData } from '../data/store'
import { addExpense } from '../data/actions'
import PageHeader from '../components/PageHeader'

export default function NewExpense() {
  const data = useAppData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') ?? undefined
  const eventTemplateId = searchParams.get('templateId') ?? undefined

  const event = eventId ? data.events.find((e) => e.id === eventId) : undefined
  const template = eventTemplateId ? data.eventTemplates.find((t) => t.id === eventTemplateId) : undefined
  const meId = data.contacts.find((c) => c.isMe)?.id

  const [description, setDescription] = useState(template ? `Abono ${template.name}` : '')
  const [amount, setAmount] = useState('')
  const [paidByContactId, setPaidByContactId] = useState(meId ?? '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [participants, setParticipants] = useState<string[]>(
    event?.confirmedContactIds ?? template?.defaultConfirmedContactIds ?? [],
  )
  const [error, setError] = useState('')

  function toggleParticipant(id: string) {
    setParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numericAmount = Number(amount)
    if (!description.trim() || !numericAmount || numericAmount <= 0 || !paidByContactId || participants.length === 0) {
      setError('Completá descripción, monto, quién pagó y al menos un participante.')
      return
    }
    setError('')
    addExpense({
      description: description.trim(),
      amount: numericAmount,
      paidByContactId,
      splitContactIds: participants,
      date,
      eventId,
      eventTemplateId,
    })
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
            Vinculado a {event ? `el evento del ${event.date}` : `el template "${template!.name}"`}.
          </p>
        )}

        <input
          placeholder="Descripción (ej. Pelotas, Abono julio)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div>
          <p className="section-label mb-2">¿Quién pagó?</p>
          <select value={paidByContactId} onChange={(e) => setPaidByContactId(e.target.value)}>
            <option value="">Elegir...</option>
            {data.contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isMe ? ' (vos)' : ''}
              </option>
            ))}
          </select>
        </div>

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

        {error && <p className="text-danger text-sm">{error}</p>}

        <button type="submit" className="btn btn-primary mt-2 py-3 text-base">
          Guardar
        </button>
      </form>
    </div>
  )
}
