import { Route, Routes } from 'react-router-dom'
import { useAppData } from './data/store'
import { getMeContact } from './data/selectors'
import Onboarding from './components/Onboarding'
import Layout from './components/Layout'
import Home from './routes/Home'
import Events from './routes/Events'
import Contacts from './routes/Contacts'
import Templates from './routes/Templates'
import History from './routes/History'
import Settings from './routes/Settings'
import CreateEvent from './routes/CreateEvent'
import EventDetail from './routes/EventDetail'

function App() {
  const data = useAppData()
  const me = getMeContact(data)

  if (!me) return <Onboarding />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/events/new" element={<CreateEvent />} />
      <Route path="/events/:eventId" element={<EventDetail />} />
    </Routes>
  )
}

export default App
