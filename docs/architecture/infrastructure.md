# Infrastructure

> Proyecto vivo: esto documenta el punto de partida elegido para no bloquear el arranque, no un compromiso permanente. Cualquier punto acá puede cambiar cuando aparezca una necesidad real — no hay que pedir permiso para revisar esto, solo actualizar el doc cuando cambie.

## Despliegue (Dokploy)

Tres aplicaciones, todas con la raíz del repo como build context:

| App | Dockerfile | Build args | Notas |
|---|---|---|---|
| API | `apps/api/Dockerfile` | — | `entrypoint.sh` migra en cada arranque (`RUN_SEEDERS=true` también siembra; solo testing/demo). |
| Panel | `apps/panel/Dockerfile` | `VITE_API_URL` (obligatorio) | nginx sirviendo la SPA. |
| Dashboard de operación | `apps/dashboard/Dockerfile` | `VITE_API_URL` (obligatorio) | nginx sirviendo la SPA, con `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY` y `robots.txt` que bloquea todo. |

Variables de la API que dependen de los frontends (pestaña **Environment** de la app API):

- `FRONTEND_URL` — orígenes con CORS + credenciales, separados por coma. **El panel siempre primero**: el primer elemento es la URL base de los links de los mails (invitaciones, verificación de correo, retorno de la suscripción). Después, el origen del dashboard.
- `SANCTUM_STATEFUL_DOMAINS` — host(s) de los dos frontends (`panel.tu-dominio.com,dashboard.tu-dominio.com`), para que los dos reciban la sesión por cookie.
- `ADMIN_ALLOWED_ORIGINS` — solo el origen del dashboard (`https://dashboard.tu-dominio.com`). Las rutas `/api/v1/admin/*` rechazan con 403 cualquier pedido cuyo `Origin`/`Referer` no esté acá, y las rutas de la clínica rechazan con 403 cualquier pedido que venga desde acá. Falla cerrada: si falta, el default es `http://localhost:5175` y todo el dashboard productivo queda en 403.
- `SESSION_DOMAIN` — tiene que cubrir los dos frontends y la API (el dominio padre, p. ej. `.tu-dominio.com`): panel y dashboard comparten la misma cookie de sesión de la API, con una identidad por guard (ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md)). Por eso el dashboard tiene que vivir en el mismo sitio (dominio registrable) que la API y el panel.
- `ADMIN_REPORTING_TIMEZONE` — zona horaria de los agregados diarios del dashboard (default `America/Argentina/Buenos_Aires`). **Tiene que coincidir con la constante `REPORTING_TIMEZONE` de `apps/dashboard/src/lib/format.ts`**: el dashboard la usa para mostrar fechas y para los límites del input de extensión de gracia, y cambiarla ahí requiere rebuild. Si difieren, cerca de medianoche el cliente permite fechas que la API rechaza (422) o al revés, y las fechas mostradas no coinciden con los buckets.

Operadores: en producción y en el server de demo no se siembran (`PlatformAdminSeeder` es un no-op en producción); se crean con `php artisan admin:create` desde la terminal del contenedor de la API.

Después de desplegar el cambio que introdujo el dashboard sobre una base ya existente de testing/demo hace falta, una sola vez, `php artisan migrate:fresh --seed --force` (agregó columnas editando migraciones en el lugar) — ver [Development Guide](development.md#una-sola-vez-tras-desplegar-el-dashboard-de-operación-migratefresh---seed).

**Limitación conocida (proxy)**: `bootstrap/app.php` no configura `trustProxies`, así que detrás del proxy de Dokploy `$request->ip()` es la dirección del proxy. Consecuencias: el throttle del login del dashboard (`admin-login`, 5 por minuto por `email|ip`) degrada a un límite por email, y la columna `ip` de `admin_audit_logs` registra el proxy. No se agregó un límite solo por IP justamente por eso (sería un bloqueo global del login). Se resuelve configurando `trustProxies` con la red del proxy.

## Colas

`QUEUE_CONNECTION=database` para arrancar. Redis solo si aparece una necesidad real de throughput/latencia que la cola en base de datos no pueda cubrir — no antes.

## Caché

Driver por defecto de Laravel. No optimizar prematuramente: sin justificación concreta (medición, no intuición), no vale la pena introducir Redis/Memcached solo para cache.

## Archivos

Disco local en la primera etapa. Cuando haga falta almacenamiento distribuido/durable (múltiples instancias, backups, CDN), migrar a un bucket compatible con S3 — Laravel's filesystem abstraction hace ese cambio barato cuando llegue el momento, así que no se justifica adelantarlo.

## Observabilidad

Herramientas evaluadas (no instaladas todavía): Laravel Pulse, Laravel Nightwatch, Uptime Kuma. El objetivo cuando se necesite: logs, métricas, monitoreo, uptime — con preferencia por soluciones gratuitas o de muy bajo costo dado el estadio del proyecto. Sin decisión tomada sobre cuál(es) usar.
