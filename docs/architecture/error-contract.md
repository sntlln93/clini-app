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

- `code`: contrato público, formato `<módulo>.<regla>`, uno de los 9 valores de `App\Enums\ErrorCode` (tabla abajo). Renombrarlo requiere actualizar en el mismo cambio el enum espejo del panel (`apps/panel/src/lib/error-codes.ts`); el test de paridad (`apps/panel/src/lib/error-code-parity.test.ts`) lo garantiza.
- `message`: el mensaje de la excepción, en inglés, para desarrolladores (va al log y al stack trace). **Nunca se muestra en la UI** — el panel resuelve la copy en español por `code` desde su propio catálogo (`ERROR_CODE_MESSAGES` en `error-codes.ts`).
- `context`: lo que `publicContext()` de la excepción concreta decidió exponer. `[]` por defecto; ninguna de las 9 excepciones de este contrato expone nada hoy.

**Validación de entrada** (forma nativa de Laravel, sin cambios — 422 exclusivo de FormRequests):

```json
{
  "message": "The given data was invalid.",
  "errors": { "start_at": ["El horario es obligatorio."] }
}
```

## Dónde se traduce

Backend: un único `render` callback en `apps/api/bootstrap/app.php`, registrado sobre la interfaz `App\Contracts\DomainError` — nunca sobre la clase base `App\Exceptions\DomainException`, para que un `catch`/`render` sin el `use` correcto no atrape en su lugar el `\DomainException` de SPL. Ningún controller ni Action arma una respuesta de error a mano. `logContext()` se loguea ahí mismo y nunca se serializa en la respuesta. Todo lo que no sea un `DomainError`, una `ValidationException` o una excepción de autenticación/autorización/routing de Laravel (401, 403 sin dominio, 404 de ruta, 405, 419 de CSRF, 429) se loguea y devuelve un cuerpo genérico, sin clase, archivo, línea ni stack, sin importar `APP_DEBUG`.

Panel: `apps/panel/src/lib/api-errors.ts` es el único archivo que conoce axios (`axios.isAxiosError`, `error.response`). Su `mapToAppError(error: unknown): AppError` clasifica cualquier error en una de siete clases que extienden `Error` (`BusinessError`, `ValidationError`, `UnauthorizedError`, `SessionExpiredError`, `RateLimitedError`, `NetworkError`, `UnexpectedError`), discriminadas por `kind`. Todo lo demás — `extractFormErrors`, `notifyError`, `QueryErrorState`, el `retry` de `query-client.ts` — trabaja sobre `AppError`, nunca sobre axios directamente; una regla de ESLint (`no-restricted-imports`) lo enforcea, exceptuando `src/lib/api.ts` (crea el cliente axios, no lee `error.response`).

## Los 9 códigos

| código | HTTP | sitio de origen |
|---|---|---|
| `appointments.service_not_active_for_professional` | 409 | `BookAppointmentAction` |
| `appointments.slot_taken` | 409 | `BookAppointmentAction` |
| `appointments.not_cancellable_from_status` | 409 | `CancelAppointmentAction` |
| `appointments.not_reschedulable_from_status` | 409 | `RescheduleAppointmentAction` |
| `appointments.status_transition_not_allowed` | 409 | `TransitionAppointmentStatusAction` |
| `memberships.last_active_admin` | 409 | `DeactivateMembershipAction` y `UpdateMembershipAction` (misma clase, misma regla) |
| `organizations.no_active_membership` | 403 | middleware `ResolveCurrentOrganization` |
| `patients.not_found` | 404 | `PatientController::lookup` |
| `memberships.invitation_invalid_or_expired` | 404 | `InvitationAcceptanceController` |

## Manejo por capa en el panel

- **Mutations**: el error de negocio se maneja en el propio `catch`/`onError` de la mutation — nunca escala a un boundary. Lanzar dentro de un `onError` de `useMutation` no escala: `@tanstack/query-core` 5.101.2 envuelve cada invocación en `try { … } catch (e) { void Promise.reject(e) }`, así que produce una unhandled rejection en lugar de propagar.
- **Formularios**: `extractFormErrors(error, fieldMap?)` preserva la visualización inline que estos códigos tenían cuando todavía eran 422 (`ValidationException`), a través de un mapa `código → campo` **definido por formulario** (no global — por ejemplo, `memberships.last_active_admin` se ancla a `roles` en la edición de un miembro, y no tiene campo en el flujo de desactivación). Un código sin entrada en el mapa se muestra como mensaje general del formulario; nunca se descarta en silencio.
- **Lecturas de página**: llegan al `errorComponent` de la ruta a través del loader ([ADR 0007](../adr/0007-fetching-con-loaders-de-tanstack-router.md)) — no hay `throwOnError` en ninguna query. `RouteErrorState` (envoltorio de `QueryErrorState` con acciones de recuperación) es el `errorComponent` de 8 rutas de módulo; `__root.tsx`, `_auth.tsx` y `_public.tsx` deliberadamente no definen uno propio.
- **Lecturas por interacción**: los 8 `useQuery` que no están atados a una navegación (`use-patient-lookup`, los dos de `AppointmentFormDialog`, los dos de `use-availability-warning`, `use-accept-invitation`, `use-ping`, `lib/session.ts`) no escalan a ningún boundary: su error se mapea y se muestra inline o como toast, sobre una página ya renderizada.
- **Errores inesperados de render**: `RouteErrorState`/`QueryErrorState` muestran una UI de recuperación en español — nunca una pantalla en blanco — con reintentar (`reset`), volver atrás e ir al inicio. No re-lanzan: hacerlo delegaría a un boundary padre que no existe.
