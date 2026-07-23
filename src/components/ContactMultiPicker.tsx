import { useState } from 'react'
import type { Contact } from '../types'

/**
 * Multi-select checkbox list de contactos, con un filtro opcional "Sólo quienes juegan {deporte}"
 * (igual al que ya existía en Rondas de EventDetail) — pensado para usarse dentro de un picker que
 * se abre/cierra con un botón "+ Agregar", no para mostrar la agenda entera todo el tiempo.
 */
export default function ContactMultiPicker({
  contacts,
  selectedIds,
  onToggle,
  sportCategory,
  sportName,
}: {
  contacts: Contact[]
  selectedIds: string[]
  onToggle: (id: string) => void
  sportCategory?: string
  sportName?: string
}) {
  const [onlyThisSport, setOnlyThisSport] = useState(false)

  const shown =
    onlyThisSport && sportCategory
      ? contacts.filter((c) => !c.sports || c.sports.length === 0 || c.sports.includes(sportCategory))
      : contacts

  if (contacts.length === 0) {
    return <p className="hint">No quedan contactos disponibles.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {sportCategory && sportName && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyThisSport} onChange={(e) => setOnlyThisSport(e.target.checked)} />
          <span className="hint">Sólo quienes juegan {sportName}</span>
        </label>
      )}
      {shown.length === 0 ? (
        <p className="hint">Nadie tiene esa etiqueta todavía — probá sin el filtro.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {shown.map((c) => (
            <label key={c.id} className="list-row">
              <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => onToggle(c.id)} />
              <span className="text-sm text-ink">{c.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
