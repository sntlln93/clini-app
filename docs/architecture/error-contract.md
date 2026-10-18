# Contrato de errores

Decisiones y motivación en [ADR 0009](../adr/0009-contrato-de-errores-de-dominio.md) — este documento describe el contrato tal como quedó implementado, no por qué se eligió.

## Dos formatos de respuesta

**Errores de dominio** (reglas de negocio, y los 3 `abort()` que representaban un error de dominio real):

```json
{
  "error": {
    "code": "appointments.slot_taken",
    "message": "The professional already has an appointment at that time.",
    "context": {}
  }
}
```

- `code`: contrato público, formato `<módulo>.<regla>`, uno de los 48 valores de `App\Enums\ErrorCode` (tabla abajo). Agregarlo o renombrarlo requiere actualizar en el mismo cambio **los dos** catálogos espejo — el del panel (`apps/panel/src/lib/error-codes.ts`) y el del dashboard de operación (`apps/dashboard/src/lib/error-codes.ts`); el test de paridad de cada app (`src/lib/error-code-parity.test.ts`, conjunto exacto) lo garantiza. Corre con `CI=true`: dentro de los contenedores `panel`/`dashboard` `apps/api` no está montado y el test se saltea.
- `message`: el mensaje de la excepción, en inglés, para desarrolladores (va al log y al stack trace). **Nunca se muestra en la UI** — cada frontend resuelve la copy en español por `code` desde su propio catálogo (`ERROR_CODE_MESSAGES` en `error-codes.ts`). El dashboard reusa la copy del panel salvo en los códigos de moderación, donde la redacta para el operador.
- `context`: lo que `publicContext()` de la excepción concreta decidió exponer. `{}` por defecto; las excepciones que exponen algo están marcadas en la tabla.

**Validación de entrada** (forma nativa de Laravel, sin cambios — 422 exclusivo de FormRequests):

```json
{
  "message": "The given data was invalid.",
  "errors": { "start_at": ["El horario es obligatorio."] }
}
```

## Dónde se traduce

Backend: un único `render` callback en `apps/api/bootstrap/app.php`, registrado sobre la interfaz `App\Contracts\DomainError` — nunca sobre la clase base `App\Exceptions\DomainException`, para que un `catch`/`render` sin el `use` correcto no atrape en su lugar el `\DomainException` de SPL. Ningún controller ni Action arma una respuesta de error a mano. `logContext()` se loguea ahí mismo y nunca se serializa en la respuesta.

**`logContext()` no lleva datos personales** (#322): ni DNI ni otro número de documento, email, teléfono, nombre, dirección, fecha de nacimiento, número de afiliado, slug público (suele ser el nombre del profesional) ni contenido clínico. Lleva identificadores internos (`appointment_id`, `membership_id`, `organization_id`…) y estados. Si no hay un identificador interno, lleva `[]`, como `PatientNotFoundException`: el documento buscado puede ser de alguien que ni siquiera es paciente. Un hash tampoco sirve, porque un DNI tiene ~10⁸ valores posibles y se revierte por fuerza bruta. `tests/Feature/Errors/PersonalDataInLogsTest.php` construye cada `DomainError` por reflexión y falla si una clave de su `logContext()` nombra un dato personal. Dos familias de excepciones inesperadas, las que tienen datos personales en el mensaje, tampoco pasan por el reporter por defecto. Una `QueryException`, y la `DeadlockException` que la envuelve en una transacción anidada, se loguean solo con la plantilla SQL, el SQLSTATE y los nombres de constraint y columna, porque su mensaje interpola los bindings y suma el `DETAIL` de Postgres (`Key (document_number)=(…)`). De un fallo de mail se loguea la clase y, si es de transporte (`TransportExceptionInterface`), el motivo con las direcciones redactadas. El de `RfcComplianceException` no se loguea, porque es la dirección misma. Las dos familias pasan por `App\Support\SafeExceptionLog`, que además arma la traza sin los argumentos de cada frame. Cualquier otra excepción inesperada se loguea con su mensaje tal cual. Por eso un dato personal nunca se interpola en el mensaje de una excepción propia. `failed_jobs` guarda la excepción entera hasta que la purga la borra (ver [Infraestructura](infrastructure.md#colas)). Todo lo que no sea un `DomainError`, una `ValidationException` o una excepción de autenticación/autorización/routing de Laravel (401, 403 sin dominio, 404 de ruta, 405, 419 de CSRF, 429) se loguea y devuelve un cuerpo genérico, sin clase, archivo, línea ni stack, sin importar `APP_DEBUG`.

Panel: `apps/panel/src/lib/api-errors.ts` es el único archivo que conoce axios (`axios.isAxiosError`, `error.response`). Su `mapToAppError(error: unknown): AppError` clasifica cualquier error en una de siete clases que extienden `Error` (`BusinessError`, `ValidationError`, `UnauthorizedError`, `SessionExpiredError`, `RateLimitedError`, `NetworkError`, `UnexpectedError`), discriminadas por `kind`. Todo lo demás — `extractFormErrors`, `notifyError`, `QueryErrorState`, el `retry` de `query-client.ts` — trabaja sobre `AppError`, nunca sobre axios directamente; una regla de ESLint (`no-restricted-imports`) lo enforcea, exceptuando `src/lib/api.ts` (crea el cliente axios, no lee `error.response`).

## Los 48 códigos

| código | HTTP | sitio de origen | `context` |
|---|---|---|---|
| `appointments.service_not_active_for_professional` | 409 | `BookAppointmentAction` | |
| `appointments.slot_taken` | 409 | `BookAppointmentAction` | |
| `appointments.not_cancellable_from_status` | 409 | `CancelAppointmentAction` | |
| `appointments.not_reschedulable_from_status` | 409 | `RescheduleAppointmentAction` | |
| `appointments.status_transition_not_allowed` | 409 | `TransitionAppointmentStatusAction` | |
| `memberships.last_active_admin` | 409 | `DeactivateMembershipAction` y `UpdateMembershipAction` (misma clase, misma regla) | |
| `memberships.invitation_invalid_or_expired` | 404 | `FindValidInvitationAction` | |
| `memberships.slug_invalid_format` | 409 | `SetMembershipSlugAction` | |
| `memberships.slug_taken` | 409 | `SetMembershipSlugAction` | |
| `memberships.slug_not_allowed_for_role` | 409 | `SetMembershipSlugAction` | |
| `organizations.no_active_membership` | 403 | middleware `ResolveCurrentOrganization` | |
| `organizations.suspended` | 403 | middleware `ResolveCurrentOrganization` (organización suspendida por un operador) | |
| `organizations.already_suspended` | 409 | `SuspendOrganizationAction` (dashboard) | |
| `organizations.not_suspended` | 409 | `ReactivateOrganizationAction` (dashboard) | |
| `patients.not_found` | 404 | `PatientController::lookup` | |
| `patients.insurance_member_number_taken` | 409 | `RegisterPatientAction` (otro paciente de la misma obra social ya tiene ese número de afiliado) | |
| `auth.email_verification_invalid_or_expired` | 404 | `FindValidEmailVerificationUserAction`, `VerifyEmailAction` | |
| `auth.user_blocked` | 403 | login de la clínica (`Auth::attemptWhen`, solo con contraseña correcta) y middleware `EnsureUserNotBlocked` | |
| `booking.slot_not_available` | 409 | `AssertSlotWithinPublishedScheduleAction` | |
| `booking.organization_unavailable` | 403 | middleware `ResolvePublicOrganization` (organización suspendida) | |
| `booking.appointment_unavailable` | 404 | `AppointmentDetailsLink` (el link `/turno/<token>` no se descifra o el turno ya no se muestra, ADR 0018) | |
| `booking.link_not_found` | 404 | middleware `ResolvePublicOrganization` (el slug no es de ninguna organización ni del link de un profesional activo) | |
| `availability.slot_merge_required` | 409 | `SaveAvailabilitySlotAction` | `merged` |
| `availability.slot_already_covered` | 409 | `SaveAvailabilitySlotAction` | `covering` |
| `availability.exception_merge_required` | 409 | `SaveAvailabilityExceptionAction` | `merged` |
| `availability.exception_already_covered` | 409 | `SaveAvailabilityExceptionAction` | `covering` |
| `availability.exception_type_conflict` | 409 | `SaveAvailabilityExceptionAction` | `existing_type` |
| `holidays.provider_unavailable` | 409 | `CalendariosNacionalesService` | |
| `subscriptions.inactive` | 409 | middleware `EnsureSubscriptionActive` (suscripción vencida) | `subscription_status` |
| `subscriptions.already_active` | 409 | `StartSubscriptionCheckoutAction` | |
| `subscriptions.gateway_unavailable` | 409 | `StartSubscriptionCheckoutAction`, `CancelSubscriptionAction`, `MercadoPagoService` | |
| `subscriptions.webhook_signature_invalid` | 401 | `HandleSubscriptionNotificationAction` | |
| `subscriptions.grace_extension_not_allowed` | 409 | `ExtendSubscriptionGraceAction` (dashboard) | `subscription_status` |
| `subscriptions.grace_extension_not_later` | 409 | `ExtendSubscriptionGraceAction` (dashboard) | `current_grace_ends_at` |
| `subscriptions.not_cancellable` | 409 | `CancelSubscriptionAction` | `subscription_status` (null sin suscripción) |
| `plans.feature_unavailable` | 409 | middleware `EnsurePlanIncludes` (`plan.feature`), `OrganizationPlan` (invitar, aceptar, editar miembros, link por profesional) | `plan`, `feature` |
| `plans.professional_limit_exceeded` | 409 | middleware `EnsureSubscriptionActive` (Gratis con más profesionales activos que el límite) | `plan`, `professional_limit`, `active_professionals` |
| `plans.appointment_limit_reached` | 409 | `BookAppointmentAction` y el control previo de `BookOnlineAppointmentAction` (Gratis con el mes del turno lleno) | `appointment_limit`, `month` |
| `plans.center_assigned` | 409 | `StartSubscriptionCheckoutAction` | |
| `plans.assignment_unchanged` | 409 | `AssignOrganizationPlanAction` (dashboard) | |
| `plans.subscription_live` | 409 | `AssignOrganizationPlanAction` (dashboard) | `subscription_status` |
| `users.already_blocked` | 409 | `BlockUserAction` (dashboard) | |
| `users.not_blocked` | 409 | `UnblockUserAction` (dashboard) | |
| `users.email_already_verified` | 409 | `VerifyUserEmailManuallyAction` (dashboard) | |
| `contact_requests.status_unchanged` | 409 | `ChangeContactRequestStatusAction` (dashboard) | |
| `clinical_notes.annulled` | 409 | `AmendClinicalNoteAction`, `AnnulClinicalNoteAction` (la nota ya está anulada, ADR 0019) | |
| `clinical_notes.amendment_unchanged` | 409 | `AmendClinicalNoteAction` (la enmienda repite el texto y los diagnósticos vigentes) | |
| `clinical_notes.diagnosis_retired` | 409 | `WriteClinicalNoteAction`, `AmendClinicalNoteAction` (se agrega un código CIE-10 dado de baja en el catálogo, ADR 0020) | |
| `prescriptions.amendment_unchanged` | 409 | `AmendPrescriptionAction` (la enmienda repite la medicación vigente) | |

Las rutas `/api/v1/admin/*` suman un rechazo que **no** es un código de dominio: `EnsureDashboardOrigin` responde un `403 {"message":"Forbidden."}` plano (sin sobre `error`) cuando el `Origin`/`Referer` del pedido no está en `ADMIN_ALLOWED_ORIGINS`. Es una aserción de seguridad, no un flujo de negocio — ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md).

## Manejo por capa en el panel

- **Mutations**: el error de negocio se maneja en el propio `catch`/`onError` de la mutation — nunca escala a un boundary. Lanzar dentro de un `onError` de `useMutation` no escala: `@tanstack/query-core` 5.101.2 envuelve cada invocación en `try { … } catch (e) { void Promise.reject(e) }`, así que produce una unhandled rejection en lugar de propagar.
- **Formularios**: `extractFormErrors(error, fieldMap?)` preserva la visualización inline que estos códigos tenían cuando todavía eran 422 (`ValidationException`), a través de un mapa `código → campo` **definido por formulario** (no global — por ejemplo, `memberships.last_active_admin` se ancla a `roles` en la edición de un miembro, y no tiene campo en el flujo de desactivación). Un código sin entrada en el mapa se muestra como mensaje general del formulario; nunca se descarta en silencio.
- **Lecturas de página**: llegan al `errorComponent` de la ruta a través del loader ([ADR 0007](../adr/0007-fetching-con-loaders-de-tanstack-router.md)) — no hay `throwOnError` en ninguna query. `RouteErrorState` (envoltorio de `QueryErrorState` con acciones de recuperación) es el `errorComponent` de 8 rutas de módulo; `__root.tsx`, `_auth.tsx` y `_public.tsx` deliberadamente no definen uno propio.
- **Lecturas por interacción**: los 8 `useQuery` que no están atados a una navegación (`use-patient-lookup`, los dos de `AppointmentFormDialog`, los dos de `use-availability-warning`, `use-accept-invitation`, `use-ping`, `lib/session.ts`) no escalan a ningún boundary: su error se mapea y se muestra inline o como toast, sobre una página ya renderizada.
- **Errores inesperados de render**: `RouteErrorState`/`QueryErrorState` muestran una UI de recuperación en español — nunca una pantalla en blanco — con reintentar, volver atrás e ir al inicio. No re-lanzan: hacerlo delegaría a un boundary padre que no existe. En `RouteErrorState` reintentar combina `router.invalidate()` (vuelve a ejecutar el loader que falló) con `reset` (limpia el estado del `CatchBoundary`) — `reset` solo no alcanza porque no reinvoca el loader; en `QueryErrorState` fuera de ese caso, `onRetry` sigue siendo lo que pase el llamador.
