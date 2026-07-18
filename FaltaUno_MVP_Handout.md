# FaltaUno!! — MVP Technical Handout
*Documento de referencia para implementación con Claude Code*

---

## 1. Visión

Aplicación mobile-first para que organizadores de deportes amateur completen rápidamente los cupos vacantes de un partido.

Caso de uso central:
> "Ya tengo el partido armado. Se bajó un jugador. Necesito reemplazo ya."

**No es una red social.** Es un organizador. Reduce mensajes, ahorra tiempo, automatiza el proceso de invitación.

---

## 2. Alcance del MVP

**Local-first, sin backend, sin cuentas, sin login.** Todo vive en el dispositivo (localStorage / IndexedDB según implementación).

### Explícitamente FUERA del MVP (para no perder tiempo implementando)
- Tags / categorías de contactos
- Niveles de habilidad como campo estructurado
- Estados de invitación "Seen" (visto) y "No response"
- Timers automáticos de expiración de ronda (todo avance es manual)
- Backup / export / import de datos
- Detección automática de estado en WhatsApp (no existe sin Business API)
- Cualquier feature de red, marketplace, o multi-usuario

Estas features están documentadas en la sección 8 (Roadmap futuro) solo como contexto — **no implementar en esta fase**.

---

## 3. Stack

- **React** (web app, mobile-first responsive; PWA-friendly)
- Sin backend: persistencia local (localStorage o IndexedDB)
- Integración con WhatsApp vía deep link (`https://wa.me/<phone>?text=<mensaje>`), sin API oficial
  - **Limitación de plataforma (no evitable)**: el deep link abre WhatsApp con el mensaje prellenado; el envío final requiere que el organizador toque "Enviar" dentro de WhatsApp. No existe forma de auto-enviar sin la API oficial de WhatsApp Business (requiere backend, verificación de negocio, plantillas pre-aprobadas y costo por mensaje), lo cual rompe el pilar "sin backend" del MVP. Decisión: se acepta el toque manual y se optimiza la UX para minimizar fricción (ver sección 9).

---

## 4. Deportes soportados (config, no user-generated)

```ts
interface SportConfig {
  id: string;             // "padel" | "tennis_singles" | "tennis_doubles" | "football_5" | "football_11"
  name: string;
  requiredPlayers: number;
}

const SPORTS: SportConfig[] = [
  { id: "padel",           name: "Padel",            requiredPlayers: 4 },
  { id: "tennis_singles",  name: "Tenis Singles",    requiredPlayers: 2 },
  { id: "tennis_doubles",  name: "Tenis Dobles",     requiredPlayers: 4 },
  { id: "football_5",      name: "Fútbol 5",         requiredPlayers: 5 },
  { id: "football_11",     name: "Fútbol 11",        requiredPlayers: 11 },
];
```
Debe ser trivial agregar un deporte nuevo agregando una entrada a este array (no debe requerir tocar lógica de negocio).

---

## 5. Modelo de datos

### Contact
```ts
interface Contact {
  id: string;
  name: string;
  phone: string;      // formato E.164, ej "+5491122334455"
  note?: string;       // texto libre opcional
  isMe: boolean;       // true solo para el contacto del organizador/dueño del device
}
```
- Debe existir siempre exactamente **un** Contact con `isMe: true`, creado en el onboarding inicial (primera vez que se abre la app).
- `isMe` no puede eliminarse ni duplicarse.

### Event
```ts
type EventStatus = "upcoming" | "completed" | "cancelled";

interface Event {
  id: string;
  sportId: string;                  // FK a SportConfig
  club: string;
  court?: string;
  date: string;                      // ISO date "YYYY-MM-DD"
  time: string;                      // "HH:mm"
  confirmedContactIds: string[];     // siempre incluye el Contact con isMe:true
  status: EventStatus;
  templateId?: string;               // si nació de un template
}
```
- **Vacantes = `sportConfig.requiredPlayers - confirmedContactIds.length`**. Este valor NUNCA se guarda; siempre se calcula on-the-fly. No debe existir un campo `vacancies` persistido.
- **"Cupo lleno" (vacantes = 0) NO es lo mismo que `status: "completed"`.** Cupo lleno es solo un indicador calculado — el partido puede seguir `"upcoming"` con cupo lleno, y volver a tener vacantes si alguien se baja después. `status` refleja únicamente la línea de tiempo del partido (se jugó o no), nunca la ocupación del roster.
- Un Event puede crearse ya con cupo lleno desde el principio (sin necesidad de armar ninguna Round) — es el caso normal de "ya tengo el partido armado".
- `"completed"` se marca **manualmente** por el organizador (botón "Marcar como jugado"), típicamente después de la fecha del partido. No hay transición automática por fecha/hora ni por cupo lleno.
- **Baja de un confirmado**: el organizador puede quitar a **cualquier** contacto confirmado —incluido `isMe`— de `confirmedContactIds` mediante la acción "Se baja" (confirmación simple, sin pedir motivo). Esto reabre vacantes inmediatamente, incluso si el Event ya tenía cupo lleno. Este es el disparador central del caso de uso de la app. Si el organizador se baja de su propio evento, puede "Sumarse" de nuevo más tarde (acción separada) mientras haya vacantes; no puede forzar su reingreso si el cupo ya se llenó con otra persona.
- **Aviso de vacante**: cuando un Event `upcoming` pasa de cupo lleno a con vacantes (por una baja), la app lo destaca en Home/Upcoming Events (ej. sube al tope de la lista + badge "Vacante abierta"). No hay notificaciones push reales — el MVP no tiene backend, así que el aviso solo aparece al abrir la app.

### Round
```ts
type RoundStatus = "pending" | "active" | "completed" | "skipped";

interface Round {
  id: string;
  eventId: string;
  order: number;              // 1, 2, 3...
  contactIds: string[];        // a quiénes se invita en esta ronda
  status: RoundStatus;
  messageTemplateId?: string; // template de mensaje sugerido para esta ronda
}
```
- **Por qué existen las Rounds**: no son lotes arbitrarios — representan niveles de prioridad. Ronda 1 = grupo ideal, Ronda 2 = backup, Ronda 3 = "cualquiera que pueda". El organizador reduce expectativas progresivamente a medida que no hay respuestas.
- Regla: **solo una Round puede estar `"active"` a la vez por Event.**
- El organizador avanza de ronda manualmente (botón "Pasar a Ronda N"), lo cual marca la ronda actual como `"completed"` (si hubo respuestas) o `"skipped"` (si se salta sin esperar), y activa la siguiente.
- Un contacto que ya fue invitado en cualquier Round de un Event **no puede volver a ser invitado** en otra Round del mismo Event (ver Reglas de negocio).
- **Invitación rápida (atajo, no una entidad nueva)**: para reemplazar una baja con un solo contacto ya decidido, la UI ofrece "Invitar directamente" — por debajo crea y activa una Round de un solo `contactId`, sin pasar por la pantalla de armado de ronda. Mismo modelo de datos, menos pasos.

### Invitation
```ts
type InvitationStatus = "not_invited" | "invited" | "accepted" | "declined" | "expired";

interface Invitation {
  id: string;
  roundId: string;
  contactId: string;
  status: InvitationStatus;
  invitedAt?: string;    // ISO timestamp
  respondedAt?: string;  // ISO timestamp
}
```
- Se crea una Invitation por cada `contactId` de una Round cuando esa Round pasa a `"active"`.
- Todos los cambios de estado son manuales (el organizador toca un botón por cada contacto: "Aceptó" / "Rechazó" / "Expiró").
- El organizador puede eliminar una invitación ya enviada por error (acción disponible en la UI, con confirmación).
- `expired` cubre dos casos distintos en la práctica: (a) timeout manual sin respuesta, y (b) "cupo cubierto" — el contacto aceptó pero el Event ya estaba completo cuando respondió (ver regla de negocio 7). No se agrega un status nuevo para distinguirlos; ambos significan "cerrado, no disponible para este Event".
- **Reabrir una invitación**: `declined` y `expired` no son terminales de por vida — el organizador puede tocar "Reabrir" y cambiar el status de una Invitation existente (ej. de vuelta a `accepted` si la persona en realidad puede venir, o a `invited` para reconsiderarla). Esto **edita la Invitation existente**, no crea una nueva — no entra en conflicto con "no doble invitación" (regla 2), porque no se agrega a otra Round.

### MessageTemplate
```ts
interface MessageTemplate {
  id: string;
  name: string;   // ej "Casual", "Urgente", "Formal"
  text: string;   // con placeholders: {sport}, {club}, {court}, {date}, {time}
}
```
- El organizador puede crear, editar y guardar varios templates de mensaje — cada uno con su propio tono (casual para la Ronda 1, más urgente para una Ronda 3, etc.).
- Al invitar (individualmente o en la cola de una Round), la app pre-llena el texto de WhatsApp con el template elegido (o un default razonable si no se eligió ninguno). El organizador puede editarlo libremente dentro de WhatsApp antes de tocar "Enviar".

### EventTemplate
```ts
interface EventTemplate {
  id: string;
  name: string;                          // ej "Padel jueves"
  sportId: string;
  club: string;
  court?: string;
  defaultConfirmedContactIds: string[];   // núcleo fijo, incluye isMe
  defaultRounds: { order: number; contactIds: string[] }[];
}
```
- Crear un Event desde un Template: copia todos los campos del template + pide solo `date` y `time` al usuario.
- Un template puede crearse desde cero, o "guardar como template" desde un Event ya armado.

---

## 6. Reglas de negocio

1. **Aceptación automática de cupo**: cuando una Invitation pasa a `accepted`, ese `contactId` se agrega a `confirmedContactIds` del Event.
2. **No doble invitación**: si un contacto ya tiene una Invitation en cualquier Round de un Event (en cualquier estado), no puede ser agregado a otra Round del mismo Event. La UI debe filtrarlo del picker de contactos al armar rondas subsiguientes.
3. **Invitaciones reabribles**: `declined` y `expired` ya no son definitivos — el organizador puede reabrir y editar el status de una Invitation existente en cualquier momento (ver Invitation). Esto no crea una Invitation nueva, así que no viola la regla 2.
4. **Organizador = jugador**: el Contact con `isMe: true` está siempre en `confirmedContactIds` desde la creación del Event; nunca es invitado a sí mismo ni aparece en pickers de invitación. **Revisado**: esto no lo hace irremovible — el organizador puede darse de baja de un Event puntual igual que cualquier confirmado (regla 9) y sumarse de nuevo si queda vacante (regla 10). Sigue sin poder ser invitado a sí mismo vía Round.
5. **Una ronda activa por vez**: no se puede activar una Round nueva mientras otra sigue `active` para el mismo Event; primero hay que completar/saltar la actual.
6. **Historial**: no es una entidad separada. Es la lista de Events con `status: "completed"` (o `"cancelled"`), consultable con sus Rounds/Invitations asociadas tal cual quedaron.
7. **Cupo cubierto (auto-lock contra overbooking)**: cuando las vacantes de un Event llegan a 0, el botón "Aceptó" se deshabilita para el resto de las invitations en estado `invited` (de cualquier Round, no solo la activa). En su lugar, la UI ofrece un botón "Cupo cubierto", que abre WhatsApp con un mensaje prellenado de cortesía (ej: *"La posición está cubierta, si se abre un hueco te aviso. Si no, la próxima."*). Al confirmar el envío (mismo patrón de la cola guiada), la Invitation pasa a `expired`.
8. **Cupo lleno ≠ completado**: vacantes en 0 es solo un estado calculado; no dispara ningún cambio de `status`. El Event sigue `upcoming` hasta que el organizador lo marca manualmente como `completed` ("Marcar como jugado").
9. **Baja de un confirmado reabre vacantes**: quitar un contacto de `confirmedContactIds` (acción "Se baja") es válido en cualquier momento mientras el Event sea `upcoming`, incluso con cupo lleno, y recalcula vacantes al instante. Aplica también a `isMe` (ver regla 4 revisada). Si el Event tenía cupo lleno, dispara el aviso de "Vacante abierta" en Home.
10. **Reingreso del organizador**: si `isMe` se dio de baja de un Event, puede "Sumarse" de nuevo mientras haya vacantes; bloqueado si el cupo ya se llenó con otra persona mientras tanto (mismo criterio que la regla 7).

---

## 7. Pantallas (MVP)

1. **Home** — dashboard/resumen: banner (espacio publicitario, mock por ahora, temático según el deporte del próximo evento), tarjeta del próximo partido (toca → Upcoming Events), rondas activas esperando respuesta, grilla de accesos rápidos al resto de las pantallas, y acceso a "Crear evento". *Revisado: Home dejó de mostrar la lista completa de eventos; eso es ahora la pantalla Upcoming Events.*
2. **Upcoming Events** — lista completa de eventos `upcoming`, con los que tienen una vacante recién abierta destacados arriba (badge "Vacante abierta") + acceso rápido a "Crear evento"
3. **Create Event** — desde cero o desde Template; puede crearse ya con cupo lleno
4. **Event Detail** — jugadores confirmados (con acción "Se baja" por jugador, incluido el organizador; "Sumarme" si el organizador se bajó), vacantes, rondas e invitations inline, atajo "Invitar directamente" a un contacto puntual, y botón manual "Marcar como jugado"
5. **Contacts** — lista simple de contactos (nombre, teléfono, nota)
6. **Templates** — crear/editar/usar templates de eventos recurrentes
7. **History** — eventos completados/cancelados
8. **Settings** — mínimo viable (editar el contacto `isMe`, administrar MessageTemplates, etc.)

*Nota: "Tags" e "Invitation Rounds" ya no son pantallas separadas — quedaron consolidadas dentro de Contacts y Event Detail respectivamente, según lo acordado.*

**Navegación**: menú de pestañas arriba (no abajo) — Inicio, Eventos, Contactos, Templates, Historial, Ajustes — siempre visible, junto al banner de marca.

---

## 8. Flujo principal end-to-end

1. Usuario crea Event (manual o desde Template) → especifica sport, club, cancha, fecha, hora, y confirma jugadores actuales (incluyéndose a sí mismo). El Event puede crearse ya con cupo lleno — no hace falta arrancar con vacantes.
2. Si hay vacantes, arma Round 1 seleccionando contactos desde su lista.
3. Toca "Activar Ronda 1" → se generan Invitations en estado `invited`.
4. Para cada contacto de la ronda activa, la app genera un mensaje de WhatsApp prellenado (según el MessageTemplate elegido) y abre el deep link (`wa.me`); el organizador confirma envío manualmente, uno por uno (cola de "siguiente contacto").
5. El organizador marca manualmente el estado de cada invitación a medida que recibe respuestas (Aceptó / Rechazó / Expiró).
6. Si acepta alguien y se cubren las vacantes → el Event queda con cupo lleno, pero sigue `upcoming` (no se completa solo; ver regla 8).
7. Si no se cubre con Round 1, el organizador arma y activa Round 2 con contactos nuevos (los ya invitados quedan excluidos del picker).

### Flujo reactivo (reemplazo de una baja) — el caso de uso central

1. El organizador abre un Event `upcoming` con cupo lleno y toca "Se baja" sobre el jugador confirmado que avisó que no puede ir.
2. Vacantes se recalculan al instante; el Event aparece destacado en Home con el badge "Vacante abierta".
3. El organizador elige: "Invitar directamente" a un contacto puntual, o armar/activar la siguiente Round disponible (1, 2, 3...) para tantear un grupo más amplio.
4. Continúa igual que el flujo principal desde el paso de envío de WhatsApp (pasos 4-7 arriba).

---

## 9. UX Principles

- Pocas pantallas, uso a una mano, todo en menos de 30 segundos.
- El organizador está apurado — priorizar velocidad sobre exhaustividad.
- Cola de envío de WhatsApp: flujo guiado uno-a-uno ("siguiente contacto"). Cada invitación requiere ~2 taps (abrir WhatsApp prellenado + tocar "Enviar" dentro de WhatsApp) — es el mínimo posible sin backend. La app avanza automáticamente al siguiente contacto tras la confirmación manual de envío.
- Mensajes personalizables: el organizador guarda varios MessageTemplates (tono casual, urgente, etc.) y elige cuál usar al invitar; siempre editable antes de enviar.

---

## 10. Roadmap futuro (NO implementar ahora — solo contexto)

- Sincronización de usuarios / cuentas / red social
- Perfiles propios por jugador, disponibilidad visible, aceptación en un tap
- Marketplace de jugadores cercanos (estilo Tinder para completar partidos)
- Recomendaciones inteligentes basadas en historial de aceptación, confiabilidad, distancia, nivel
- Tags/niveles estructurados, backup/export, detección automática de estado en WhatsApp

---

## 11. Decisiones ya cerradas (no reabrir sin motivo)

- Sin tags ni niveles estructurados en el MVP.
- Estados de Invitation: solo `not_invited | invited | accepted | declined | expired` (sin "seen"/"no response").
- Avance de ronda 100% manual, sin timers.
- Organizador es un Contact más (`isMe: true`), no un campo separado.
- No se permite crear una segunda Invitation para un contacto ya invitado en el mismo Event; reabrir una existente (regla 3) no cuenta como crear una nueva.
- Se puede eliminar una invitación enviada por error.
- Las Rounds representan niveles de prioridad (ideal → backup → cualquiera), no lotes arbitrarios; se mantienen con su máquina de estados completa (`pending`/`active`/`completed`/`skipped`).
- El envío de WhatsApp requiere un toque manual de "Enviar" dentro de WhatsApp — restricción de la plataforma (anti-spam), no un defecto de diseño. No se agrega backend ni WhatsApp Business API para automatizar esto en el MVP.
- Los Templates guardan `defaultRounds` (niveles de invitación por defecto), no solo el grupo confirmado fijo.
- Cuando las vacantes llegan a 0, no se pueden aceptar más invitaciones: el botón "Aceptó" se bloquea para el resto y se ofrece un mensaje de cortesía ("Cupo cubierto") vía WhatsApp que marca la Invitation como `expired`. Previene overbooking sin agregar un status nuevo.
- "Cupo lleno" (vacantes=0) y `status: "completed"` son conceptos separados. `completed` solo se marca manualmente ("Marcar como jugado"); no hay transición automática por fecha ni por cupo lleno.
- Quitar a un jugador confirmado ("Se baja") es una acción simple con solo confirmación, sin pedir motivo, y reabre vacantes al instante — incluso con el Event en cupo lleno.
- El aviso de "Vacante abierta" es solo un indicador in-app (badge, visible en Home y en Upcoming Events) — no hay push notifications reales en el MVP; eso requeriría backend, igual que el envío automático de WhatsApp.
- Existe un atajo de "Invitar directamente" a un contacto puntual (crea y activa una Round de un solo contacto por debajo), además del flujo completo de armar Rounds.
- `declined` y `expired` son reabribles: el organizador puede cambiar el status de una Invitation existente en cualquier momento (corrección de un toque erróneo, o alguien que estaba no disponible y ahora sí puede).
- Los mensajes de WhatsApp usan MessageTemplates guardados y editables por el organizador (con placeholders de sport/club/fecha/hora), no un texto fijo único — pueden variar por Round.
- **Revisado**: el organizador (`isMe`) puede darse de baja ("Se baja") de un Event puntual igual que cualquier confirmado, y "Sumarse" de nuevo si queda vacante. Ya no es irremovible — la única restricción que se mantiene es que nunca aparece en pickers de invitación ni se invita a sí mismo vía Round.
- **Revisado**: Home y Upcoming Events vuelven a ser pantallas separadas (como en la versión original de este documento, antes de fusionarlas por simplicidad). Home es ahora un dashboard (banner mock, próximo partido, rondas pendientes, accesos rápidos); Upcoming Events tiene la lista completa.
- La navegación de pestañas vive arriba de la pantalla (junto al banner de marca), no abajo — más fácil de encontrar.
- El banner publicitario en Home es un mock estático temático por deporte (padel/tenis/fútbol/genérico) — no hay integración real de anuncios ni tracking en el MVP.
