import { useState } from 'react'
import { ensureMeContact } from '../data/actions'

export default function Onboarding() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    ensureMeContact(name.trim(), phone.trim())
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <div className="logo">
          Falta<span className="accent">Uno!!</span>
        </div>
        <p className="hint mt-1">Antes de arrancar, decinos quién sos vos.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <input placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <input placeholder="Tu teléfono (+549...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <button type="submit" className="btn btn-primary mt-2 w-full py-3 text-base">
          Empezar
        </button>
      </form>
    </div>
  )
}
