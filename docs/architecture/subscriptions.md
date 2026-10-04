# Suscripción SaaS con Mercado Pago

> Issue #28. Cobro recurrente mensual de la suscripción de cada organización, con período de gracia ante un cobro fallido y modo solo lectura al vencer.

## Piezas

| Pieza | Dónde |
|---|---|
| Interfaz de dominio | `App\Contracts\SubscriptionGateway` |
| Adapter (REST, sin SDK) | `App\Services\Payments\MercadoPagoService` — `POST /preapproval`, `GET`/`PUT /preapproval/{id}`, `GET /authorized_payments/{id}` |
| Binding | `AppServiceProvider::$bindings` |
| Modelo | `subscriptions` (una por organización) + `subscription_events` (log de idempotencia del webhook) |
| Estados | `SubscriptionStatus`: `pending`, `active`, `grace`, `expired`, `cancelled` |
| Restricción | middleware `subscription.active` (`EnsureSubscriptionActive`) |
| Vencimiento | comando diario `subscriptions:expire-grace` (`routes/console.php`) |
| Avisos | `SubscriptionGraceStartedNotification`, `SubscriptionExpiredNotification` (mail, en cola, a los dueños) |

## Endpoints

- `GET /api/v1/subscription` — cualquier miembro activo. `{"data": null}` si la organización nunca se suscribió; si no, `status`, `restricted`, `grace_ends_at`, `grace_days_left`, `last_payment_at`, `last_payment_failed_at`.
- `POST /api/v1/subscription` — **solo dueño** (rol `owner`; 403 para el resto). Devuelve `{"data": {"init_point": "<url>"}}` y el panel redirige ahí.
  - Sin suscripción, `cancelled` o `expired` → crea un preapproval nuevo (`payer_email` = email del dueño, `reason` = `Suscripción Clini — <organización>`, mensual, `external_reference` = id de la organización). Si el preapproval anterior todavía no está cancelado en Mercado Pago (una organización vencida suele seguir con reintentos de cobro), se cancela (`PUT /preapproval/{id}` con `status=cancelled`) para que nunca haya dos suscripciones cobrando — recién **después** de crear el nuevo y apuntar la fila a él: si la creación falla, el preapproval anterior sigue vivo y la fila no cambia, y el webhook `cancelled` del anterior ya no encuentra una fila que cancelar. El estado local **no** se levanta: una organización vencida sigue en solo lectura hasta que el webhook confirme el pago.
  - `pending` o `grace` → reutiliza el preapproval existente (su `init_point`), para no generar una segunda suscripción que cobre doble. Excepción: si ese preapproval está `paused` en Mercado Pago ya no cobra, así que se crea uno nuevo y luego se cancela el anterior (la fila sigue en `grace` hasta que el webhook confirme el pago).
  - Todo corre en una transacción con lock sobre la fila de la organización (y su suscripción), así dos inicios concurrentes (dos dueños, dos pestañas) no crean dos preapprovals ni dejan uno huérfano.
  - `active` → 409 `subscriptions.already_active`.
- `POST /api/v1/webhooks/mercadopago` — público (sin sesión ni CSRF), `throttle:120,1`. Ver abajo.

## Webhook

1. **Firma** — `x-signature: ts=<ts>,v1=<hash>`; se recalcula `HMAC-SHA256(secret, "id:<data.id>;request-id:<x-request-id>;ts:<ts>;")` (`data.id` en minúsculas; una parte ausente se omite) y se compara en tiempo constante. Firma inválida o ausente → 401 `subscriptions.webhook_signature_invalid`, no se procesa nada.
2. **Idempotencia** — el `id` de la notificación se registra en `subscription_events`; una notificación repetida responde 204 sin reprocesar.
3. **Resolución** — se consulta el recurso a Mercado Pago (nunca se confía en el body):
   - `subscription_preapproval`:
     - `authorized` confirma un checkout `pending` → `active` (Mercado Pago mantiene el preapproval `authorized` mientras reintenta un cobro fallido y manda `updated` por cambios que no son pagos, como una tarjeta nueva, así que **no** saca de `grace` ni de `expired`: eso lo hace solo un pago aprobado). También confirma una fila `cancelled` → `active`: el recurso se consulta fresco y un preapproval cancelado nunca vuelve a `authorized`, así que uno autorizado que llega a una fila cancelada es el preapproval de reemplazo creado al volver a suscribirse.
     - `cancelled` → `cancelled` desde cualquier estado.
     - `paused` → si estaba `active`, pasa a `grace` igual que ante un cobro fallido (un preapproval pausado deja de cobrar, así que nunca llegaría un cobro fallido que abra la gracia) y avisa a los dueños; una gracia en curso **no** se extiende.
     - `authorized` sobre una gracia abierta por una pausa (`grace_reason = paused`) → `active`: al reanudar, Mercado Pago no vuelve a cobrar hasta la próxima fecha de cobro (casi siempre después de los 7 días), así que esperar un pago aprobado vencería a una organización con el preapproval autorizado de nuevo. Una gracia abierta por un cobro fallido (`grace_reason = payment_failed`) sigue necesitando un pago aprobado; un cobro fallido durante una gracia por pausa la convierte en `payment_failed`.
     - El resto no cambia nada.
   - `subscription_authorized_payment`:
     - Pago `approved` → `active` (limpia la gracia, setea `last_payment_at`). Si la fila local está `cancelled`, solo la activa cuando el preapproval cobrado **no** está cancelado en Mercado Pago (el de reemplazo tras volver a suscribirse). Excepción: un cobro tardío del preapproval cancelado nunca la revive — la cancelación es definitiva para ese preapproval.
     - `rejected`/`cancelled` o estado `recycling` → si estaba `active`, pasa a `grace` con `grace_ends_at = ahora + 7 días` y avisa a los dueños; una gracia en curso **no** se extiende.
     - **Orden** — las notificaciones pueden llegar fuera de orden (un reenvío tras un 5xx) y el resultado de un cobro viejo es definitivo, así que se compara la fecha del cobro (`debit_date`, o `date_created`; igual en todos sus reintentos) con la del último pago/fallo registrado: un `approved` anterior al último fallo se ignora, y un fallo no posterior al último pago también. `last_payment_at`/`last_payment_failed_at` guardan esa fecha del cobro.
   - Cualquier otro tipo, o una suscripción desconocida → 200 sin cambios.
4. Si Mercado Pago no responde al resolver (5xx, timeout/error de conexión, 401/403 o cualquier otro fallo), el webhook contesta 409 `subscriptions.gateway_unavailable` **sin** registrar el evento, así Mercado Pago lo reenvía.
5. Si Mercado Pago contesta **404** al resolver (`GET /preapproval/{id}` o `GET /authorized_payments/{id}`), el recurso no existe para estas credenciales y reintentar no lo cambia: el webhook contesta 204 (2xx, así Mercado Pago no reintenta), deja un `warning` en el log (con el endpoint y el id de la notificación), no cambia ninguna suscripción y **no** registra el evento en `subscription_events`, así una entrega genuina posterior con el mismo id se procesa igual. Un 404 en el preapproval de un cobro sobre una fila `cancelled` cuenta como cancelado (no la revive). Fuera del webhook no cambia nada: crear (`POST /preapproval`) o cancelar (`PUT`) un preapproval siguen respondiendo 409 ante cualquier fallo, y el checkout también responde 409 si Mercado Pago ya no encuentra el preapproval guardado (no crea uno nuevo a ciegas).

## Restricción (solo lectura)

Con estado `expired` o `cancelled`, todas las escrituras de turnos (alta, estado, cancelación, reprogramación), notas clínicas, recetas, disponibilidad semanal, excepciones y la reserva online pública responden 409 `subscriptions.inactive` (con `context.subscription_status`). Las lecturas siguen permitidas. Una organización **sin fila** de suscripción no se restringe (las organizaciones existentes/seed siguen funcionando; la política de prueba gratuita queda para otro issue).

Se aplica en un solo lugar: el middleware `subscription.active`, agrupando las rutas de escritura en `routes/api/v1/{appointments,availability,clinical-notes,prescriptions,booking}.php`. Una ruta de escritura nueva en esos módulos tiene que entrar en ese grupo.

El panel lee la suscripción una vez en el loader de `_auth` y la observa con `useSubscription()`: muestra el banner (gracia / vencida / cancelada), la sección «Suscripción» en Ajustes y oculta las acciones de alta/edición en agenda, notas clínicas, recetas y disponibilidad. El backend sigue siendo la fuente de verdad.

## Variables de entorno (`apps/api/.env`)

| Variable | Qué es |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Access token de la aplicación. En sandbox es el `APP_USR-…` que muestra la página *Credenciales de prueba* de la aplicación: pertenece al vendedor de prueba (ver abajo). Server-side, nunca va al panel. |
| `MERCADOPAGO_PUBLIC_KEY` | Public key de la aplicación. Hoy no se usa (no hay checkout embebido); queda configurada para el cobro de consultas (#29). |
| `MERCADOPAGO_WEBHOOK_SECRET` | Clave secreta de la sección Webhooks de la aplicación. Sin ella, todo webhook se rechaza con 401. |
| `MERCADOPAGO_PLAN_AMOUNT` | Precio mensual en pesos enteros (ej. `15000`). |
| `MERCADOPAGO_PLAN_CURRENCY` | Moneda; `ARS` por defecto. |
| `MERCADOPAGO_BACK_URL` | URL a la que Mercado Pago devuelve al pagador (ej. `<panel>/ajustes`). Mercado Pago exige una URL `https` pública. |

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
   MERCADOPAGO_BACK_URL=https://<host-público-del-panel>/ajustes
   ```

   y reiniciar la API (`docker compose restart laravel.test queue`) para que tome la config. Migrar si hace falta: `apps/api/vendor/bin/sail artisan migrate`.
5. **Suscribirse** — ingresar al panel como el dueño (`ana.duena@test.com` en el seed) → Ajustes → «Suscribirse». Mercado Pago valida que el `payer_email` sea el de un comprador de prueba: cambiar el email de ese usuario por el del comprador de prueba (o registrar un dueño nuevo con ese email). Pagar con una [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/test/cards) y titular `APRO` (aprobado) u `OTHE` (rechazado).
6. **Verificar** — el webhook llega a `/api/v1/webhooks/mercadopago` (ver `storage/logs` y la tabla `subscription_events`) y la suscripción pasa a `active`. Para la gracia: un cobro rechazado la mueve a `grace`; para el vencimiento sin esperar 7 días, poner `grace_ends_at` en el pasado y correr `apps/api/vendor/bin/sail artisan subscriptions:expire-grace`. Los mails se ven en Mailpit (<http://localhost:8025>) con el worker `queue` levantado.
7. Desde el panel de la aplicación se puede usar *Simular notificación* del webhook para probar la firma: envía un id ficticio (p. ej. `123456`), así que con la firma válida responde 204 y queda en el log el `warning` de recurso no encontrado, sin cambios ni fila en `subscription_events`. Un 401 indica firma inválida (revisar `MERCADOPAGO_WEBHOOK_SECRET`).

## Fuera de alcance / pendientes

- **Web Push** para los avisos de gracia/vencimiento (no existe infraestructura de push todavía): por ahora solo mail.
- Pricing y planes (solo el monto/moneda configurables de arriba), prueba gratuita, cancelación desde el panel y cobro de consultas (#29, que reutiliza este adapter).
