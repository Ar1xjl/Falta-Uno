import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { createEvent, createEventFromTemplate } from '../data/actions'
import { SPORTS } from '../data/sports'

export default function CreateEvent() {
  const data = useAppData()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'scratch' | 'template'>(data.eventTemplates.length ? 'template' : 'scratch')

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 dark:text-gray-400">
          ← Volver
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Crear evento</h1>
      </div>

      {data.eventTemplates.length > 0 && (
        <div className="flex rounded-lg border border-gray-200 p-1 dark:border-gray-800">
          <button
            onClick={() => setMode('template')}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === 'template' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Desde template
          </button>
          <button
            onClick={() => setMode('scratch')}
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              mode === 'scratch' ? 'bg-emerald-600 text-white' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Desde cero
          </button>
        </div>
      )}

      {mode === 'template' && data.eventTemplates.length > 0 ? (
        <FromTemplateForm />
      ) : (
        <FromScratchForm />
      )}
    </div>
  )
}

function FromTemplateForm() {
  const data = useAppData()
  const navigate = useNavigate()
  const [templateId, setTemplateId] = useState(data.eventTemplates[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!templateId || !date || !time) {
      setError('Completá fecha y hora antes de crear el evento.')
      return
    }
    setError('')
    const id = createEventFromTemplate(templateId, date, time)
    navigate(`/events/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <select
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
      >
        {data.eventTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <input
        type="time"
        className="rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        type="submit"
        className="mt-2 rounded-lg bg-emerald-600 py-3 text-base font-medium text-white active:bg-emerald-700"
      >
        Crear
      </button>
    </form>
  )
}

function FromScratchForm() {
  const data = useAppData()
  const navigate = useNavigate()
  const [sportId, setSportId] = useState(SPORTS[0].id)
  const [club, setClub] = useState('')
  const [court, setCourt] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [confirmedIds, setConfirmedIds] = useState<string[]>([])
  const [error, setError] = useState('')

  const others = data.contacts.filter((c) => !c.isMe)

  function toggleContact(id: string) {
    setConfirmedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!club.trim() || !date || !time) {
      setError('Completá club, fecha y hora antes de crear el evento.')
      return
    }
    setError('')
    const id = createEvent({
      sportId,
      club: club.trim(),
      court: court.trim() || undefined,
      date,
      time,
      confirmedContactIds: confirmedIds,
    })
    navigate(`/events/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
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
      <div className="flex gap-3">
        <input
          type="date"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Jugadores ya confirmados (además de vos)
        </p>
        {others.length === 0 ? (
          <p className="text-sm text-gray-400">Cargá contactos primero en la pestaña Contactos.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {others.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-800"
              >
                <input type="checkbox" checked={confirmedIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                <span className="text-sm text-gray-800 dark:text-gray-200">{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-emerald-600 py-3 text-base font-medium text-white active:bg-emerald-700"
      >
        Crear
      </button>
    </form>
  )
}
