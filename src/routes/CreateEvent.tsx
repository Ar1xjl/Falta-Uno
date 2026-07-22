import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { createEvent, createEventFromTemplate } from '../data/actions'
import { getAllSports } from '../data/sports'
import PageHeader from '../components/PageHeader'

export default function CreateEvent() {
  const data = useAppData()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'scratch' | 'template'>(data.eventTemplates.length ? 'template' : 'scratch')

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <PageHeader
        title="Crear evento"
        sticky
        leading={
          <button onClick={() => navigate(-1)} className="text-muted text-sm">
            ← Volver
          </button>
        }
      />

      <div className="flex flex-col gap-4 p-4">
        {data.eventTemplates.length > 0 && (
          <div className="pill-group">
            <button onClick={() => setMode('template')} className={`pill-btn ${mode === 'template' ? 'active' : ''}`}>
              Desde grupo
            </button>
            <button onClick={() => setMode('scratch')} className={`pill-btn ${mode === 'scratch' ? 'active' : ''}`}>
              Desde cero
            </button>
          </div>
        )}

        {mode === 'template' && data.eventTemplates.length > 0 ? <FromTemplateForm /> : <FromScratchForm />}
      </div>
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
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
        {data.eventTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <p className="hint">Fecha</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="hint">Hora</p>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      <button type="submit" className="btn btn-primary mt-2 py-3 text-base">
        Crear
      </button>
    </form>
  )
}

function FromScratchForm() {
  const data = useAppData()
  const navigate = useNavigate()
  const sports = getAllSports(data.customSports)
  const [sportId, setSportId] = useState('')
  const [requiredPlayersInput, setRequiredPlayersInput] = useState('4')
  const requiredPlayers = Math.max(1, Number(requiredPlayersInput) || 1)
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

  function handleSportChange(id: string) {
    setSportId(id)
    const sport = sports.find((s) => s.id === id)
    if (sport) setRequiredPlayersInput(String(sport.defaultRequiredPlayers))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sportId || !club.trim() || !date || !time) {
      setError('Completá deporte, club, fecha y hora antes de crear el evento.')
      return
    }
    setError('')
    const id = createEvent({
      sportId,
      club: club.trim(),
      court: court.trim() || undefined,
      date,
      time,
      requiredPlayers,
      confirmedContactIds: confirmedIds,
    })
    navigate(`/events/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <select value={sportId} onChange={(e) => handleSportChange(e.target.value)}>
        <option value="" disabled>
          Deporte
        </option>
        {sports.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="flex flex-1 flex-col gap-1">
        <p className="hint">Cantidad de jugadores</p>
        <input
          type="number"
          min={1}
          value={requiredPlayersInput}
          onChange={(e) => setRequiredPlayersInput(e.target.value)}
        />
      </div>
      <input placeholder="Club" value={club} onChange={(e) => setClub(e.target.value)} />
      <input placeholder="Cancha (opcional)" value={court} onChange={(e) => setCourt(e.target.value)} />
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <p className="hint">Fecha</p>
          <input type="date" className="w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="hint">Hora</p>
          <input type="time" className="w-full" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div>
        <p className="section-label mb-2">Jugadores ya confirmados (además de vos)</p>
        {others.length === 0 ? (
          <p className="hint">Cargá contactos primero en la pestaña Contactos.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {others.map((c) => (
              <label key={c.id} className="list-row">
                <input type="checkbox" checked={confirmedIds.includes(c.id)} onChange={() => toggleContact(c.id)} />
                <span className="text-sm text-ink">{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      <button type="submit" className="btn btn-primary mt-2 py-3 text-base">
        Crear
      </button>
    </form>
  )
}
