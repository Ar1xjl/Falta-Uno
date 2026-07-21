# FaltaUno!! — MVP Technical Handout
*Documento de referencia para implementación con Claude Code*

---

## 1. Visión

Aplicación mobile-first para organizadores de deportes amateur. No solo ayuda a conseguir reemplazos: ayuda a **organizar los eventos** (armar el partido, invitar, llevar el historial) y a **administrar los gastos** de esos eventos (cancha, pelotas, abonos mensuales, quién le debe a quién).

Caso de uso central:
> "Ya tengo el partido armado. Se bajó un jugador. Necesito reemplazo ya."

Caso de uso complementario (Fase 5/6):
> "Pagué el abono del mes / la cancha de hoy. ¿Cuánto me tiene que devolver cada uno?"

**No es una red social.** Es un organizador. Reduce mensajes, ahorra tiempo, automatiza el proceso de invitación y de la cuenta corriente del grupo.

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
  id: string;             // "padel" | "tennis_singles" | "tennis_doubles" | "football_5" | "football_11" | "golf"
  name: string;
  requiredPlayers: number;
  category: string;       // etiqueta gruesa para matchear con Contact.sports (ver más abajo)
}

const SPORTS: SportConfig[] = [
  { id: "padel",           name: "Padel",            requiredPlayers: 4,  category: "padel" },
  { id: "tennis_singles",  name: "Tenis Singles",    requiredPlayers: 2,  category: "tenis" },
  { id: "tennis_doubles",  name: "Tenis Dobles",     requiredPlayers: 4,  category: "tenis" },
  { id: "football_5",      name: "Fútbol 5",         requiredPlayers: 5,  category: "futbol" },
  { id: "football_11",     name: "Fútbol 11",        requiredPlayers: 11, category: "futbol" },
  { id: "golf",            name: "Golf",             requiredPlayers: 4,  category: "golf" },
];
```
Debe ser trivial agregar un deporte nuevo agregando una entrada a este array (no debe requerir tocar lógica de negocio).

`category` existe porque los tags de Contact son más gruesos que los formatos de evento: "Tenis Singles" y "Tenis Dobles" son ambos simplemente "Tenis" para el que juega. **Revisado** (ver sección 11): la app ya no está limitada a estos 5 deportes fijos — este array puede crecer (Golf ya se agregó); agregar deportes definidos por el usuario con su propio `requiredPlayers` queda como mejora futura, probablemente en Ajustes.

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
  sports?: string[];   // tags de deporte que juega: "padel" | "tenis" | "futbol" | "golf" (revisado, ver sección 11)
}
```
- Debe existir siempre exactamente **un** Contact con `isMe: true`, creado en el onboarding inicial (primera vez que se abre la app).
- `isMe` no puede eliminarse ni duplicarse.
- **Revisado**: `sports` es opcional y de multi-selección (un contacto puede jugar varios deportes). Un contacto sin tags cargados no queda oculto por los filtros de ronda — sólo se filtran los que tienen tags de *otro* deporte (ver regla 11 y sección de Rounds).

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
- **Revisado — filtro por deporte al armar ronda**: el picker de contactos elegibles ofrece un checkbox opcional "Sólo quienes juegan {deporte}" que filtra usando `Contact.sports` contra el `category` del deporte del Event. Apagado por defecto (no oculta nada a menos que el organizador lo active). Un contacto sin `sports` cargados nunca se oculta por este filtro — sólo se ocultan los que tienen tags de otro deporte distinto.

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

### Expense (Fase 6, revisado)
```ts
interface Expense {
  id: string;
  description: string;
  amount: number;
  paidByContactId: string;
  date: string;                 // ISO date
  eventId?: string;              // modo 1: gasto puntual (pelotas, cancha suelta) — se combina con splitContactIds
  splitContactIds?: string[];    // requerido si hay eventId (o si el Expense es suelto, sin eventId ni eventTemplateId)
  eventTemplateId?: string;      // modo 2: abono atado a una serie recurrente — se combina con coveredEventIds
  coveredEventIds?: string[];    // requerido si hay eventTemplateId: los N eventos que paga este abono
}
```
- **Modo 1 (gasto puntual)**: `eventId` + `splitContactIds`, split parejo (`amount / splitContactIds.length`) entre esos contactos — sin montos custom por persona.
- **Modo 2 (abono multi-evento)**: `eventTemplateId` + `coveredEventIds` (sin `splitContactIds`). El monto se divide entre los eventos cubiertos (`amount / N`), y la porción de cada evento se reparte entre los `confirmedContactIds` **reales de ese evento puntual**, calculado en el momento de mostrar el balance — no en el momento de cargar el gasto. Esto hace que un reemplazo a mitad de mes solo cargue los eventos que jugó, y quien pagó el abono se va acreditando evento a evento (ver regla 13).
- Un Expense puede además no estar atado a nada (gasto suelto, sin `eventId` ni `eventTemplateId`) — caso raro, cae en el balance "Gastos sueltos".
- Quien paga (`paidByContactId`) no tiene por qué estar en el split (puede adelantar plata sin compartir el gasto), aunque lo habitual es que sí esté.

### Settlement (Fase 5, revisado en Fase 6)
```ts
interface Settlement {
  id: string;
  groupKey: string;        // qué balance salda — ver "grupo de balance" en regla 11
  fromContactId: string;   // quien pagó
  toContactId: string;     // quien recibió
  amount: number;
  date: string;
}
```
- Registra que un pago manual ya ocurrió (fuera de la app — no hay integración real de Mercado Pago), para saldar balances con el tiempo. Sin esto, las deudas nunca se resolverían.
- `groupKey` ata el settlement a un grupo de balance específico (Fase 6) — saldar la deuda de Padel lunes nunca toca el balance de Padel viernes entre las mismas dos personas.

### Contact.paymentAlias (Fase 5)
- Campo de texto libre en Contact (`paymentAlias?: string`) para alias de MP, CVU o CBU — se muestra para copiar manualmente, nunca se valida ni se usa para ejecutar nada.

---

## 6. Reglas de negocio

1. **Aceptación automática de cupo**: cuando una Invitation pasa a `accepted`, ese `contactId` se agrega a `confirmedContactIds` del Event.
2. **No doble invitación**: si un contacto ya tiene una Invitation en cualquier Round de un Event (en cualquier estado), no puede ser agregado a otra Round del mismo Event. La UI debe filtrarlo del picker de contactos al armar rondas subsiguientes.
3. **Invitaciones reabribles**: `declined` y `expired` ya no son definitivos — el organizador puede reabrir y editar el status de una Invitation existente en cualquier momento (ver Invitation). Esto no crea una Invitation nueva, así que no viola la regla 2.
4. **Organizador = jugador**: el Contact con `isMe: true` está siempre en `confirmedContactIds` desde la creación del Event; nunca es invitado a sí mismo ni aparece en pickers de invitación. **Revisado**: esto no lo hace irremovible — el organizador puede darse de baja de un Event puntual igual que cualquier confirmado (regla 9) y sumarse de nuevo si queda vacante (regla 10). Sigue sin poder ser invitado a sí mismo vía Round.
5. **Una ronda activa por vez**: no se puede activar una Round nueva mientras otra sigue `active` para el mismo Event; primero hay que completar/saltar la actual.
6. **Historial**: no es una entidad separada. Es la lista de Events con `status: "completed"` o `"cancelled"`, **más** (Fase 7) cualquier Event `upcoming` cuya fecha ya pasó (ver regla 14) — consultable con sus Rounds/Invitations asociadas tal cual quedaron.
7. **Cupo cubierto (auto-lock contra overbooking)**: cuando las vacantes de un Event llegan a 0, el botón "Aceptó" se deshabilita para el resto de las invitations en estado `invited` (de cualquier Round, no solo la activa). En su lugar, la UI ofrece un botón "Cupo cubierto", que abre WhatsApp con un mensaje prellenado de cortesía (ej: *"La posición está cubierta, si se abre un hueco te aviso. Si no, la próxima."*). Al confirmar el envío (mismo patrón de la cola guiada), la Invitation pasa a `expired`.
8. **Cupo lleno ≠ completado**: vacantes en 0 es solo un estado calculado; no dispara ningún cambio de `status`. El Event sigue `upcoming` hasta que el organizador lo marca manualmente como `completed` ("Marcar como jugado") — o hasta que pasa la fecha (regla 14), lo que ocurra primero.
9. **Baja de un confirmado reabre vacantes**: quitar un contacto de `confirmedContactIds` (acción "Se baja") es válido en cualquier momento mientras el Event sea `upcoming`, incluso con cupo lleno, y recalcula vacantes al instante. Aplica también a `isMe` (ver regla 4 revisada). Si el Event tenía cupo lleno, dispara el aviso de "Vacante abierta" en Home.
10. **Reingreso del organizador**: si `isMe` se dio de baja de un Event, puede "Sumarse" de nuevo mientras haya vacantes; bloqueado si el cupo ya se llenó con otra persona mientras tanto (mismo criterio que la regla 7).
11. **Balance por grupo, no global (Fase 6, revisado)**: cada Expense pertenece a un "grupo de balance" (`getExpenseGroupKey`): si tiene `eventTemplateId`, el grupo es esa serie recurrente entera; si tiene `eventId` y ese Event pertenece a un Template, el grupo es igual la serie del Template (un gasto puntual de "Padel lunes" cae en la misma bolsa que el abono de "Padel lunes"); si el Event no tiene Template, el grupo es ese único Event; si no tiene ni Event ni Template, cae en el grupo "Gastos sueltos". El balance de cada contacto es un número neto **dentro de un grupo**, sumando los Expenses de ese grupo (paga: `+amount`, participa: `-share`) y los Settlements con el mismo `groupKey` (`fromContactId: +amount`, `toContactId: -amount`). Padel lunes y Padel viernes nunca se cruzan aunque compartan jugadores. Positivo = le deben; negativo = debe.
12. **Simplificación de deudas**: "Para saldar" usa el algoritmo greedy estándar (mismo que Splitwise), corrido sobre el balance de un solo grupo a la vez — empareja repetidamente al mayor acreedor con el mayor deudor hasta saldar todo, minimizando la cantidad de pagos sugeridos en vez de mostrar cada deuda cruzada individual.
13. **Prorrateo automático de abonos multi-evento (Fase 6)**: un Expense con `coveredEventIds` no fija su split al momento de cargarlo. Cada evento cubierto aporta `amount / N` al pool, repartido entre los `confirmedContactIds` de **ese evento en particular** en el momento de calcular el balance. Si a mitad de mes alguien se baja y entra un reemplazo, el reemplazo solo carga la porción de los eventos donde quedó confirmado, y quien pagó el abono se va "cobrando" evento a evento a medida que el balance se recalcula. Ningún saldo se resetea automáticamente por mes ni por ningún otro período — una deuda queda pendiente hasta que se registre un Settlement manual, sin importar cuánto tiempo pase (ver regla 11).
14. **Paso automático a Historial por fecha vencida**: un Event `upcoming` cuya `date` ya pasó (comparación pura por fecha, sin hora) deja de aparecer en Home/Upcoming Events y en el contador de alertas del nav, y aparece automáticamente en Historial con badge "Pasado" — sin que el organizador tenga que tocar nada. Es puramente una vista derivada (`isPastEvent` en `selectors.ts`): el `status` en el dato sigue siendo `upcoming` a menos que el organizador lo marque manualmente como `completed`/`cancelled`; si lo hace después, el badge pasa a "Jugado"/"Cancelado" con normalidad.
15. **Balance total vs. balance por bucket**: además del balance por grupo (regla 11), la pantalla de Gastos ofrece un nivel "Totales" que suma el balance de cada contacto a través de **todos** los buckets combinados — útil como panorama rápido, pero deliberadamente sin sugerencias "Para saldar" ni "Marcar como pagado": dos deudas cruzadas en sentido contrario en buckets distintos (ej. Tomi le debe a Juan por Golf, Juan le debe a Tomi por las pelotas de Padel) pueden anularse entre sí en la vista total y ocultar que en realidad son dos deudas reales e independientes. Para saldar de verdad hay que entrar a un bucket puntual.

---

## 7. Pantallas (MVP)

1. **Home** — dashboard/resumen: banner (espacio publicitario, mock por ahora, temático según el deporte del próximo evento), tarjeta del próximo partido (toca → Upcoming Events), rondas activas esperando respuesta, grilla de accesos rápidos al resto de las pantallas, y acceso a "Crear evento". *Revisado: Home dejó de mostrar la lista completa de eventos; eso es ahora la pantalla Upcoming Events.*
2. **Upcoming Events** — lista completa de eventos `upcoming`, con los que tienen una vacante recién abierta destacados arriba (badge "Vacante abierta") + acceso rápido a "Crear evento"
3. **Create Event** — desde cero o desde Template; puede crearse ya con cupo lleno
4. **Event Detail** — jugadores confirmados (con acción "Se baja" por jugador, incluido el organizador; "Sumarme" si el organizador se bajó), vacantes, rondas e invitations inline, atajo "Invitar directamente" a un contacto puntual, botón manual "Marcar como jugado", (revisado) "Agendar (+recordatorio)" / "Cómo llegar" para eventos `upcoming`, y (Fase 5) atajo "Agregar gasto" pre-cargando a los confirmados del Event
5. **Contacts** — lista simple de contactos (nombre, teléfono, nota, tags de deporte, y (Fase 5) alias/CVU/CBU), ordenada alfabéticamente. **Importar/Exportar** vive detrás de un solo botón "Importar" en el header (mismo estilo que "+ Agregar", con estado presionado mientras el panel está abierto) que despliega un panel con pestañas. **Exportar contactos**: incluye por defecto al organizador (`isMe`, mostrado como "(vos)") además de los demás contactos — así el amigo que recibe el archivo también puede agendar a quien se lo mandó; checkbox "Seleccionar todos" (patrón estándar, no dos links de texto) + buscador que filtra la lista por nombre sin perder la selección de los contactos ocultos por el filtro + chips por tag de deporte (agregan a la selección a quienes tengan ese tag). Genera un único .vcf con los contactos elegidos y lo comparte vía el share sheet nativo (WhatsApp incluido) en navegadores que soportan `navigator.share` con archivos (Android Chrome, iOS Safari 15+), o lo descarga para adjuntar manualmente en el resto — mismo formato vCard que ya acepta el importador, así que un amigo puede recibirlo por WhatsApp e importarlo de una. El archivo compartido usa MIME `text/plain` a propósito, no `text/vcard`: WhatsApp/Android especial-casean el MIME de vCard y descomponen un .vcf con varios contactos en tarjetas de "Contacto" independientes en vez de mandarlo como un solo adjunto — con `text/plain` llega como un único archivo, igual que al descargarlo y adjuntarlo a mano. El "¿Cómo hago esto?" de Exportar vive arriba de todo (justo debajo del toggle Importar/Exportar), no al final del panel. `shareOrDownloadVCard` arma además un mensaje fijo con instrucciones paso a paso para quien lo recibe (`buildExportMessage` en `src/lib/vcard.ts`: descargar el archivo, entrar a la URL de la app, Contactos → Importar → Elegir archivo) — va como `text` del `navigator.share` cuando se comparte directo, y si cae al fallback de descarga se copia al portapapeles para pegarlo a mano junto con el archivo.
6. **Templates** — crear/editar/usar templates de eventos recurrentes; (Fase 5) atajo "Agregar gasto (abono)" pre-cargando al núcleo fijo del Template
7. **History** — eventos completados/cancelados, más los `upcoming` cuya fecha ya pasó (badge "Pasado", regla 14)
8. **Settings** — mínimo viable (editar el contacto `isMe`, administrar MessageTemplates, etc.)
9. **Gastos (Fase 5, revisado en Fase 6 y 7)** — accesible desde la grilla de accesos rápidos de Home, no desde el nav de arriba (ya lleno). Si hay más de un bucket cargado, arranca en el nivel "Totales" (colapsado, con flechita para expandir y elegir un bucket puntual — mismo patrón de acordeón que el picker de participantes en `NewExpense`); si solo hay un bucket, lo muestra directo sin el nivel de totales. Dos vistas: **Gastos** (lista de Expenses del bucket elegido o de todos si es "Totales", con un total en pesos arriba, y borrar) y **Balances** (balance neto por contacto; en el nivel "Totales" es de solo lectura — sin sugerencias "Para saldar" ni "Marcar como pagado", regla 15 — y solo aparecen al entrar a un bucket puntual). "+ Nuevo gasto" abre un form itemizado (`NewExpense`, Fase 6) que acepta `?eventId=` o `?templateId=` por query param: con `eventId`, se cargan varias líneas (descripción/monto/quién pagó) que comparten los mismos participantes (con un colapsable "¿Entre quiénes se divide?" que arranca cerrado, precargado con los confirmados del evento), pensado para "cancha + pelotas + snacks" con distinto pagador cada uno; con `templateId`, cada envío pide además "¿a cuántos eventos alcanza?" y arma un abono con prorrateo automático (regla 13) en vez de participantes fijos. El form tiene Cancelar y Guardar lado a lado.

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

- **Revisado**: los tags de deporte en Contact ya no están fuera de alcance — se agregaron como `Contact.sports` (multi-select: Padel/Tenis/Futbol/Golf) para poder filtrar el picker de rondas por deporte. Sin niveles de habilidad ni otros campos estructurados por ahora — eso sigue fuera del MVP.
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
- **Revisado — recordatorios sin backend**: "Agendar (+recordatorio)" genera un archivo `.ics` descargable (evento + `VALARM` disparando 1h antes) que el organizador agrega a su calendario nativo (Google/Apple Calendar). El recordatorio lo dispara el propio calendario del sistema operativo, no la app — evita por completo la limitación de push notifications en PWA/iOS que ya se había descartado para otras features. La duración del evento es un default por categoría de deporte (90 min padel/tenis/fútbol, 240 min golf), no configurable en el MVP.
- **Revisado — "Cómo llegar"**: abre Google Maps con el nombre del club como búsqueda (`https://www.google.com/maps/search/?api=1&query=...`), sin geocoding propio ni cálculo de tiempo de viaje real — el MVP no pide la dirección exacta del club, así que no hay con qué calcular una ETA precisa.
- **Revisado — badge de alertas**: la pestaña Inicio muestra un badge rojo con la cantidad de eventos `upcoming` que tienen una ronda activa con invitaciones todavía sin respuesta (mismo criterio que la sección "Rondas esperando respuesta" de Home). No es "personalizable" en el sentido de preferencias configurables por el usuario — simplemente refleja el estado real de sus datos. Vacantes abiertas por sí solas no generan badge (son el estado normal hasta completar el cupo); solo cuenta lo que requiere una acción concreta (revisar respuestas).
- **Fase 5 — gastos y balances, alcance cerrado**: split siempre parejo (sin montos custom por persona); sin integración real de Mercado Pago ni ejecución de pagos — solo tracking, cálculo de balance y sugerencia de "quién le paga a quién" (algoritmo greedy tipo Splitwise). El alias/CVU/CBU es un campo de texto libre sin validar, y nunca se muestra en "Tu perfil" (Ajustes) — solo por contacto, pensando en que el día de mañana cada jugador tenga su propia instancia de la app con su propio alias. "Gastos" vive en la grilla de accesos rápidos de Home, no en el nav de arriba (ya con 6 pestañas).
- **Fase 6 — gastos multi-evento y balance por serie, alcance cerrado**: el balance ya NO es global por contacto — está scopeado por grupo (serie recurrente o evento suelto, regla 11), y nunca se resetea automáticamente por período (los saldos pendientes se arrastran hasta que se registre un Settlement manual, regla 13). Un abono que "alcanza" a N eventos prorratea automáticamente según el roster real de cada evento cubierto, no según el grupo fijo del día que se cargó el gasto — así un reemplazo a mitad de mes solo paga lo que jugó. Carga itemizada: un solo "Agregar gasto" puede cargar varias líneas con pagadores distintos en un solo envío.
