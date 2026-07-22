import { Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { useAppData } from './data/store'
import { getMeContact } from './data/selectors'
import Onboarding from './components/Onboarding'
import JoinInvite from './routes/JoinInvite'
import Layout from './components/Layout'
import SidePanel, { SPORT_MOCKUPS } from './components/SidePanel'
import Home from './routes/Home'
import Events from './routes/Events'
import Contacts from './routes/Contacts'
import Templates from './routes/Templates'
import History from './routes/History'
import Settings from './routes/Settings'
import CreateEvent from './routes/CreateEvent'
import EventDetail from './routes/EventDetail'
import Expenses from './routes/Expenses'
import NewExpense from './routes/NewExpense'
import AuthTest from './routes/AuthTest'
import RoomTest from './routes/RoomTest'

const DEV_ROUTES: Record<string, () => React.JSX.Element> = {
  '/dev/auth-test': AuthTest,
  '/dev/room-test': RoomTest,
}

function App() {
  const data = useAppData()
  const me = getMeContact(data)
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const inviteId = searchParams.get('invite')

  // Rutas de desarrollo para probar la sincronización con Supabase sin pasar por el onboarding local.
  const DevRoute = DEV_ROUTES[location.pathname]
  if (DevRoute) {
    return (
      <div className="app-shell">
        <div className="phone-frame">
          <DevRoute />
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <SidePanel items={[SPORT_MOCKUPS[0], SPORT_MOCKUPS[2]]} />
      <div className="phone-frame">
        {!me ? (
          <Onboarding />
        ) : inviteId ? (
          <JoinInvite key={inviteId} shareId={inviteId} />
        ) : (
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/expenses" element={<Expenses />} />
            </Route>
            <Route path="/events/new" element={<CreateEvent />} />
            <Route path="/events/:eventId" element={<EventDetail />} />
            <Route path="/expenses/new" element={<NewExpense />} />
          </Routes>
        )}
      </div>
      <SidePanel items={[SPORT_MOCKUPS[1], SPORT_MOCKUPS[3]]} />
    </div>
  )
}

export default App
