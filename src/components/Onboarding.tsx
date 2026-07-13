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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">FaltaUno!!</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Antes de arrancar, decinos quién sos vos.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <input
          className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          className="rounded-lg border border-gray-300 px-4 py-3 text-base dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          placeholder="Tu teléfono (+549...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-emerald-600 py-3 text-base font-medium text-white active:bg-emerald-700"
        >
          Empezar
        </button>
      </form>
    </div>
  )
}
