import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/contacts', label: 'Contactos' },
  { to: '/templates', label: 'Templates' },
  { to: '/history', label: 'Historial' },
  { to: '/settings', label: 'Ajustes' },
]

export default function Layout() {
  return (
    <div className="mx-auto flex h-full max-w-md flex-col bg-white dark:bg-gray-950">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav
        className="fixed bottom-0 mx-auto flex w-full max-w-md border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
