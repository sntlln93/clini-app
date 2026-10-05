# ADR 0010: Identidad separada para los operadores de la plataforma

## Estado

Aceptado.

## Contexto

El dashboard de operación (`apps/dashboard`, issue #232) le da al equipo de Clini una vista transversal de todas las organizaciones (KPIs, usuarios, suscripciones, estadísticas, auditoría) y acciones de moderación sobre ellas: suspender/reactivar una organización, bloquear/desbloquear un usuario, verificar un correo a mano y extender un período de gracia.

Esas lecturas y acciones cruzan tenants por definición. Todo el modelo de autorización existente, en cambio, es por tenant: un `User` actúa siempre a través de una `Membership` de una `Organization` (`ResolveCurrentOrganization`, roles y permisos por membresía, global scope `organization`). Hacía falta decidir quién es el operador para la API y cómo se autentica, sin que un error en la autorización por tenant pueda convertirse en acceso a toda la plataforma.

## Decisión

Los operadores son una **identidad separada** de los usuarios de las clínicas:

- Tabla propia `platform_admins` y modelo `App\Models\PlatformAdmin` (un `Authenticatable`), sin relación con `users`, `memberships` ni `organizations`.
- Guard de sesión propio `admin` (`config/auth.php`, provider `platform_admins`). Las rutas del dashboard viven bajo `/api/v1/admin/*` y usan `auth:admin`.
- `config/sanctum.php` `guard` sigue siendo `['web']`: `auth:sanctum` nunca puede resolver a un operador, y `auth:admin` nunca resuelve a un usuario de una clínica. **Nunca se agrega `admin` a `sanctum.guard`.**
- Mismo modelo de autenticación que el panel ([ADR 0001](0001-api-rest-en-lugar-de-inertia.md)): SPA con cookie de sesión de Sanctum (`/sanctum/csrf-cookie` + `withCredentials`/`withXSRFToken`), sin tokens.
- Los operadores no se registran solos: se crean con `php artisan admin:create`. El seeder solo crea uno de prueba fuera de producción.
- Cada acción de un operador queda en `admin_audit_logs` (append-only), escrita en la misma transacción que la mutación.

## Alternativas descartadas

- **Flag `is_admin` en `users`**: una sola cuenta de clínica comprometida, o un bug en una policy, alcanzaría para tomar la plataforma entera. Además `auth:sanctum` autenticaría al operador en el panel y todo el código por tenant tendría que contemplar a un usuario sin membresía que igual "puede todo".
- **Un rol de plataforma dentro de `memberships`**: las membresías pertenecen a una organización; un operador no es miembro de ningún tenant, y modelarlo así obligaba a una organización ficticia o a excepciones en `ResolveCurrentOrganization` y en el global scope.
- **Tokens de Sanctum para el dashboard**: se aparta del modelo SPA con cookie que ya usa el panel y obliga a guardar un token en el navegador (expuesto a XSS) y a gestionar su revocación.
- **Una API separada para el dashboard**: duplica modelos, migraciones, despliegue y la lógica de suscripciones para un volumen de operadores mínimo; la separación que importa es de identidad y de rutas, no de proceso.

## Consecuencias

- **Una sesión, dos guards.** Panel y dashboard hablan con el mismo origen de API y comparten la misma cookie `laravel_session` (y `XSRF-TOKEN`); cada `SessionGuard` guarda su propia clave (`login_web_…` / `login_admin_…`), así que las dos identidades conviven en una sesión. Por eso:
  - el login del operador hace `session()->regenerate()` y **nunca** `invalidate()`, para no cerrar una sesión de clínica abierta en el mismo navegador;
  - el logout del operador cierra solo el guard `admin` + `regenerate(true)` + `regenerateToken()` (`true` borra el registro de la sesión anterior: una copia de la cookie previa al logout deja de estar autenticada; los datos pasan al id nuevo);
  - el logout de la clínica es simétrico: si hay un operador logueado en la misma sesión, cierra solo el guard `web`, borra `password_hash_web` y regenera con `regenerate(true)` (borrando el registro anterior); si no, invalida la sesión como siempre.
- **`password_hash_web`**: el middleware `AuthenticateSession` de Sanctum guarda ese hash y vacía **toda** la sesión cuando no coincide con el usuario web actual. Todo camino que cierra el guard `web` sin invalidar la sesión (el logout simétrico y `EnsureUserNotBlocked`) tiene que borrar esa clave; si no, el siguiente usuario de clínica que entre en ese navegador vaciaría la sesión y se llevaría puesto al operador. Limitación residual aceptada: un cambio de contraseña de clínica hecho en otro lado sigue vaciando la sesión compartida y desloguea también al operador.
- **Fijación de origen**: como la cookie es compartida y el origen del panel tiene CORS con credenciales, un XSS en el panel (la app más grande y expuesta a clínicas) podría llamar a `/api/v1/admin/*` con la sesión del operador. Todas las rutas admin (incluido el login) pasan por `EnsureDashboardOrigin` (`admin.origin`), que exige que el `Origin` del pedido —o, si falta, el origen del `Referer`— esté en `ADMIN_ALLOWED_ORIGINS`; si no, 403 plano. Corre antes que la autenticación (lista de prioridad de middleware). Falla cerrada: sin la variable configurada en producción, el dashboard entero responde 403. Además exige que el pedido haya pasado por el pipeline stateful de Sanctum (sesión + CSRF): Sanctum decide por `Referer` primero y el pin por `Origin` primero, así que un par falsificado (`Origin` del dashboard, `Referer` ajeno) llegaría al login sin sesión ni CSRF.
- **Fijación inversa**: el origen del dashboard también tiene CORS con credenciales y es stateful para todo `api/*`, así que un XSS en el dashboard (que muestra texto que controlan las clínicas) podría leer datos de pacientes con una sesión de clínica abierta en el mismo navegador. Todos los puntos de entrada de la clínica (grupos autenticados, `/login`, `/register`, `/logout`, `/me`, verificación de correo, invitaciones) pasan por `EnsureNotDashboardOrigin` (`clinic.origin`), que rechaza con 403 plano un `Origin` o `Referer` del dashboard. `/sanctum/csrf-cookie`, la reserva pública y los webhooks quedan abiertos.
- **`sessions.user_id`**: con `SESSION_DRIVER=database` esa columna se escribe desde el guard por defecto de cada request, y `auth:admin` cambia el guard por defecto, así que en requests admin guarda un id de `platform_admins`. Es informativa: nada puede usarla para autorizar ni para matar sesiones (bloquear un usuario no borra filas de `sessions`; lo hace cumplir el middleware `EnsureUserNotBlocked`).
- El dashboard tiene que desplegarse en el mismo sitio (dominio registrable) que la API y el panel, con `SESSION_DOMAIN` cubriendo a los tres, y su origen agregado a `FRONTEND_URL` (después del panel) y a `SANCTUM_STATEFUL_DOMAINS`. Ver [infrastructure.md](../architecture/infrastructure.md#despliegue-dokploy).
- Las consultas admin sobre modelos con el global scope `organization` lo quitan siempre de forma explícita (`withoutGlobalScope('organization')`): `CurrentOrganization` es un singleton del contenedor y, dentro de un mismo test, un request de clínica lo deja seteado para el siguiente request admin.
