import { NavLink, Outlet } from 'react-router-dom'
import Banner from './Banner'
import LightningFooter from './LightningFooter'

const TABS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/contacts', label: 'Contactos' },
  { to: '/templates', label: 'Templates' },
  { to: '/history', label: 'Historial' },
  { to: '/settings', label: 'Ajustes' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-bg">
      <Banner />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
        <LightningFooter />
      </main>
      <nav
        className="tab-bar fixed bottom-0 mx-auto flex w-full max-w-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `tab-item flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
