import { useState } from 'react'

export default function HowItWorks() {
  const [open, setOpen] = useState(false)

  return (
    <div className="card">
      <button onClick={() => setOpen((o) => !o)} className="text-brand text-sm font-semibold">
        {open ? 'Ocultar' : '¿Cómo funciona la app?'}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4">
          <p className="hint">
            FaltaUno!! te ayuda a completar rápido los cupos vacantes de un partido cuando alguien se baja. No es una
            red social: es un organizador que reduce mensajes y automatiza las invitaciones por WhatsApp.
          </p>

          <div>
            <p className="section-label mb-1">Qué es cada pestaña</p>
            <ul className="hint flex flex-col gap-1.5">
              <li>
                <strong className="text-ink">Inicio</strong> — tu resumen: próximo partido, rondas que esperan
                respuesta y accesos rápidos.
              </li>
              <li>
                <strong className="text-ink">Eventos</strong> — todos tus próximos partidos. El que tiene una vacante
                recién abierta aparece arriba con el cartel "Vacante abierta".
              </li>
              <li>
                <strong className="text-ink">Contactos</strong> — tu lista de gente para invitar. Podés cargarlos a
                mano o importarlos de una vez desde un archivo.
              </li>
              <li>
                <strong className="text-ink">Grupos</strong> — partidos que se repiten (ej. "Padel jueves"). Creá
                el próximo en un toque, incluso de forma automática cada semana.
              </li>
              <li>
                <strong className="text-ink">Historial</strong> — partidos ya jugados o cancelados.
              </li>
              <li>
                <strong className="text-ink">Ajustes</strong> — tu perfil y los mensajes de WhatsApp que se usan al
                invitar.
              </li>
            </ul>
          </div>

          <div>
            <p className="section-label mb-1">Para arrancar</p>
            <ol className="hint list-decimal space-y-1 pl-4">
              <li>Cargá tus contactos habituales en la pestaña Contactos.</li>
              <li>
                Tocá <strong className="text-ink">+</strong> y anotá quién ya está confirmado.
              </li>
              <li>Si falta gente, armá una ronda o invitá directo a alguien puntual.</li>
              <li>Mandale el mensaje por WhatsApp con un toque y marcá quién aceptó.</li>
              <li>
                Si alguien se baja después, tocá <strong className="text-ink">"Se baja"</strong> en el partido: la
                vacante se reabre y te avisa acá, en Inicio.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
