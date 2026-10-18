# Suscripción SaaS con Mercado Pago

> Issues #28, #241 (cancelación desde el panel) y #240 (pago anual). Cobro recurrente, mensual o anual, de la suscripción de cada organización, con período de gracia ante un cobro fallido y modo solo lectura al vencer.

## Piezas

| Pieza | Dónde |
|---|---|
| Interfaz de dominio | `App\Contracts\SubscriptionGateway` |
| Adapter (REST, sin SDK) | `App\Services\Payments\MercadoPagoService` — `POST /preapproval`, `GET`/`PUT /preapproval/{id}`, `GET /authorized_payments/{id}` |
| Binding | `AppServiceProvider::$bindings` |
| Modelo | `subscriptions` (una por organización) + `subscription_events` (log de idempotencia del webhook) |
| Frecuencia | `SubscriptionBilling`: `monthly`, `annual` (`subscriptions.billing`) |
| Estados | `SubscriptionStatus`: `pending`, `active`, `grace`, `expired`, `cancelled` |
| Restricción | middlewares `subscription.active` (`EnsureSubscriptionActive`: vencida o límite de profesionales) y `plan.feature` (`EnsurePlanIncludes`) |
| Vencimiento | comando diario `subscriptions:expire-grace` (`routes/console.php`) |
| Avisos | `SubscriptionGraceStartedNotification`, `SubscriptionExpiredNotification` (mail, en cola, a los dueños) |

## Planes (#237, ADR 0014)

La suscripción define el plan de la organización, que se calcula y no se guarda (`Plan::resolve()`, `App\Support\OrganizationPlan`):

| Plan | Cuándo | Qué incluye |
|---|---|---|
| Gratis (`free`) | sin suscripción, checkout pendiente, o cancelada sin período pago por delante | 1 profesional activo y, si se configura, un tope de turnos por mes (sin tope por defecto); sin equipo, sala de espera, medicación indicada ni link por profesional |
| Consultorio (`practice`) | suscripción `active`, `grace`, `expired` o `cancelled` con `access_ends_at` futuro | todo, sin tope de profesionales |
| Centro (`center`) | `organizations.assigned_plan = center`, lo asigna un operador | todo; se cobra por fuera de la plataforma |

- **Precio de Consultorio** (`config/plans.php`): `MERCADOPAGO_PLAN_AMOUNT` cubre `PLAN_PRACTICE_INCLUDED_PROFESSIONALS` (5) profesionales activos (membresías activas con rol `professional`), y cada uno por encima suma `PLAN_PRACTICE_EXTRA_PROFESSIONAL_AMOUNT`.
  - El checkout crea el preapproval con el monto del momento y lo guarda en `subscriptions.amount`: el de un mes, o el del año con el descuento anual (ver Pago anual).
  - Aceptar una invitación, cambiar el rol o el estado de un miembro o desactivarlo encola `SyncSubscriptionAmountJob`. El job recalcula el monto para la frecuencia de la suscripción y, si cambió, hace `PUT /preapproval/{id}` con `auto_recurring.transaction_amount`. Rige desde el próximo cobro, sin prorrateo: en una anual, desde la próxima renovación.
  - El job es idempotente y reintenta (5 intentos, de 1 minuto a 1 hora). No toca una suscripción cancelada, una sin preapproval ni una organización en Centro.
  - El overview del dashboard suma esos montos para el MRR; el de una anual cuenta dividido por 12.
- **Controles en la API** (409 `plans.feature_unavailable` con `context.plan` y `context.feature`):
  - el middleware `plan.feature:<feature>` en las escrituras de la medicación indicada y en `GET /waiting-room`;
  - `OrganizationPlan::ensureAllowsMember()` al invitar, al aceptar (con lock de la organización) y al editar miembros: solo se validan los roles que la membresía **gana**;
  - `ensureIncludes()` al definir un link por profesional. Borrar el link siempre se permite, y uno creado antes de bajar de plan sigue resolviendo.
- **Límite de profesionales:** Gratis con más profesionales activos que el límite responde 409 `plans.professional_limit_exceeded` en el mismo grupo `subscription.active` que la suscripción vencida. Nadie se desactiva solo.
- **Límite de turnos (#238, #300):** Gratis acepta hasta `PLAN_FREE_MONTHLY_APPOINTMENT_LIMIT` turnos por mes; `0` (el valor por defecto) es sin límite. Se cuentan por la fecha del turno, en la zona horaria de la organización, sin los cancelados ni los reprogramados.
  - `BookAppointmentAction` lo controla bajo un lock de la organización, tanto para la carga manual como para la reserva online y la reprogramación. El turno que pasa el límite responde 409 `plans.appointment_limit_reached` (`context.appointment_limit`, `context.month`).
  - Al llegar a `PLAN_FREE_APPOINTMENT_WARNING_THRESHOLD`, los dueños reciben `AppointmentLimitApproachingNotification` por mail, una sola vez por mes (`appointment_limit_warnings`, con clave única por organización y mes). Sin límite, con el umbral en `0` o con un umbral que no queda por debajo del límite, no hay aviso.
  - No hay reinicio programado: el mes siguiente simplemente cuenta desde cero.
- **Marca en la página de reservas (#239, [ADR 0015](../adr/0015-archivos-de-usuarios-en-un-bucket-s3.md)):** Gratis muestra «Hecho con Clini» (`organization.show_clini_mark` en `GET /booking/{slug}`).
  - Los planes pagos (`booking_branding`) muestran el logo de la organización (`organization.logo_url`) en la reserva y en el mail de recordatorio.
  - Dueño y administración (`organization.manage`) lo suben desde Ajustes: `POST /organization/logo` (multipart, campo `logo`). En Gratis responde 409 `plans.feature_unavailable`.
  - `DELETE /organization/logo` lo quita en cualquier plan. Bajar a Gratis no lo borra: deja de mostrarse hasta volver a un plan pago.
- **Centro:** `PUT /api/v1/admin/organizations/{id}/plan` (`{"assigned_plan": "center" | null, "reason": "…"}`) lo asigna o lo quita.
  - Queda auditado como `organizations.assign_plan`.
  - Responde 409 `plans.subscription_live` si la suscripción todavía puede cobrar (`active`, `grace`, `expired`) y `plans.assignment_unchanged` si no cambia nada.
  - Un checkout en Centro responde 409 `plans.center_assigned`.

## Pago anual (#240)

Consultorio se puede pagar por año con un descuento sobre el precio mensual.

- **Precio:** `PLAN_PRACTICE_ANNUAL_DISCOUNT_PERCENT` (`plans.practice.annual_discount_percent`, `40` por defecto, acotado entre 0 y 100). El cobro anual es 12 veces el mes con el descuento, redondeado a pesos enteros antes de multiplicar (`PracticePricing::amount()`), igual que la landing: $15.000 → $9.000 por mes → **$108.000 por año**. Se aplica también a los profesionales adicionales.
- **Mecanismo:** el mismo preapproval de siempre con `auto_recurring.frequency = 12` y `frequency_type = months`. Mercado Pago cobra al autorizar y cada 12 meses, y su `next_payment_date` (la fecha de renovación que muestra Ajustes) queda a un año. El webhook, la gracia, el vencimiento y la cancelación no cambian. Se descartó un pago único con renovación manual: requiere otro flujo de cobro (Checkout Pro), avisos de vencimiento y un estado nuevo para «pagó pero no renovó», todo para algo que el preapproval ya resuelve.
- **La frecuencia es fija por preapproval:** Mercado Pago solo permite cambiar el monto y la moneda de un preapproval (`PUT /preapproval/{id}`), no `frequency`. Por eso se guarda en `subscriptions.billing` y:
  - el checkout (`POST /subscription` con `billing`) la elige al **crear** un preapproval: sin suscripción, `cancelled` o `expired`;
  - un checkout `pending` se reutiliza solo si es de la misma frecuencia; si el dueño elige la otra, se crea uno nuevo y se cancela el pendiente (el mismo reemplazo que con un preapproval pausado);
  - en `grace` se regulariza el preapproval existente con su frecuencia, diga lo que diga el request: lo que se debe es su período.
- **Cancelar a mitad de año:** igual que la mensual. Sigue en Consultorio hasta la fecha de renovación (`access_ends_at`), sin reintegro de la parte no usada; después pasa a Gratis.
- **Cobro anual fallido:** abre la misma gracia de 7 días, y al vencer deja la agenda en solo lectura.
- **Cambiar de frecuencia con la suscripción activa** (de mensual a anual o al revés al terminar el período) queda fuera de #240: necesita un preapproval nuevo que el dueño autorice en Mercado Pago, que no cobre hasta el fin del período vigente (`auto_recurring.start_date`) y que reemplace al anterior recién cuando quede autorizado, y ese comportamiento hay que validarlo en el sandbox. Mientras tanto, el dueño puede cancelar (conserva el período pago) y volver a suscribirse con la otra frecuencia cuando termine.

## Endpoints

- `GET /api/v1/plan` — cualquier miembro activo. `plan`, `assigned_by_platform`, `features` (las cuatro funciones, `true`/`false`), `professional_limit` (`null` sin límite), `active_professionals`, `restricted` (más profesionales activos que el límite), `appointment_limit` y `appointment_warning_threshold` (`null` sin límite), `appointments_this_month` (el mes actual, en la zona horaria de la organización) y `practice_pricing` (`base_amount`, `included_professionals`, `extra_professional_amount`, `annual_discount_percent`, `currency`).

- `GET /api/v1/subscription` — cualquier miembro activo. `{"data": null}` si la organización nunca se suscribió; si no, `status`, `restricted`, `grace_ends_at`, `grace_days_left`, `last_payment_at`, `last_payment_failed_at`, `next_payment_at` (próximo cobro según Mercado Pago, la fecha de renovación) `cancelled_at` (fecha de la cancelación; solo en una fila `cancelled` — un intento de volver a suscribirse no la cambia, y se limpia al reactivarse) y `access_ends_at` (fin del período ya pago de una suscripción cancelada estando `active`: hasta esa fecha sigue en Consultorio y después pasa a Gratis. Se limpia al reactivarse) `billing` (`monthly` o `annual`) y `amount` (monto de cada cobro que se fijó en Mercado Pago: el del mes o el del año, según `billing`).
- `POST /api/v1/subscription` — **solo dueño** (rol `owner`; 403 para el resto). Body opcional `{"billing": "monthly" | "annual"}` (sin él, mensual; otro valor → 422). Devuelve `{"data": {"init_point": "<url>"}}` y el panel redirige ahí.
  - Sin suscripción, `cancelled` o `expired` → crea un preapproval nuevo (`payer_email` = email del dueño, `reason` = `Suscripción Clini — <organización>`, cada 1 o 12 meses según `billing`, `external_reference` = id de la organización). Si el preapproval anterior todavía no está cancelado en Mercado Pago (una organización vencida suele seguir con reintentos de cobro), se cancela (`PUT /preapproval/{id}` con `status=cancelled`) para que nunca haya dos suscripciones cobrando — recién **después** de crear el nuevo y apuntar la fila a él: si la creación falla, el preapproval anterior sigue vivo y la fila no cambia, y el webhook `cancelled` del anterior ya no encuentra una fila que cancelar. El estado local **no** se levanta: una organización vencida sigue en solo lectura hasta que el webhook confirme el pago.
  - `pending` o `grace` → reutiliza el preapproval existente (su `init_point`), para no generar una segunda suscripción que cobre doble. Excepciones: si ese preapproval está `paused` en Mercado Pago ya no cobra, así que se crea uno nuevo y luego se cancela el anterior (la fila sigue en `grace` hasta que el webhook confirme el pago); y un `pending` de la otra frecuencia también se reemplaza así (ver Pago anual). En `grace` la frecuencia es siempre la que tiene.
  - Todo corre en una transacción con lock sobre la fila de la organización (y su suscripción), así dos inicios concurrentes (dos dueños, dos pestañas) no crean dos preapprovals ni dejan uno huérfano.
  - `active` → 409 `subscriptions.already_active`.
- `DELETE /api/v1/subscription` — **solo dueño** (rol `owner`; 403 para el resto). Cancela la suscripción (`CancelSubscriptionAction`) y devuelve el mismo recurso que `GET`.
  - Solo desde `active`, `grace` o `expired` (las que todavía pueden cobrar: una vencida suele seguir con reintentos de cobro). Sin suscripción, `pending` (un checkout nunca pagado, que no cobra) o `cancelled` → 409 `subscriptions.not_cancellable` (con `context.subscription_status`, null sin suscripción).
  - Primero consulta el preapproval (`GET /preapproval/{id}`) y, si no está cancelado en Mercado Pago, lo cancela (`PUT /preapproval/{id}` con `status=cancelled`); uno que ya figura cancelado (se canceló desde Mercado Pago y el webhook todavía no llegó) no se vuelve a cancelar. Recién después cambia la fila local. Si Mercado Pago falla, o ya no encuentra el preapproval guardado (404, igual que el checkout), responde 409 `subscriptions.gateway_unavailable` y la fila no cambia.
  - Resultado: `status = cancelled`, `cancelled_at = ahora`, `next_payment_at = null`, sin gracia, y `access_ends_at` = la próxima fecha de cobro **si estaba `active` y esa fecha todavía no pasó** (el período que ya pagó). Se toma la más tardía entre la guardada y la del preapproval recién consultado, porque la guardada se atrasa hasta que llega el webhook del cobro de la renovación (el webhook `cancelled` hace lo mismo con la fecha del recurso); si no (gracia o vencida, que deben el período en curso, o sin fecha de renovación), null y queda en solo lectura de inmediato.
  - Corre en una transacción con lock sobre la organización y su suscripción, en el mismo orden que el checkout. El webhook `cancelled` que llega después encuentra la fila ya cancelada y conserva las dos fechas.
- `GET /api/v1/subscription/return` — público (sin sesión): es el `back_url` del checkout. Responde 302 a `<FRONTEND_URL>/ajustes?suscripcion=retorno` (el primer origen de `cors.allowed_origins`, igual que los links de los mails). Ignora todos los parámetros que agrega Mercado Pago (p. ej. `preapproval_id`) y cualquier otro: el destino es fijo, así que no es un open redirect, y el estado de la suscripción lo define solo el webhook, nunca este redirect.
- `POST /api/v1/webhooks/mercadopago` — público (sin sesión ni CSRF), `throttle:120,1`. Ver abajo.

## Webhook

1. **Firma** — `x-signature: ts=<ts>,v1=<hash>`; se recalcula `HMAC-SHA256(secret, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;")` (`data.id` en minúsculas; una parte ausente se omite) y se compara en tiempo constante. Firma inválida o ausente → 401 `subscriptions.webhook_signature_invalid`, no se procesa nada.
2. **Idempotencia** — el `id` de la notificación se registra en `subscription_events`; una notificación repetida responde 204 sin reprocesar.
3. **Resolución** — se consulta el recurso a Mercado Pago (nunca se confía en el body):
   - `subscription_preapproval`:
     - `authorized` confirma un checkout `pending` → `active` (Mercado Pago mantiene el preapproval `authorized` mientras reintenta un cobro fallido y manda `updated` por cambios que no son pagos, como una tarjeta nueva, así que **no** saca de `grace` ni de `expired`: eso lo hace solo un pago aprobado). También confirma una fila `cancelled` → `active`: el recurso se consulta fresco y un preapproval cancelado nunca vuelve a `authorized`, así que uno autorizado que llega a una fila cancelada es el preapproval de reemplazo creado al volver a suscribirse.
     - `cancelled` → `cancelled` desde cualquier estado; guarda `cancelled_at` y, si estaba `active`, el período ya pago en `access_ends_at` (la misma regla que la cancelación desde el panel). Una cancelación repetida —incluida la confirmación de una hecha desde el panel— conserva las dos fechas.
     - `paused` → si estaba `active`, pasa a `grace` igual que ante un cobro fallido (un preapproval pausado deja de cobrar, así que nunca llegaría un cobro fallido que abra la gracia) y avisa a los dueños; una gracia en curso **no** se extiende.
     - `authorized` sobre una gracia abierta por una pausa (`grace_reason = paused`) → `active`: al reanudar, Mercado Pago no vuelve a cobrar hasta la próxima fecha de cobro (casi siempre después de los 7 días), así que esperar un pago aprobado vencería a una organización con el preapproval autorizado de nuevo. Una gracia abierta por un cobro fallido (`grace_reason = payment_failed`) sigue necesitando un pago aprobado; un cobro fallido durante una gracia por pausa la convierte en `payment_failed`.
     - El resto no cambia el estado.
     - Todo preapproval aplicado guarda su `next_payment_date` en `next_payment_at`, haya o no transición (uno `cancelled` lo deja en null: no hay próximo cobro).
   - `subscription_authorized_payment`:
     - Pago `approved` → `active` (limpia la gracia, setea `last_payment_at` y refresca `next_payment_at` consultando el preapproval del cobro; si esa consulta da 404 o falla, se conserva el valor guardado y el pago se aplica igual — la fecha es informativa). Si la fila local está `cancelled`, solo la activa cuando el preapproval cobrado **no** está cancelado en Mercado Pago (el de reemplazo tras volver a suscribirse). Excepción: un cobro tardío del preapproval cancelado nunca la revive — la cancelación es definitiva para ese preapproval.
     - `rejected`/`cancelled` o estado `recycling` → si estaba `active`, pasa a `grace` con `grace_ends_at = ahora + 7 días` y avisa a los dueños; una gracia en curso **no** se extiende.
     - **Orden** — las notificaciones pueden llegar fuera de orden (un reenvío tras un 5xx) y el resultado de un cobro viejo es definitivo, así que se compara la fecha del cobro (`debit_date`, o `date_created`; igual en todos sus reintentos) con la del último pago/fallo registrado: un `approved` anterior al último fallo se ignora, y un fallo no posterior al último pago también. `last_payment_at`/`last_payment_failed_at` guardan esa fecha del cobro.
   - Cualquier otro tipo, o una suscripción desconocida → 200 sin cambios.
4. Si Mercado Pago no responde al resolver (5xx, timeout/error de conexión, 401/403 o cualquier otro fallo), el webhook contesta 409 `subscriptions.gateway_unavailable` **sin** registrar el evento, así Mercado Pago lo reenvía.
5. Si Mercado Pago contesta **404** al resolver (`GET /preapproval/{id}` o `GET /authorized_payments/{id}`), el recurso no existe para estas credenciales y reintentar no lo cambia: el webhook contesta 204 (2xx, así Mercado Pago no reintenta), deja un `warning` en el log (con el endpoint y el id de la notificación), no cambia ninguna suscripción y **no** registra el evento en `subscription_events`, así una entrega genuina posterior con el mismo id se procesa igual. Un 404 en el preapproval de un cobro sobre una fila `cancelled` cuenta como cancelado (no la revive). Fuera del webhook no cambia nada: crear (`POST /preapproval`) o cancelar (`PUT`) un preapproval siguen respondiendo 409 ante cualquier fallo, y el checkout también responde 409 si Mercado Pago ya no encuentra el preapproval guardado (no crea uno nuevo a ciegas).

## Restricción (solo lectura)

Con estado `expired`, todas las escrituras de turnos (alta, estado, cancelación, reprogramación), notas clínicas, medicación indicada, disponibilidad semanal, excepciones y la reserva online pública responden 409 `subscriptions.inactive` (con `context.subscription_status`). Las lecturas siguen permitidas.

Una suscripción `cancelled` ya no restringe nada (#237): mientras dure su período pago la organización sigue en Consultorio, y después pasa a Gratis, con las restricciones de ese plan (ver Planes). Una organización sin suscripción está en Gratis.

La regla vive en `Subscription::restrictsWrites()` (la usan el middleware y el `restricted` del recurso), y se compara con la hora actual: el fin del período pago no necesita ningún comando programado. Se aplica en un solo lugar: el middleware `subscription.active`, agrupando las rutas de escritura en `routes/api/v1/{appointments,availability,clinical-notes,prescriptions,booking}.php`. Una ruta de escritura nueva en esos módulos tiene que entrar en ese grupo.

El panel lee la suscripción y el plan una vez en el loader de `_auth` y los observa con `useSubscription()` y `usePlan()`.
- **Banner:** gracia, vencida, el período pago de una cancelación, Gratis por encima del límite de profesionales, o Gratis con un límite de turnos y el mes actual en el umbral de aviso o lleno. Muestra «Ver plan», que lleva a `/ajustes#suscripcion`. Crear, reprogramar o cancelar un turno en Gratis refresca el plan, así que el contador del banner se actualiza.
- **Ajustes:** la sección «Plan y suscripción».
- **Registro (#286, #240):** en Consultorio pregunta la forma de pago (Mensual / Anual), preseleccionada por `?pago=mensual|anual`, que agrega el link de la landing cuando el visitante eligió «Anual».
- **Solo lectura:** `useWritesRestricted()` (suscripción vencida o límite de profesionales excedido) oculta las acciones de alta y edición en agenda y disponibilidad, las de alta, enmienda y anulación en notas clínicas, y las de alta y enmienda en medicación indicada.
- **Funciones fuera del plan:** se ocultan o se explican con `PlanFeatureNote`. La sala de espera no aparece en el menú y su página lo explica; la medicación indicada se puede ver pero no registrar ni enmendar; invitar y el link por profesional muestran el límite.
- **Reserva online:** ante una suscripción vencida o el límite de profesionales excedido, el paciente ve un mensaje genérico que le pide contactar al consultorio, nunca el motivo. Si el mes del turno está lleno, el mensaje le propone elegir otro mes o contactar al consultorio, sin nombrar el plan.

El backend sigue siendo la fuente de verdad.

La sección «Plan y suscripción» muestra el plan actual y qué incluye:
- en Gratis, qué suma Consultorio y a qué precio;
- en Consultorio, el monto por mes o por año (`amount`, o la fórmula si todavía no hay uno guardado) con los profesionales activos; en una anual, el descuento y que un cambio de profesionales rige desde la próxima renovación;
- al dueño, cuando el checkout crea un preapproval (todo menos `grace`), la forma de pago: Mensual o Anual, con el precio, el equivalente por mes y el ahorro;
- en Centro, que lo gestiona el equipo de Clini, sin botones de checkout.

Además muestra, según el estado: «Se renueva automáticamente el …» (`next_payment_at`), «Pago pendiente: te quedan N días (hasta el …)», «Venció el …», «Cancelada el …» (con «Seguís en el plan Consultorio hasta el …» mientras dure el período pago) o «Esperando confirmación del pago», más «Último pago: …» si lo hay. Al dueño, con la suscripción `active`, `grace` o `expired`, le ofrece «Cancelar suscripción»: una confirmación explica que Mercado Pago deja de cobrar, hasta cuándo sigue en Consultorio (o que pasa a Gratis de inmediato) y qué deja de poder hacerse en Gratis. Mientras dura el período pago de una cancelación, el banner avisa «Cancelaste la suscripción.» con la fecha, sin el estilo de error. «Pasar a Consultorio»/«Regularizar pago» queda deshabilitado con «Redirigiendo a Mercado Pago…» desde el clic hasta que el navegador sale al checkout; solo un error lo vuelve a habilitar.

## Extensión manual del período de gracia

Un operador de la plataforma puede extender la gracia desde el dashboard de operación (`POST /api/v1/admin/subscriptions/{id}/grace-extension`, `ExtendSubscriptionGraceAction`; ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md)). No agrega ningún estado ni `SubscriptionGraceReason` nuevo, y el webhook no cambia:

- **Solo desde `grace` o `expired`** — cualquier otro estado → 409 `subscriptions.grace_extension_not_allowed` (con `context.subscription_status`).
- **Resultado**: `status = grace`, `grace_ends_at` = el día elegido (`grace_ends_on`, `Y-m-d`) a las 23:59:59 en la zona horaria de reporte (`ADMIN_REPORTING_TIMEZONE`, por defecto `America/Argentina/Buenos_Aires`), guardado en UTC. Desde `grace` el `grace_reason` se conserva; desde `expired` pasa a `payment_failed` (una fila vencida ya solo se levanta con un cobro aprobado, exactamente esa semántica). Una fila `expired` extendida deja de estar restringida: las escrituras vuelven a funcionar.
- **Es una extensión**: desde `grace` la nueva fecha tiene que ser estrictamente posterior al `grace_ends_at` actual → si no, 409 `subscriptions.grace_extension_not_later` (con `context.current_grace_ends_at`).
- **Rango**: `grace_ends_on` posterior a hoy y como mucho hoy + 90 días, con «hoy» en la zona horaria de reporte de los dos lados (el selector de fecha del dashboard usa el mismo «hoy»); fuera de rango → 422.
- Corre en una transacción con `lockForUpdate` sobre la fila, así un webhook concurrente no se intercala, y escribe en la misma transacción una fila de auditoría `subscriptions.extend_grace` con los valores anteriores y la nota del operador.
- `subscriptions:expire-grace` sigue igual: compara `grace_ends_at <= now()`, así que respeta la nueva fecha. No se avisa a los dueños (fuera de alcance).

**Vuelta del checkout** — con `?suscripcion=retorno` Ajustes refresca la suscripción y, mientras siga `pending` (el webhook puede llegar después que el navegador), muestra «Estamos confirmando tu pago con Mercado Pago…» y vuelve a consultar cada 5 s, hasta 2 minutos. Cuando deja de estar `pending` (o se agota la espera) saca el parámetro de la URL.

## Variables de entorno (`apps/api/.env`)

| Variable | Qué es |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de la aplicación. En sandbox es el `APP_USR-…` que muestra la página *Credenciales de prueba* de la aplicación: pertenece al vendedor de prueba (ver abajo). Server-side, nunca va al panel. |
| `MERCADOPAGO_PUBLIC_KEY` | Public key de la aplicación. Hoy no se usa (no hay checkout embebido); queda configurada para el cobro de consultas (#29). |
| `MERCADOPAGO_WEBHOOK_SECRET` | Clave secreta de la sección Webhooks de la aplicación. Sin ella, todo webhook se rechaza con 401. |
| `MERCADOPAGO_PLAN_AMOUNT` | Precio base mensual de Consultorio en pesos enteros (ej. `15000`), con los profesionales incluidos. |
| `MERCADOPAGO_PLAN_CURRENCY` | Moneda; `ARS` por defecto. |
| `PLAN_PRACTICE_INCLUDED_PROFESSIONALS` | Profesionales activos que cubre el precio base; `5` por defecto. |
| `PLAN_PRACTICE_EXTRA_PROFESSIONAL_AMOUNT` | Monto mensual por cada profesional activo por encima de los incluidos (ej. `5000`); `0` por defecto. |
| `PLAN_PRACTICE_ANNUAL_DISCOUNT_PERCENT` | Descuento sobre el precio mensual al pagar el año (ej. `40`); `40` por defecto, acotado entre 0 y 100. La landing muestra el mismo valor, ajustado a mano (ADR 0011). |
| `PLAN_FREE_MONTHLY_APPOINTMENT_LIMIT` | Turnos por mes del plan Gratis (ej. `40`); `0` por defecto, sin límite. |
| `PLAN_FREE_APPOINTMENT_WARNING_THRESHOLD` | Turnos del mes desde los que se avisa a los dueños (ej. `35`); `0` por defecto, sin aviso. Solo vale por debajo del límite. |
| `MERCADOPAGO_BACK_URL` | URL a la que Mercado Pago devuelve al pagador. Por defecto `${APP_URL}/api/v1/subscription/return`, la ruta de la API que redirige al panel (`/ajustes?suscripcion=retorno`); se puede sobrescribir. Mercado Pago exige una URL `https` pública. |

Nunca commitear valores reales: `.env.example` los deja vacíos.

## Probar contra el sandbox de Mercado Pago

1. **Cuentas de prueba** — con la cuenta real, en [Tus integraciones](https://www.mercadopago.com.ar/developers/panel/app) → *Cuentas de prueba*, crear dos usuarios de prueba de Argentina: un **vendedor** y un **comprador**. Todo lo que sigue se hace con esas cuentas, no con cuentas reales.
2. **Credenciales** — tanto el vendedor como el comprador son usuarios de prueba. En la aplicación (tipo *Suscripciones*), abrir *Credenciales de prueba*: el `Access Token` y la `Public Key` `APP_USR-…` que muestra esa página pertenecen al **vendedor de prueba**, y son los que van en `MERCADOPAGO_ACCESS_TOKEN` / `MERCADOPAGO_PUBLIC_KEY`. No hace falta crear otra aplicación dentro del vendedor de prueba. Mezclar un usuario real con uno de prueba hace fallar `POST /preapproval` (p. ej. *Both payer and collector must be real or test users*).
3. **Webhook** — en esa misma aplicación → *Webhooks* → *Configurar notificaciones*: URL `https://<host-público>/api/v1/webhooks/mercadopago`, eventos **Planes y suscripciones** (`subscription_preapproval` y `subscription_authorized_payment`). Guardar y copiar la **clave secreta** que genera. En local hace falta un túnel público hacia `http://localhost:8080` (ej. `cloudflared tunnel --url http://localhost:8080` o `ngrok http 8080`).
4. **Configurar** `apps/api/.env`:

   ```dotenv
   MERCADOPAGO_ACCESS_TOKEN=<APP_USR-… de «Credenciales de prueba» (vendedor de prueba)>
   MERCADOPAGO_PUBLIC_KEY=<APP_USR-… de «Credenciales de prueba» (vendedor de prueba)>
   MERCADOPAGO_WEBHOOK_SECRET=<clave secreta del webhook>
   MERCADOPAGO_PLAN_AMOUNT=15000
   MERCADOPAGO_PLAN_CURRENCY=ARS
   MERCADOPAGO_BACK_URL=https://<host-público-de-la-api>/api/v1/subscription/return
   ```

   y reiniciar la API (`docker compose restart laravel.test queue`) para que tome la config. Migrar si hace falta: `apps/api/vendor/bin/sail artisan migrate`.
5. **Suscribirse** — ingresar al panel como el dueño (`ana.duena@test.com` en el seed) → Ajustes → «Suscribirse». Mercado Pago valida que el `payer_email` sea el de un comprador de prueba: cambiar el email de ese usuario por el del comprador de prueba (o registrar un dueño nuevo con ese email). Pagar con una [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/test/cards) y titular `APRO` (aprobado) u `OTHE` (rechazado).
6. **Verificar** — el webhook llega a `/api/v1/webhooks/mercadopago` (ver `storage/logs` y la tabla `subscription_events`) y la suscripción pasa a `active`. Para la gracia: un cobro rechazado la mueve a `grace`; para el vencimiento sin esperar 7 días, poner `grace_ends_at` en el pasado y correr `apps/api/vendor/bin/sail artisan subscriptions:expire-grace`. Los mails se ven en Mailpit (<http://localhost:8025>) con el worker `queue` levantado.
7. Desde el panel de la aplicación se puede usar *Simular notificación* del webhook para probar la firma: envía un id ficticio (p. ej. `123456`), así que con la firma válida responde 204 y queda en el log el `warning` de recurso no encontrado, sin cambios ni fila en `subscription_events`. Un 401 indica firma inválida (revisar `MERCADOPAGO_WEBHOOK_SECRET`).

## Fuera de alcance / pendientes

- **Web Push** para los avisos de gracia/vencimiento (no existe infraestructura de push todavía): por ahora solo mail.
- Prueba gratuita de Consultorio y cobro de consultas (#29, que reutiliza este adapter).
- Comprar turnos extra sueltos (#238 lo deja fuera). La grilla pública sigue mostrando horarios de un mes lleno: el rechazo llega al confirmar.
- Cambiar de frecuencia con la suscripción activa (ver Pago anual) y el reintegro de la parte no usada de un año cancelado.
- Funciones exclusivas de Centro (#243 a #245). Los reportes (#242) están en [reports.md](reports.md).
- Precio de Centro: se cobra por fuera de la plataforma y no se modela.
- Encuesta de motivo de baja (#241 la deja fuera) y aviso por mail de la cancelación.
- Volver a suscribirse durante el período pago de una cancelación crea un preapproval nuevo que cobra desde la autorización, sin descontar los días que quedaban (`auto_recurring.start_date` no se usa).
