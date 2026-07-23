import { useState } from 'react'
import type { Contact } from '../types'
import ContactMultiPicker from './ContactMultiPicker'

/**
 * Muestra solo a quienes ya están sumados (con botón para sacarlos), en vez de la agenda entera
 * — para agregar gente nueva hay que tocar "+ Agregar", que revela el picker con el filtro por
 * deporte. Compartido entre el núcleo fijo y cada ronda de un grupo.
 */
export default function MembersEditor({
  selectedIds,
  allContacts,
  onToggle,
  sportCategory,
  sportName,
  emptyLabel = 'Nadie más todavía.',
}: {
  selectedIds: string[]
  allContacts: Contact[]
  onToggle: (id: string) => void
  sportCategory?: string
  sportName?: string
  emptyLabel?: string
}) {
  const [adding, setAdding] = useState(false)
  const selected = allContacts.filter((c) => selectedIds.includes(c.id))
  const candidates = allContacts.filter((c) => !selectedIds.includes(c.id))

  return (
    <div className="flex flex-col gap-2">
      {selected.length === 0 ? (
        <p className="hint">{emptyLabel}</p>
      ) : (
        <div className="flex flex-col gap-1">
          {selected.map((c) => (
            <div key={c.id} className="list-row justify-between">
              <span className="text-sm text-ink">{c.name}</span>
              <button type="button" onClick={() => onToggle(c.id)} className="text-danger text-xs font-semibold">
                Sacar
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="card flex flex-col gap-2">
          <ContactMultiPicker
            contacts={candidates}
            selectedIds={[]}
            onToggle={onToggle}
            sportCategory={sportCategory}
            sportName={sportName}
          />
          <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost">
            Listo
          </button>
        </div>
      ) : (
        candidates.length > 0 && (
          <button type="button" onClick={() => setAdding(true)} className="text-brand self-start text-sm font-semibold">
            + Agregar
          </button>
        )
      )}
    </div>
  )
}
