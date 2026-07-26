# Checklist ejecutable de validación del schema

Lista de verificación binaria derivada de [`casos-de-uso.md`](./casos-de-uso.md). Cada
ítem es una aserción concreta que se **contrasta contra el modelo de datos** (el
[`der.dbml`](../architecture/der.dbml) y/o las migraciones). Marcá `[x]` solo si el schema
la cumple sin ambigüedad; si un ítem falla o "depende", el schema tiene un hueco o una
decisión pendiente.

Cómo usarlo:

1. Abrí el modelo de datos al lado.
2. Recorré cada aserción y verificá que exista la entidad/columna/relación/constraint, o
   que la consulta descrita sea expresable con el schema tal cual está.
3. La columna **CU** enlaza la aserción con el caso de uso que la justifica.

> Convención: "**expresable**" = se puede escribir con las tablas/columnas/FKs existentes,
> sin datos derivados que puedan quedar inconsistentes. "**imponible**" = hay un mecanismo
> (constraint, unique, exclusion, FK) que lo garantiza a nivel de base, no solo en código.

> Estado: validado contra `der.dbml` corregido. Los ítems sin tildar llevan una nota
> `> Decidido:` — son decisiones conscientes (no huecos abiertos): el schema no los
> impone a propósito y la responsabilidad queda en la capa de aplicación o en un módulo
> futuro.

---

## A. Organizaciones, membresías y roles

- [x] Existe `Organization` como entidad propia. · CU-01
- [x] La organización puede tener **dirección** (modelo polimórfico, solo organización por ahora; paciente diferido). · CU-50
- [x] `User` ↔ `Organization` es muchos-a-muchos vía una entidad `Membership` (o equivalente). · CU-02, CU-03
- [x] El **rol** vive en la membresía, no en `User`: el mismo usuario puede tener rol distinto en dos organizaciones. · CU-04
- [x] El schema distingue "miembro que atiende (profesional)" de "miembro administrativo que no atiende". · CU-04
- [x] Un miembro administrativo puede existir **sin** agenda/disponibilidad asociada. · CU-04
- [x] La membresía tiene estado (activa/inactiva/suspendida) sin borrar el registro. · CU-05
- [x] Desactivar/eliminar una membresía **no** cascadea el borrado de sus turnos históricos. · CU-05

## B. Pacientes globales

- [x] `Patient` es global: **no** tiene FK a `Organization`. · CU-06
- [x] Un mismo `Patient` puede tener turnos en organizaciones distintas, distinguibles por organización. · CU-06
- [x] La relación "paciente ↔ organización" es representable explícitamente (no se infiere solo de la existencia de turnos). · CU-07
  > Decidido: el paciente **no** pertenece a una organización. La visibilidad por
  > organización se representa explícitamente vía el pivot `organization_patient`;
  > `patients.created_by` es solo traza de auditoría de quién creó la ficha, no scoping.
- [x] `Patient` puede existir sin `User` (relación opcional, no 1:1 obligatoria). · CU-08
- [x] La identidad del paciente es el **documento = (tipo + número)**, con **DNI por defecto** y tipos alternativos (pasaporte, n° de afiliado). · CU-09, CU-37
- [x] El documento es obligatorio y **único por el par (tipo, número)** a nivel global. · CU-37
- [x] El tipo de documento es un **enum extensible** sin cambiar la estructura de pacientes. · CU-37
- [x] Un documento ya existente **reutiliza** el paciente al cargar/reservar (dedup). · CU-37
- [x] El nombre **no** se usa como identificador único. · CU-09
- [x] El paciente tiene **fecha de nacimiento** y **sexo** (`F`/`M`/`U`). · CU-47
- [x] El paciente puede tener **obra social/cobertura** opcional (nullable), distinta del documento. · CU-48

## C. Agendas y disponibilidad

- [x] La disponibilidad se define por la combinación **(profesional, organización)**, no solo por profesional. · CU-10
- [x] La disponibilidad recurrente admite **varias franjas** por día de semana (no un único rango). · CU-11
- [x] Un día sin franjas representa "Sin atención" de forma válida. · CU-11
- [x] Existen **excepciones a fecha concreta** que suman disponibilidad. · CU-12
- [x] Existen **excepciones/bloqueos a fecha concreta** que restan, sin borrar la regla recurrente. · CU-12
- [x] La indisponibilidad puede expresarse a **nivel organización** (feriado que afecta a todos). · CU-13
- [x] La granularidad de la grilla **no** está fijada globalmente: depende de la prestación. · CU-14, CU-35

## D. Prestaciones y especialidades

- [x] `Service`/prestación es un catálogo **global**, gestionado por una app externa; no pertenece a la organización ni al profesional. · CU-15
- [x] El catálogo (`Service`) solo tiene nombre; la **duración** y el **precio** (nullable) viven en la **asignación** profesional↔prestación (`professional_services`), no en el catálogo. · CU-15, CU-17
- [x] La relación profesional ↔ prestación es muchos-a-muchos dentro de la organización, vía la asignación. · CU-16
- [x] La **especialidad** existe como concepto propio, distinto de la prestación. · CU-34, CU-43
- [x] La especialidad es de **dos niveles**: una credencial **global** del profesional (`user_specialties`, viaja con la persona) y un subconjunto **practicado por membresía/organización** (`professional_specialties`). · CU-43
- [x] Es expresable "profesionales de la especialidad X en la organización Y". · CU-34

## E. Turnos

- [x] `Appointment` referencia organización, profesional, paciente, prestación e inicio. · CU-18
- [x] La duración del turno es conocida (explícita o derivable de la prestación). · CU-14, CU-18
- [x] El **origen** (online/manual) es un atributo del turno. · CU-18, CU-19
- [x] El turno puede llevar un **motivo** libre y **opcional** (nullable). · CU-49
- [x] Un turno puede referir a un `Patient` sin `User`. · CU-22
- [x] El **estado** es un enum acotado con: Pendiente, Confirmado, Llegó, Atendido, Ausente, Cancelado, Reprogramado. · CU-41
- [x] Existen marcas temporales de las transiciones clave (confirmado/cancelado/llegó/atendido). · CU-21, CU-41
- [ ] La exclusión de solapamiento del mismo profesional es **imponible** (constraint/índice), no solo verificada en código. · CU-20, CU-36
  > Decidido: se controla en la Action de reserva dentro de una transacción con lock, sin
  > exclusion constraint en la base. El schema conserva profesional, rango temporal y estado
  > para hacerlo verificable; la garantía es de aplicación, no de base. Ver
  > [ADR 0004](../adr/0004-exclusion-de-solapamiento-en-la-action.md).
- [x] Un turno **Cancelado** no cuenta para el solapamiento (libera el slot). · CU-20
- [x] Es expresable "todos los turnos de este profesional en un rango, **en todas sus organizaciones**" (solapamiento inter-organización). · CU-23

## F. Cancelaciones y reprogramaciones

- [x] Cancelar **cambia estado**, no borra el registro. · CU-24
- [x] Se registra quién y cuándo canceló (auditoría mínima). · CU-24
- [x] Una reprogramación es **trazable** desde el turno original (enlace o historial). · CU-25
- [x] El turno original de una reprogramación queda en estado **Reprogramado** y enlaza al nuevo. · CU-25, CU-41
- [x] La reprogramación reevalúa el solapamiento sobre el nuevo horario. · CU-25
- [x] El schema conserva los datos temporales necesarios para reglas de anticipación. · CU-26, CU-38

## G. Recordatorios y notificaciones

- [x] Un turno puede tener uno o más recordatorios programados con estado de envío. · CU-27
- [x] El estado de envío se registra **por canal** (email/push/…), no una sola vez por evento. · CU-28
- [x] Agregar un canal nuevo no requiere cambiar la estructura de `Appointment`. · CU-28
- [ ] El destinatario de una notificación puede ser un `User` **o** un `Patient`. · CU-29
  > Decidido: diferido a un módulo de notificaciones desacoplado por eventos (CU-27/28).
  > `reminders` cubre el recordatorio de turno al paciente; el destinatario polimórfico se
  > agrega en ese módulo sin rediseño destructivo.

## H. Reserva online (grilla de slots)

- [x] El schema tiene todo lo necesario para computar la grilla (disponibilidad − ocupados − pasado) sin precálculos frágiles. · CU-35
- [x] La reserva online produce el **mismo** tipo de `Appointment` que la carga manual (con origen distinto). · CU-19
- [ ] La reserva es atómica frente a concurrencia (solo uno toma el último slot). · CU-36
  > Decidido: misma decisión que CU-20 — atomicidad garantizada por la transacción con lock
  > en la Action de reserva, no por un exclusion constraint de base.
- [x] La organización tiene un **slug público único a nivel global** para su página de reservas. · CU-44
- [x] La organización tiene nombre visible separado del slug. · CU-44

## I. Integridad multi-tenant

- [x] Toda entidad con dueño organizacional (turnos, prestaciones, disponibilidad, agendas) porta `organization_id`. · CU-32
- [x] Ninguna consulta natural devuelve datos de otra organización por compartir profesional o paciente. · CU-32
- [x] Un turno solo puede referenciar una prestación de **su** organización (coherencia imponible o verificable). · CU-33
- [x] Un turno solo puede asignarse a un profesional que sea **miembro** de esa organización. · CU-33

## J. Futuro que el schema no debe imposibilitar

- [x] La suscripción SaaS se asocia a la **organización**, no al `User`. · CU-30
- [x] La activación de cobro de consulta es configurable por **(profesional, organización)**. · CU-31
- [x] Una nota clínica puede ligarse a **turno + profesional autor + organización**. · CU-45
- [x] El alcance de métricas por paciente (visitas/próximo turno) puede definirse por-org o global sin bloquear el schema. · CU-46
- [x] Un `Patient` puede vincularse a un `User` más adelante sin migración destructiva. · CU-08
- [x] El modelo de dirección permite agregar **direcciones de paciente** después sin rediseño. · CU-50
- [x] La obra social puede evolucionar a planes/autorizaciones sin bloquear el schema. · CU-48
- [x] Agregar más adelante una **modalidad de atención** (p. ej. consultorio/domicilio) al turno no exige rediseño destructivo. · CU-51

---

## Banderas rojas (anti-patrones a buscar)

Si el modelo tiene alguno de estos, probablemente falla algún caso de uso. Marcado `[x]` =
**presente** (malo). Verificados todos ausentes en el DER corregido, salvo el de solapamiento,
que es una decisión consciente (ver CU-20/36):

- [ ] `patients.organization_id` — rompe el paciente global (CU-06).
- [ ] `role` o `is_owner` en `users` en vez de en la membresía (CU-04).
- [ ] Documento del paciente **nullable**, o unicidad solo sobre el número sin el tipo (CU-09, CU-37).
- [ ] Tipo de documento hardcodeado (columna fija/booleana) en vez de enum extensible (CU-37).
- [ ] Un único rango horario por día en disponibilidad (una columna `from`/`to`) (CU-11).
- [ ] `price NOT NULL` en prestaciones (CU-17).
- [ ] Especialidad guardada como texto libre en el turno o inferida de la prestación (CU-34/43).
- [ ] Estado de turno booleano (`is_cancelled`) en vez de enum de 7 estados (CU-41).
- [x] Solapamiento controlado solo en código, sin constraint/índice (CU-20/36).
  > Decidido: aceptado. Se controla en la Action de reserva con transacción lockeada. Es el
  > único anti-patrón presente a propósito.
- [ ] Canal de recordatorio como columna fija en `appointments` (CU-28).
- [ ] Nota clínica colgada del `Patient` global en vez de del turno/organización (CU-45).
