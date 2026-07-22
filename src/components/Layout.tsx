import { NavLink, Outlet } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getAttentionCount } from '../data/selectors'
import Banner from './Banner'
import LightningFooter from './LightningFooter'

const TABS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/events', label: 'Eventos' },
  { to: '/contacts', label: 'Contactos' },
  { to: '/grupos', label: 'Grupos' },
  { to: '/history', label: 'Historial' },
  { to: '/settings', label: 'Ajustes' },
]

export default function Layout() {
  const data = useAppData()
  const attentionCount = getAttentionCount(data)

  return (
    <div className="flex h-full flex-col bg-bg">
      <Banner />
      <nav className="tab-bar flex w-full">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `tab-item relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium ${isActive ? 'active' : ''}`}
          >
            {tab.label}
            {tab.to === '/' && attentionCount > 0 && <span className="nav-badge">{attentionCount}</span>}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
        <LightningFooter />
      </main>
    </div>
  )
}
