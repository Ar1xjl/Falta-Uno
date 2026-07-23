import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { replaceData } from '../data/store'
import { pullAppData } from '../lib/appDataSync'
import { signInWithDeviceKey } from '../lib/pubkeyAuth'
import { supabaseEnabled } from '../lib/supabase'
import { toErrorMessage } from '../lib/errors'

// Punto de entrada real para un link de vinculación de dispositivo (?link=<code>), generado
// desde Ajustes en un dispositivo ya autenticado. A diferencia de JoinInvite, esto corre ANTES
// del onboarding local — no hace falta crear un "Tu perfil" acá para después pisarlo con los
// datos que vamos a traer del otro dispositivo.
export default function LinkDevice({ code }: { code: string }) {
  const navigate = useNavigate()
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLink() {
    setLinking(true)
    setError(null)
    try {
      await signInWithDeviceKey(code)
      const remote = await pullAppData()
      if (remote) replaceData(remote)
      navigate('/', { replace: true })
    } catch (e) {
      setError(toErrorMessage(e))
      setLinking(false)
    }
  }

  if (!supabaseEnabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-danger text-sm">Esta app no tiene la sincronización configurada.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/', { replace: true })}>
          Ir al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col justify-center gap-4 px-6">
      <div className="card flex flex-col gap-3">
        <div>
          <p className="font-semibold text-ink">Vincular este dispositivo</p>
          <p className="text-muted text-sm">
            Este dispositivo va a pasar a compartir la misma identidad que el que generó el código,
            y sus datos locales (contactos, eventos, gastos) se van a <strong>reemplazar</strong> por
            los del otro dispositivo.
          </p>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button onClick={handleLink} disabled={linking} className="btn btn-primary">
          {linking ? 'Vinculando…' : 'Vincular'}
        </button>
        <button onClick={() => navigate('/', { replace: true })} className="btn btn-ghost" disabled={linking}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
