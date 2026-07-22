import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/events', emoji: '📅', label: 'Eventos' },
  { to: '/contacts', emoji: '👥', label: 'Contactos' },
  { to: '/grupos', emoji: '🔁', label: 'Grupos' },
  { to: '/expenses', emoji: '💰', label: 'Gastos' },
  { to: '/history', emoji: '🗂️', label: 'Historial' },
  { to: '/settings', emoji: '⚙️', label: 'Ajustes' },
]

export default function QuickLinks({ contactsCount }: { contactsCount: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className="card flex flex-col items-center gap-1 py-3 text-center"
        >
          <span className="text-xl">{link.emoji}</span>
          <span className="hint">
            {link.label}
            {link.to === '/contacts' && contactsCount > 0 ? ` (${contactsCount})` : ''}
          </span>
        </NavLink>
      ))}
    </div>
  )
}
