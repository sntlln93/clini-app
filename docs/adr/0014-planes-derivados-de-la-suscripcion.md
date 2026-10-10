# ADR 0014: Planes derivados de la suscripción

## Estado

Aceptado.

## Contexto

La landing ofrece tres planes: Gratis, Consultorio y Centro (#237). Hasta ahora había un solo cobro mensual por Mercado Pago. Una organización sin fila de suscripción no tenía ninguna restricción, y una suscripción vencida o cancelada dejaba la agenda en solo lectura (#28, #261).

El issue dejó varias decisiones para el triage:
- qué cuenta como profesional para el cobro;
- cuándo se ajusta el monto en Mercado Pago;
- qué pasa con las organizaciones que ya existen;
- qué pasa al bajar de plan con más de un profesional activo;
- cómo se modela el precio de Centro.

## Decisión

**El plan no se guarda: se deriva.** Lo resuelve `Plan::resolve()`:
- **Centro** es el único plan guardado (`organizations.assigned_plan`). Lo asigna un operador desde el dashboard y queda en `admin_audit_logs`.
- **Consultorio** sale de una suscripción que da acceso: activa, en gracia, vencida (que todavía debe su período) o cancelada con período pago por delante (`access_ends_at`).
- **Gratis** es todo lo demás: sin suscripción, con un checkout pendiente, o cancelada sin período pago por delante. Las organizaciones nuevas nacen en Gratis sin hacer nada.

**Gratis** deja afuera cuatro funciones (`PlanFeature`): equipo (invitar dueños, administración o recepción, o un segundo profesional), sala de espera, recetas y link de reservas por profesional. Además tiene un límite de 1 profesional activo.

La API controla el plan en el servidor:
- el middleware `plan.feature:<feature>` en las escrituras de recetas y en `GET /waiting-room`;
- `OrganizationPlan::ensureAllowsMember()` en invitar, aceptar una invitación (con lock de la organización) y cambiar roles o estado;
- `OrganizationPlan::ensureIncludes()` al definir un link por profesional.

Una función que el plan no incluye responde 409 `plans.feature_unavailable`.

**Bajar de plan no borra ni desactiva nada:**
- Lo que el plan nuevo no incluye queda en solo lectura: las recetas se ven y se imprimen, y el link por profesional ya creado sigue resolviendo, pero no se puede cambiar.
- Solo se validan los roles que una membresía **gana**, así que una organización que bajó de plan puede degradar, suspender o desactivar.
- Si una organización en Gratis tiene más profesionales activos que el límite, `EnsureSubscriptionActive` responde 409 `plans.professional_limit_exceeded` a las escrituras de agenda, disponibilidad, notas, recetas y reserva online, hasta que pase a Consultorio o desactive profesionales.

**Vencida no es lo mismo que cancelada.** Un pago fallido que agota la gracia sigue dejando la agenda en solo lectura, que es lo que promete la landing. Una cancelación, desde el panel o desde Mercado Pago, pasa a Gratis al terminar el período pago, como dejó anotado #261. Cancelar una suscripción vencida es entonces la forma de seguir en Gratis.

**Precio de Consultorio** (`config/plans.php`, que sigue leyendo `MERCADOPAGO_PLAN_AMOUNT`): el monto base cubre 5 profesionales activos y cada profesional activo por encima suma un monto fijo.
- Cuenta como profesional toda membresía activa con rol `professional`; un dueño o administrador que también atiende cuenta como uno más.
- El checkout crea el preapproval con el monto del momento y lo guarda en `subscriptions.amount`.
- Cuando cambia la cantidad de profesionales (aceptar una invitación, cambiar un rol o un estado, desactivar), se encola `SyncSubscriptionAmountJob`, que hace `PUT /preapproval/{id}` con el monto nuevo.
- El monto nuevo rige desde el próximo cobro, sin prorrateo.
- El job recalcula todo desde el estado actual, así que es idempotente y reintenta ante una falla del proveedor sin bloquear el cambio de membresía.

**Centro se cobra por fuera de la plataforma.** No se modela su precio. El operador no puede asignarlo mientras la suscripción de Mercado Pago pueda cobrar (activa, en gracia o vencida), así nadie paga dos veces. Una organización en Centro no puede iniciar un checkout.

**Las organizaciones existentes:** no hay tráfico real todavía, así que no hay migración de datos. Con la regla de arriba, una organización con suscripción activa queda en Consultorio y una sin suscripción queda en Gratis. El seed deja Clínica Modelo en Centro y Consultorio Dos en Consultorio.

**Límite de turnos de Gratis (#238).** Gratis incluye 40 turnos por mes (`Plan::monthlyAppointmentLimit()`), y a los 35 se avisa (`appointmentWarningThreshold()`):
- **El mes es el del turno, no el de la carga.** Se cuenta por `start_at`, en la zona horaria de la organización, sin los `cancelled` ni los `rescheduled`, que liberan su lugar igual que liberan el slot (ADR 0004). El contador se reinicia solo al cambiar el mes, sin comando programado.
- **El control vive en `BookAppointmentAction`**, el único camino de escritura de turnos (ADR 0004). En un plan con límite, además del lock del profesional, la Action toma un advisory lock de la organización (namespace 25), siempre en ese orden, así que no puede haber deadlock. Un turno de más responde 409 `plans.appointment_limit_reached`, con `appointment_limit` y `month` en el contexto.
  - Reprogramar dentro del mismo mes no suma, así que se permite siempre, aunque el mes ya esté por encima del límite (por ejemplo, después de bajar a Gratis). Reprogramar a otro mes que ya está lleno se rechaza y no cambia nada.
  - La reserva online hace el mismo control antes de registrar al paciente (después de los suyos de servicio y horario), para que un mes lleno no deje un paciente vinculado sin turno. Ese control previo no es el que vale ante la concurrencia.
- **El aviso sale una sola vez por mes.** Cuando la cuenta del mes llega al umbral, la Action inserta una fila en `appointment_limit_warnings`, con clave única (organización, mes), dentro de la misma transacción y bajo el mismo lock. Solo si la fila es nueva manda `AppointmentLimitApproachingNotification` a los dueños, después del commit. Si la cuenta baja y vuelve a subir, el aviso no se repite.
- **El paciente nunca ve el motivo.** El contexto del error no nombra el plan, y la página de reservas lo traduce a un mensaje que le propone otro mes o contactar al consultorio. En el panel, el mensaje ofrece pasar a Consultorio. `GET /plan` devuelve `appointments_this_month` (el mes actual), así que el banner del panel aparece desde los 35. El panel vuelve a leer el plan después de cada alta, reprogramación o cancelación en Gratis, y ante un 409 por mes lleno.

## Alternativas descartadas

- **Guardar el plan en una columna que el webhook y el comando de vencimiento actualicen.** Duplica el estado que ya tiene la suscripción y obliga a un job programado para el fin del período pago. Calcularlo contra la hora actual sigue la misma idea que `restrictsWrites()` en #261.
- **Desactivar profesionales al bajar a Gratis, o bloquear la cancelación.** Desactivar es destructivo y elige por el dueño a quién sacar. Bloquear la cancelación contradice «Cancelás cuando quieras».
- **Dejar en solo lectura toda organización cancelada**, como hasta ahora. Una organización que deja de pagar quedaría peor que una que nunca pagó, y no habría forma de pasar a Gratis.
- **Ajustar el monto en Mercado Pago dentro de la misma transacción del cambio de membresía.** Una caída del proveedor impediría aceptar una invitación o desactivar a alguien. El job con reintentos separa las dos cosas.
- **Prorratear el cambio de monto en el mes en curso:** agrega cálculo y cobros sueltos que Mercado Pago no resuelve con el preapproval.
- **Contar los turnos por fecha de carga:** el dueño ve la agenda por la fecha del turno, y un turno cargado a fin de mes para el mes siguiente consumiría el mes equivocado.
- **Controlar el límite en un middleware**, como el de profesionales: no conoce la fecha del turno ni corre bajo el lock, así que dos reservas simultáneas podrían ocupar el turno 40.
- **Guardar el último mes avisado en una columna de `organizations`:** el aviso es por el mes del turno, que puede ser uno futuro. Alternar entre dos meses volvería a mandar el aviso del primero.

## Consecuencias

- **Una función paga nueva** se agrega como caso de `PlanFeature`. Se controla en la API con `plan.feature` o con `OrganizationPlan`, y el panel la oculta o la explica con `usePlanIncludes` y `PlanFeatureNote`.
- **Una ruta de escritura nueva** de agenda, notas, recetas o disponibilidad tiene que entrar en el grupo `subscription.active`, que ahora también aplica el límite de profesionales.
- **`OrganizationFactory` crea organizaciones sin plan asignado**, es decir en Gratis, igual que en producción. Los tests de funciones pagas que no tratan sobre planes usan `Organization::factory()->center()` o `Membership::factory()->onPaidPlan()`.
- **Fuera de este ADR**, cada uno en su issue:
  - la marca Clini en la reserva (#239);
  - el pago anual (#240);
  - las funciones exclusivas de Centro (#242 a #245).
- **Un checkout pendiente** (que no cobra) no impide asignar Centro. Si el dueño completa después ese checkout viejo, la organización pagaría Mercado Pago estando en Centro. El caso es raro (el panel ya no ofrece el checkout en Centro) y se resuelve cancelando desde Ajustes.
