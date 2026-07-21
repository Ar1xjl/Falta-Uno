import { useEffect, useState } from 'react'
import { supabase, supabaseEnabled } from '../lib/supabase'
import PageHeader from '../components/PageHeader'

type Mode = 'phone' | 'password'
type PhoneStep = 'phone' | 'code'
type SessionInfo = { id: string; label: string } | null

export default function AuthTest() {
  const [mode, setMode] = useState<Mode>('phone')
  const [session, setSession] = useState<SessionInfo | 'loading'>('loading')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      setSession(user ? { id: user.id, label: user.phone || user.email || '?' } : null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const user = newSession?.user
      setSession(user ? { id: user.id, label: user.phone || user.email || '?' } : null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase?.auth.signOut()
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Prueba: login" />
      <div className="flex flex-col gap-4 p-4">
        <p className="hint">
          Ruta de desarrollo, no enlazada desde la navegación — sirve para validar el login contra el
          proyecto real de Supabase antes de integrarlo al resto de la app.
        </p>

        {!supabaseEnabled ? (
          <p className="card text-danger">
            Faltan <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> en{' '}
            <code>.env.local</code>.
          </p>
        ) : session === 'loading' ? (
          <p className="hint">Revisando si ya hay una sesión guardada…</p>
        ) : session ? (
          <div className="card flex flex-col gap-2">
            <p className="font-semibold text-ink">Ya tenés sesión activa ✓</p>
            <p className="hint">{session.label}</p>
            <p className="hint">user.id: {session.id}</p>
            <a href="/dev/room-test" className="btn btn-primary text-center">
              Ir a la sala de prueba →
            </a>
            <button className="btn btn-ghost" onClick={handleSignOut}>
              Cerrar sesión
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button
                className={
                  (mode === 'phone' ? 'btn btn-primary flex-1' : 'btn btn-ghost flex-1') + ' whitespace-normal text-sm'
                }
                onClick={() => setMode('phone')}
              >
                Por teléfono
              </button>
              <button
                className={
                  (mode === 'password' ? 'btn btn-primary flex-1' : 'btn btn-ghost flex-1') +
                  ' whitespace-normal text-sm'
                }
                onClick={() => setMode('password')}
              >
                Usuario de prueba
              </button>
            </div>

            {mode === 'phone' ? <PhoneLogin /> : <PasswordLogin />}
          </>
        )}
      </div>
    </div>
  )
}

type Channel = 'sms' | 'whatsapp'

function PhoneLogin() {
  const [step, setStep] = useState<PhoneStep>('phone')
  const [phone, setPhone] = useState('+549')
  const [channel, setChannel] = useState<Channel>('whatsapp')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { channel } })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep('code')
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setLoading(true)
    // onAuthStateChange en el componente padre se encarga de mostrar la sesión creada.
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <>
      {step === 'phone' && (
        <form onSubmit={handleSendCode} className="card flex flex-col gap-2">
          <label className="text-sm font-semibold text-ink" htmlFor="phone">
            Número (formato E.164, ej. +5491122334455)
          </label>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex gap-2">
            <button
              type="button"
              className={channel === 'whatsapp' ? 'btn btn-primary flex-1' : 'btn btn-ghost flex-1'}
              onClick={() => setChannel('whatsapp')}
            >
              WhatsApp
            </button>
            <button
              type="button"
              className={channel === 'sms' ? 'btn btn-primary flex-1' : 'btn btn-ghost flex-1'}
              onClick={() => setChannel('sms')}
            >
              SMS
            </button>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerifyCode} className="card flex flex-col gap-2">
          <p className="hint">
            Código enviado a {phone} por {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.
          </p>
          <label className="text-sm font-semibold text-ink" htmlFor="code">
            Código recibido
          </label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Verificando…' : 'Verificar'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep('phone')}>
            Cambiar número
          </button>
        </form>
      )}

      {error && <p className="card text-danger">{error}</p>}
    </>
  )
}

function PasswordLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setError(null)
    setLoading(true)
    // onAuthStateChange en el componente padre se encarga de mostrar la sesión creada.
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <>
      <form onSubmit={handleSignIn} className="card flex flex-col gap-2">
        <p className="hint">
          Usá acá el usuario de prueba que creaste a mano en Supabase (Authentication → Users → Add
          user) — no es una cuenta real, solo sirve para simular un segundo usuario.
        </p>
        <label className="text-sm font-semibold text-ink" htmlFor="email">
          Email
        </label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="text-sm font-semibold text-ink" htmlFor="password">
          Contraseña
        </label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {error && <p className="card text-danger">{error}</p>}
    </>
  )
}
