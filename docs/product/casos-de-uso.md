# Casos de uso para validar el schema

Este documento reúne casos de uso concretos del dominio de Clini, derivados de la
visión, el roadmap y el modelo de multi-tenancy. Su propósito **no** es especificar
la implementación, sino servir como banco de validación: cada caso ejercita
entidades, relaciones, cardinalidades e invariantes que un schema correcto debe
soportar. Un diseño de base de datos es válido si permite representar y resolver
todos estos casos sin contradicciones ni duplicación de la verdad.

Alcance: MVP de agenda (agenda, reserva online, disponibilidad, cancelaciones,
reprogramaciones, carga manual, recordatorios), más las tensiones estructurales que
introducen el multi-tenancy y los pacientes globales. Se marcan como **[Futuro]** los
casos que no son MVP pero que el schema no debería volver imposibles.

Convenciones:

- **Actor**: quién inicia el caso.
- **Precondición**: estado previo necesario.
- **Flujo**: pasos relevantes.
- **Invariantes / lo que el schema debe soportar**: la razón por la que el caso existe.

---

## 1. Organizaciones y membresías

### CU-01 · Crear una organización con su primer profesional

- **Actor**: profesional independiente que se registra.
- **Precondición**: existe un `User` recién registrado.
- **Flujo**: el usuario crea una organización (consultorio) y queda vinculado a ella.
- **Invariantes**:
  - Un `User` puede existir sin pertenecer todavía a ninguna organización, o
    quedar vinculado en el mismo acto de creación.
  - Toda organización tiene al menos un miembro con capacidad administrativa.

### CU-02 · Un profesional pertenece a varias organizaciones

- **Actor**: profesional que trabaja en dos consultorios distintos.
- **Precondición**: existen dos organizaciones independientes.
- **Flujo**: el mismo `User` es miembro de la organización A y de la B.
- **Invariantes**:
  - La relación `User ↔ Organization` es muchos-a-muchos, mediada por `Membership`.
  - Cambiar datos de la membresía en A (rol, estado) no afecta la de B.
  - No debe existir información de agenda/disponibilidad que asuma un único
    consultorio por profesional.

### CU-03 · Una organización tiene varios profesionales

- **Actor**: dueño de un consultorio con 3 profesionales.
- **Flujo**: se invita/agrega a otros usuarios como miembros.
- **Invariantes**:
  - `Organization ↔ User` es muchos-a-muchos.
  - Cada profesional dentro de la organización tiene su propia agenda (ver CU-10).

### CU-04 · Roles y permisos dentro de una organización

- **Actor**: dueño que agrega una secretaria/recepcionista.
- **Flujo**: un miembro puede ser profesional (atiende), personal administrativo (gestiona
  turnos pero no atiende), o dueño/administrador.
- **Invariantes**:
  - El rol es un atributo de la **membresía**, no del usuario global: el mismo `User`
    puede ser dueño en A y profesional sin permisos administrativos en B.
  - Un miembro administrativo que no atiende **no** debería requerir una agenda propia.
  - El schema debe distinguir "es miembro" de "es profesional que atiende".

### CU-05 · Suspender/quitar un miembro sin perder su historial

- **Actor**: dueño que da de baja a un profesional que dejó el consultorio.
- **Flujo**: el miembro se desactiva; sus turnos pasados siguen existiendo.
- **Invariantes**:
  - Los turnos históricos referencian al profesional aunque su membresía esté inactiva.
  - Borrar/desactivar una membresía no debe cascadear el borrado de turnos pasados.

---

## 2. Pacientes (entidades globales)

### CU-06 · Un paciente es global, atendido en dos consultorios

- **Actor**: paciente que se atiende con el profesional X en el consultorio A y con el
  profesional Y en el consultorio B.
- **Invariantes**:
  - El `Patient` es una entidad única, **no** duplicada por organización.
  - Los turnos del paciente en A y en B son distinguibles por organización.
  - Ninguna FK de `Patient` cuelga de `Organization` (contra-ejemplo a evitar).

### CU-07 · Datos de paciente compartidos vs. datos por organización

- **Actor**: recepcionista de A que edita el teléfono del paciente.
- **Tensión de diseño**: ¿qué datos del paciente son globales (identidad, nombre,
  documento) y cuáles podrían variar por relación con la organización?
- **Invariantes**:
  - La identidad del paciente (documento/identificador) es global y única.
  - La **historia clínica** se modela por organización (aún no en el MVP), por lo que el
    schema no debe atar clínica global al paciente global.
  - Debe poder representarse la relación "este paciente es paciente de esta organización"
    de forma explícita, sin depender solo de la existencia de turnos.
- **Decisión de schema**: el paciente **no** pertenece a una organización. La actividad por
  organización se reconstruye de `appointments.organization_id`; `patients.created_by` es
  solo traza de auditoría de quién creó la ficha, no scoping. La relación explícita queda
  diferida (si hace falta, se agrega un pivote más adelante sin rediseño destructivo).

### CU-08 · Paciente sin cuenta de usuario

- **Actor**: recepcionista que carga un paciente que nunca usó el sistema.
- **Invariantes**:
  - Un `Patient` puede existir sin un `User` asociado (carga manual).
  - **[Futuro]** Un paciente podría, más adelante, vincularse a una cuenta para reservar
    online; el schema no debe forzar hoy una relación 1:1 obligatoria `Patient ↔ User`.

### CU-09 · Dos pacientes con el mismo nombre

- **Actor**: recepcionista.
- **Invariantes**:
  - El nombre no es identificador. La identidad se apoya en el **documento = (tipo +
    número)**, con **DNI por defecto**, único a nivel global de paciente, no en el nombre.

---

## 3. Agendas y disponibilidad

### CU-10 · Cada profesional tiene una agenda por organización

- **Actor**: profesional que trabaja en A y en B con horarios distintos.
- **Invariantes**:
  - La agenda/disponibilidad se define por la combinación (profesional, organización),
    no solo por el profesional.
  - Los horarios de A no se filtran a la vista/booking de B.

### CU-11 · Disponibilidad semanal recurrente

- **Actor**: profesional que atiende Lun/Mié/Vie de 9 a 13 y de 15 a 19.
- **Invariantes**:
  - El schema representa reglas de disponibilidad recurrentes por día de semana con uno o
    varios bloques horarios (no un único rango continuo).
  - La duración del turno / granularidad de los slots es configurable (ver CU-14).

### CU-12 · Excepciones puntuales sobre la disponibilidad

- **Actor**: profesional que un jueves específico atiende fuera de su horario habitual, o
  bloquea la tarde del viernes por un motivo personal.
- **Invariantes**:
  - Deben poder representarse excepciones a fecha concreta que **suman** disponibilidad y
    excepciones que la **restan** (bloqueos), por encima de la regla recurrente.
  - Un bloqueo no debe borrar la regla recurrente subyacente.

### CU-13 · Feriados y cierres del consultorio

- **Actor**: dueño que marca un feriado nacional en el que nadie atiende.
- **Invariantes**:
  - Debe poder expresarse indisponibilidad a nivel organización (afecta a todos los
    profesionales) además de a nivel profesional.

### CU-14 · Duración de turno según la prestación

- **Actor**: profesional cuya "primera consulta" dura 45 min y el "control" 20 min.
- **Invariantes**:
  - La grilla de slots no puede asumir una duración fija global: la duración depende de la
    prestación (ver CU-16) y/o de la configuración de la agenda.

---

## 4. Prestaciones (servicios)

### CU-15 · Catálogo de prestaciones por organización

- **Actor**: dueño que define las prestaciones que se ofrecen.
- **Invariantes**:
  - Las prestaciones pertenecen a la organización (o al profesional dentro de ella), no son
    globales.
  - Una prestación tiene al menos: nombre, duración y, opcionalmente, precio.

### CU-16 · Un profesional ofrece un subconjunto de prestaciones

- **Actor**: consultorio con dos profesionales; solo uno hace "ecografía".
- **Invariantes**:
  - La relación profesional ↔ prestación es muchos-a-muchos dentro de la organización.
  - El booking online solo debe ofrecer prestaciones que ese profesional realmente presta.

### CU-17 · Precio opcional y a futuro cobrable

- **[Futuro]** El precio de una prestación puede no estar cargado (MVP: solo agenda).
- **Invariantes**:
  - El precio es opcional/nullable y su ausencia es un estado válido, no un error.

---

## 5. Turnos (appointments)

### CU-18 · Carga manual de un turno por la recepcionista

- **Actor**: recepcionista que agenda a un paciente por teléfono.
- **Flujo**: elige profesional, prestación, fecha/hora y paciente; se crea el turno.
- **Invariantes**:
  - Un turno referencia: organización, profesional, paciente, prestación, fecha/hora
    inicio y duración (derivable de la prestación o explícita).
  - El origen del turno (manual vs. online) es un dato del turno.

### CU-19 · Reserva online por el paciente

- **Actor**: paciente en la página pública de reservas.
- **Flujo**: ve slots libres del profesional para una prestación y reserva uno.
- **Invariantes**:
  - Los slots ofrecidos derivan de: disponibilidad (CU-11/12/13) menos turnos ya ocupados.
  - La reserva online produce el mismo tipo de `Appointment` que la carga manual, con
    distinto origen.

### CU-20 · No se permite doble reserva del mismo slot (solapamiento)

- **Actor**: dos pacientes intentan el mismo horario con el mismo profesional.
- **Invariantes** (crítico para el schema):
  - No pueden coexistir dos turnos **activos** que se solapen para el mismo profesional en
    la misma organización.
  - El schema debe permitir imponer esta exclusión (constraint/índice o al menos los datos
    necesarios: profesional, rango temporal y estado que la haga verificable).
  - Un turno **cancelado** libera el slot y no debe contar para el solapamiento.
- **Decisión de schema**: la exclusión **no** se impone con un constraint de base; se controla
  en la Action de reserva dentro de una transacción con lock. El schema conserva profesional,
  rango temporal y estado para hacerla verificable. Estados que liberan el slot: `cancelled` y
  `rescheduled`. Ver [ADR 0004](../adr/0004-exclusion-de-solapamiento-en-la-action.md).

### CU-21 · Ciclo de estados de un turno

- **Actor**: sistema/recepcionista.
- **Estados relevantes**: reservado → confirmado → atendido; y desvíos: cancelado,
  ausente (no-show).
- **Invariantes**:
  - El estado es un atributo del turno con un conjunto acotado de valores (enum).
  - Las transiciones de estado deben ser reconstruibles: al menos se conoce el estado
    actual; idealmente hay marcas temporales de los eventos clave (confirmado_en,
    cancelado_en).

### CU-22 · Turno para un paciente no registrado como usuario

- Ver CU-08: el turno referencia a un `Patient` que no tiene `User`.

### CU-23 · Turno solapado entre organizaciones del mismo profesional

- **Actor**: profesional que atiende en A y en B.
- **Tensión de diseño**: ¿un turno a las 10:00 en A impide uno a las 10:00 en B para el
  mismo profesional?
- **Invariantes**:
  - El schema debe permitir **detectar** solapamientos del mismo profesional aun cuando los
    turnos pertenezcan a organizaciones distintas (la exclusión de CU-20 no puede ser
    puramente intra-organización si se quiere respetar el tiempo físico del profesional).
  - Como mínimo, la consulta "todos los turnos de este profesional en este rango horario,
    en todas sus organizaciones" debe ser expresable.

---

## 6. Cancelaciones y reprogramaciones

### CU-24 · Cancelación de un turno

- **Actor**: paciente o recepcionista.
- **Invariantes**:
  - Cancelar no borra el turno: cambia su estado y conserva el registro (para métricas de
    ausentismo/cancelación futuras).
  - Debe registrarse quién/cuándo canceló (auditoría mínima).

### CU-25 · Reprogramación (mover un turno)

- **Actor**: recepcionista que mueve un turno a otra fecha/hora.
- **Tensión de diseño**: ¿se edita el mismo registro o se crea uno nuevo enlazado al
  anterior?
- **Invariantes**:
  - Debe poder reconstruirse que un turno fue reprogramado desde otro (trazabilidad de la
    reprogramación), sin perder el horario original si el negocio lo requiere para métricas.
  - El turno original queda en estado **Reprogramado** y enlaza al turno nuevo; el nuevo
    slot arranca en el estado inicial que corresponda (ver CU-41).
  - La reprogramación respeta las mismas reglas de solapamiento (CU-20) sobre el nuevo slot.

### CU-26 · Política de anticipación para cancelar/reprogramar online

- **[Futuro / regla de negocio]** El paciente solo puede cancelar online hasta X horas
  antes.
- **Invariantes**:
  - El schema necesita la marca temporal del turno y su creación para poder evaluar reglas
    de anticipación; la política en sí puede vivir en configuración por organización.

---

## 7. Recordatorios y notificaciones

### CU-27 · Recordatorio automático al paciente antes del turno

- **Actor**: sistema.
- **Invariantes**:
  - Debe poder representarse que un turno **tiene** uno o más recordatorios programados y
    saber si ya se enviaron (para no reenviar).
  - El sistema de notificaciones es desacoplado y basado en eventos (AppointmentBooked →
    Notification → canales), por lo que el schema no debe atar la notificación a un único
    canal.

### CU-28 · Múltiples canales por notificación

- **Actor**: sistema que envía email + push (y a futuro WhatsApp/SMS).
- **Invariantes**:
  - Un mismo evento de dominio puede derivar en envíos por varios canales; el estado de
    envío se registra por canal, no una sola vez por evento.
  - Agregar un canal nuevo no debe requerir cambiar la estructura de los turnos.

### CU-29 · Notificaciones al profesional

- **Actor**: sistema (nuevo turno, cancelación, confirmación, próxima consulta).
- **Invariantes**:
  - El destinatario de una notificación puede ser un `User` (profesional) o un `Patient`;
    el schema debe soportar ambos tipos de destinatario.
- **Decisión de schema**: diferido a un módulo de notificaciones desacoplado por eventos. La
  tabla `reminders` del MVP cubre el recordatorio de turno al paciente; el destinatario
  polimórfico (`User`/`Patient`) se agrega en ese módulo sin rediseño destructivo.

---

## 8. Suscripción y cobros [Futuro, pero estructural]

### CU-30 · Suscripción SaaS de la organización (Mercado Pago)

- **[Futuro — fase siguiente, prioritaria]** La organización paga una suscripción.
- **Invariantes**:
  - La suscripción se asocia a la **organización**, no al usuario.
  - El schema del MVP no debería contradecir la incorporación posterior de suscripción y
    estado de pago por organización.

### CU-31 · Cobro de consultas, opcional por profesional

- **[Futuro]** Un profesional puede activar el cobro de la consulta; otro no.
- **Invariantes**:
  - La activación de cobro es una configuración a nivel (profesional, organización) o
    membresía, no global del usuario.

---

## 9. Integridad multi-tenant (transversal)

### CU-32 · Aislamiento entre organizaciones

- **Actor**: recepcionista de A.
- **Invariantes** (crítico):
  - Toda entidad con dueño organizacional (turnos, prestaciones, disponibilidad, agendas)
    porta `organization_id` y es filtrable por él.
  - No debe ser posible construir una consulta natural que devuelva turnos de B mientras se
    opera en A por el simple hecho de compartir profesional o paciente.

### CU-33 · Consistencia referencial cruzada

- **Actor**: sistema.
- **Invariantes**:
  - Un turno solo puede referenciar una prestación que exista en **su** organización.
  - Un turno solo puede asignarse a un profesional que sea **miembro activo** de esa
    organización al momento de crearse.
  - El schema debe hacer verificables (por constraint o por datos suficientes) estas
    coherencias cruzadas organización↔prestación↔profesional.

---

---

## 10. Reserva online — grilla de slots (detalle)

> Módulo derivado del mock `clini-reserva`: flujo público en pasos
> Especialidad → Profesional → Prestación → Día/Horario → Datos → Confirmación.

### CU-34 · Cascada especialidad → profesional → prestación

- **Actor**: paciente en la reserva pública.
- **Flujo**: elige una **especialidad** (Clínica médica, Cardiología, Nutrición…),
  luego un **profesional** de esa especialidad, luego una **prestación** que ese
  profesional ofrece.
- **Invariantes**:
  - La **especialidad** es un concepto de primer nivel, distinto de la prestación: en el
    mock cada profesional tiene una especialidad y el filtro inicial es por especialidad.
  - El schema debe permitir resolver "profesionales de la especialidad X en la
    organización Y" y luego "prestaciones que ese profesional presta" (ver CU-16).
  - Filtrar por especialidad no debe depender de inferirla desde las prestaciones.

### CU-35 · Generación de la grilla de slots

- **Actor**: sistema, al mostrar horarios disponibles.
- **Flujo**: dado (profesional, prestación, día), se calcula la lista de horarios libres.
- **Invariantes** (crítico):
  - Slots = disponibilidad del profesional ese día (franjas recurrentes + excepciones −
    feriados) **menos** los turnos activos que se solapan, **menos** el pasado.
  - La granularidad/paso de la grilla depende de la **duración de la prestación**
    (CU-14): la misma agenda produce grillas distintas para "Control" (30 min) y
    "Primera vez" (45 min).
  - Un slot ofrecido debe seguir siendo válido al confirmar (revalidar, ver CU-36).
  - El schema debe contener todo lo necesario para computar esto sin datos derivados
    precalculados que puedan quedar inconsistentes.

### CU-36 · Concurrencia: dos pacientes toman el último slot

- **Actor**: dos pacientes reservan el mismo horario casi simultáneamente.
- **Invariantes**:
  - La reserva debe ser atómica: solo uno gana; el otro recibe "ese horario ya no está
    disponible".
  - El schema debe soportar la exclusión de solapamiento (CU-20) **a nivel de escritura**
    (constraint/índice de exclusión o control transaccional), no solo al pintar la grilla.
- **Decisión de schema**: se resuelve con **control transaccional** (transacción + lock en la
  Action de reserva), no con exclusion constraint de base. Ver la decisión de CU-20.

### CU-37 · Identidad del paciente por documento (selector de tipo)

- **Actor**: recepcionista o paciente que da de alta / reserva.
- **Decisión**: la identidad del paciente es el **documento = (tipo de documento, número)**.
  El tipo tiene **DNI por defecto** y opciones alternativas (pasaporte, n° de afiliado de
  obra social, extensible a futuro).
- **Invariantes**:
  - El documento es obligatorio y **único por el par (tipo, número)** a nivel global de
    paciente (no por organización — CU-06). No basta con que el número sea único: el mismo
    número puede existir en tipos distintos.
  - El **tipo de documento es un enum extensible**: agregar un tipo nuevo no cambia la
    estructura de `Patient`.
  - Al cargar o reservar, un documento ya existente **reutiliza** el paciente en vez de
    duplicarlo (dedup); solo se completan datos de contacto faltantes.
  - El schema no necesita pacientes "parciales": el documento está siempre presente.
- **Nota de diseño**: el n° de afiliado es una clave menos estable que el DNI/pasaporte (una
  persona puede cambiar de obra social o tener varias). Se admite como tipo de documento,
  pero conviene preferir DNI/pasaporte como identidad primaria cuando exista.

### CU-38 · Ventana de reserva (anticipación)

- **Actor**: paciente.
- **Invariantes**:
  - No se puede reservar en el pasado ni fuera de la disponibilidad publicada.
  - Las reglas de anticipación mínima/máxima (p. ej. no reservar con menos de X horas)
    necesitan la marca temporal del slot; la política vive en configuración por
    organización o profesional (ver CU-26).

---

## 11. Agenda del panel — detalle

> Módulo derivado del mock `clini-app`: pantallas hoy / agenda semanal / día / nuevo /
> disponibilidad / pacientes.

### CU-39 · Vista día multi-profesional y vista semana

- **Actor**: recepcionista/profesional.
- **Flujo**: la vista "día" muestra columnas por profesional; la "semana" agrega turnos
  por día.
- **Invariantes**:
  - Consultar "todos los turnos de la organización en un rango, agrupables por profesional
    y por día" debe ser directo (índices por organización + fecha + profesional).

### CU-40 · Crear turno desde un hueco libre

- **Actor**: recepcionista que hace clic en un hueco de la grilla.
- **Invariantes**:
  - El alta rápida prellena profesional + fecha + hora desde el contexto; el turno
    resultante es idéntico al de carga manual completa (origen manual).

### CU-41 · Check-in y ciclo de atención

- **Actor**: recepcionista/profesional durante la jornada.
- **Flujo**: el turno pasa por **Pendiente → Confirmado → Llegó → Atendido**, con desvíos
  **Ausente**, **Cancelado** y **Reprogramado** (los seis primeros están en el mock;
  Reprogramado se agrega por decisión, ver CU-25).
- **Invariantes** (ajusta CU-21):
  - El enum de estado tiene **siete** valores: estado inicial **Pendiente**, check-in
    **Llegó** (sala de espera), más Confirmado, Atendido, Ausente, Cancelado y
    **Reprogramado** (el original de una reprogramación).
  - Deben poder registrarse las marcas temporales de las transiciones clave para métricas
    de ausentismo y tiempos de espera a futuro.

### CU-42 · Identidad visual por profesional

- **Actor**: sistema.
- **Invariantes**:
  - Cada profesional tiene, dentro de la organización, atributos de presentación (color,
    iniciales, nombre corto) usados por la agenda. Son datos del vínculo
    profesional↔organización, no globales del `User`.
- **Decisión de schema**: diferido. Al implementarlo, la presentación debe poder definirse a
  **nivel organización** y a **nivel profesional** (membresía); el MVP no agrega estas columnas
  todavía.

---

## 12. Especialidades e historia clínica (surgidos de los mocks)

### CU-43 · Especialidad del profesional

- **Actor**: dueño que da de alta un profesional con su especialidad.
- **Invariantes**:
  - La especialidad es un atributo del profesional **dentro de la organización** (vía
    membresía): el mismo `User` podría ejercer especialidades/roles distintos en cada
    consultorio.
  - Un catálogo de especialidades (compartido o por organización) debe poder crecer sin
    tocar la estructura de profesionales.

### CU-44 · Marca y URL pública de la organización

- **Actor**: paciente que entra a `clini.ar/consultorio-belgrano`.
- **Invariantes**:
  - La organización tiene un **identificador público estable y único** (slug) para su
    página de reservas, además de su nombre visible.
  - El slug es único a nivel global (no puede colisionar entre organizaciones).

### CU-45 · Historia clínica por notas *(Futuro, pero visible en el mock)*

- **Actor**: profesional que agrega una nota clínica a una visita del paciente.
- **Invariantes**:
  - Una nota clínica está asociada a una **visita/turno**, a un **profesional autor** y a
    una **organización**; no es un dato global del paciente (coherente con CU-07).
  - El schema del MVP no debe imposibilitar esta relación nota↔turno↔profesional↔organización.

### CU-46 · Métricas por paciente (alcance)

- **Actor**: recepcionista que ve "N visitas · próximo turno" de un paciente.
- **Invariantes** (tensión de diseño):
  - "Cantidad de visitas" y "próximo turno" son derivables de los turnos; hay que decidir
    si se cuentan **por organización** o **globalmente** para el paciente global (CU-06).
  - El schema no debe fijar prematuramente un contador materializado que impida elegir el
    alcance después.

---

## 13. Cobertura del sistema viejo (clini archivado)

> Casos derivados del repo `sntlln93/clini` (archivado): un turnero solo-panel previo.
> Se incorpora lo que aquel modelo contemplaba y faltaba acá; se descarta lo que choca con
> las decisiones actuales (ver "Divergencias" más abajo).

### CU-47 · Datos demográficos del paciente

- **Actor**: recepcionista que carga un paciente.
- **Invariantes**:
  - El paciente tiene **fecha de nacimiento** y **sexo** con valores `F` / `M` / `U`
    (`U` = no especificado, ya contemplado en el viejo por inclusividad).
  - Son datos del paciente global (CU-06), no por organización.

### CU-48 · Obra social del paciente *(orientado a facturación futura)*

- **Actor**: recepcionista.
- **Invariantes**:
  - El paciente puede tener una **obra social / cobertura** (dato opcional, nullable).
  - Es la **cobertura** del paciente, distinta del "n° de afiliado" como tipo de documento
    de identidad (CU-37): un paciente puede identificarse por DNI y además tener obra social.
  - **[Futuro]** Su uso pleno (planes, autorizaciones) llega con facturación; el MVP solo
    necesita poder guardarla.

### CU-49 · Motivo del turno (opcional)

- **Actor**: recepcionista o paciente al reservar.
- **Invariantes**:
  - El turno puede llevar un **motivo de consulta** libre y **opcional** (nullable), tal
    como lo tenía el viejo ("Motivo de la consulta" marcado como opcional).
  - Es un dato del turno, distinto de la nota clínica posterior (CU-45).

### CU-50 · Dirección de la organización

- **Actor**: dueño que carga los datos de su consultorio.
- **Decisión**: la dirección se modela **polimórfica** (para poder colgar de varias
  entidades a futuro), pero por ahora **solo se contemplan direcciones de organización**;
  las de paciente quedan diferidas.
- **Invariantes**:
  - La organización puede tener una dirección (calle, ciudad, …).
  - El diseño polimórfico no debe volver imposible agregar direcciones de paciente después,
    pero el MVP no las incluye.

### CU-51 · Modalidad de atención (consultorio/domicilio) *(Futuro, fuera del MVP)*

- **Decisión**: por ahora **no** se modela la modalidad de atención; todos los turnos se
  asumen **en consultorio**. El viejo distinguía Consultorio/Domicilio (`Visit`/`Practice`),
  pero **no lo incluimos**.
- **Invariantes** (solo de cara al futuro):
  - Agregar más adelante un eje de modalidad al turno **no debe requerir un rediseño
    destructivo**: se resolvería con una columna/enum nueva sobre `Appointment`.
  - La atención a domicilio, si algún día llega, necesitará una dirección de destino, que
    se apoyaría en las direcciones de paciente (también diferidas, CU-50).
- **Implicación para el MVP**: el turno **no lleva** campo de modalidad; no hay que
  preverlo, solo no cerrarse la puerta.

---

## Divergencias respecto del sistema viejo

Lo que el viejo hacía distinto y **descartamos a propósito** (valida la dirección actual):

- **Turnos sin `practice_id`**: sus `appointments` colgaban solo de paciente+doctor, sin
  organización → rompía el aislamiento multi-tenant (CU-32). Nuestro diseño lo corrige.
- **Roles globales en `users` (JSON) + `is_management` en el pivote** → nosotros usamos rol
  por membresía (CU-04).
- **DNI único simple, obligatorio, sin tipo de documento**, y **contacto (teléfono) en el
  turno, sin email en el paciente** → nosotros: documento tipado (CU-37) y contacto en el
  paciente para recordatorios/reserva (CU-27).
- **Disponibilidad como JSON `[{from,to}]` sin día de semana** → nosotros: por día + franjas
  + excepciones (CU-11/12).
- **Sin catálogo de prestaciones ni especialidad en tablas** (la "prestación" era un enum;
  `especialties.json` era un catálogo sin usar) → CU-15/16/43 son más ricos.
- **Sin reserva online, sin slug, sin recordatorios** → todo eso es nuevo (CU-19/44/27).

---

## Cobertura de los mocks

Confirmado contra `mocks/clini-landing`, `mocks/clini-app` y `mocks/clini-reserva`
(decodificados del bundle). Ya cubierto por los casos originales: agenda por profesional
(CU-10), franjas múltiples y días sin atención (CU-11/12), feriados (CU-13), duración por
prestación (CU-14), subconjunto de prestaciones por profesional (CU-16, "Electrocardiograma"
está en el panel pero no en la reserva), origen online/manual (CU-18/19), solapamiento
(CU-20), recordatorios multicanal elegidos al crear el turno (CU-27/28).

Faltaban y se agregaron aquí: **especialidad** como dimensión de filtrado (CU-34/43),
**grilla de slots** y su granularidad (CU-35), **concurrencia en la reserva** (CU-36),
**estados Pendiente/Llegó** del ciclo de atención (CU-41), **identidad visual por
profesional** (CU-42), **slug público de la organización** (CU-44) e **historia clínica
por notas** ya presente en el panel (CU-45).

Los mocks son solo una **referencia inicial y no se modificarán**. Dos definiciones del
modelo van más allá de lo que muestran y se documentan como parte del schema (no como
cambios a los mocks): la identidad del paciente por **documento con selector de tipo**
(CU-37) y el estado **Reprogramado** del turno (CU-25/41).

---

## Matriz rápida caso → entidad tensionada

| Caso | Tensión principal que valida |
|------|------------------------------|
| CU-02, CU-04 | Membresía como portadora de rol; M:N usuario-organización |
| CU-06, CU-07 | Paciente global sin FK a organización |
| CU-10, CU-11, CU-12 | Disponibilidad por (profesional, organización) con recurrencia + excepciones |
| CU-16 | M:N profesional-prestación intra-organización |
| CU-20, CU-23 | Exclusión de solapamiento (intra e inter organización) |
| CU-24, CU-25 | Estado/auditoría/trazabilidad en vez de borrado físico |
| CU-27, CU-28, CU-29 | Notificación desacoplada, multicanal, destinatario polimórfico |
| CU-32, CU-33 | Aislamiento y coherencia referencial multi-tenant |
| CU-34, CU-43 | Especialidad como dimensión propia (por membresía) |
| CU-35, CU-36 | Grilla de slots computable + exclusión al escribir |
| CU-37 | Paciente sin DNI; dedup por email/teléfono |
| CU-41 | Enum de estado con Pendiente inicial y Llegó (check-in) |
| CU-42 | Presentación del profesional atada a la organización |
| CU-44 | Slug público único de la organización |
| CU-45 | Nota clínica ligada a turno↔profesional↔organización |
| CU-47, CU-48 | Demografía y obra social del paciente global |
| CU-49 | Motivo opcional del turno (≠ nota clínica) |
| CU-50 | Dirección polimórfica, solo organización por ahora |
| CU-51 | Modalidad de atención diferida, sin cerrarle la puerta |
