# Infrastructure

> Proyecto vivo: esto documenta el punto de partida elegido para no bloquear el arranque, no un compromiso permanente. Cualquier punto acá puede cambiar cuando aparezca una necesidad real — no hay que pedir permiso para revisar esto, solo actualizar el doc cuando cambie.

## Despliegue (Dokploy)

Cuatro aplicaciones, todas con la raíz del repo como build context:

| App | Dockerfile | Build args | Notas |
|---|---|---|---|
| API | `apps/api/Dockerfile` | — | `entrypoint.sh` migra en cada arranque (`RUN_SEEDERS=true` también siembra; solo testing/demo). |
| Panel | `apps/panel/Dockerfile` | `VITE_API_URL` (obligatorio), `VITE_LANDING_URL` (opcional: el link de «Hecho con Clini» en la página de reservas; sin ella, la marca va como texto) | nginx sirviendo la SPA. |
| Dashboard de operación | `apps/dashboard/Dockerfile` | `VITE_API_URL` (obligatorio) | nginx sirviendo la SPA, con `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY` y `robots.txt` que bloquea todo. |
| Landing | `apps/landing/Dockerfile` | `VITE_PANEL_URL` (obligatorio), `VITE_API_URL` (obligatorio: el formulario de contacto, su única llamada a la API), `VITE_SITE_URL` (opcional: el origen público de la landing, para el `og:image` absoluto; sin ella no se declara `og:image`) | Servidor Node con SSR (TanStack Start + Nitro) en el puerto **3000**, no nginx. Indexable (`robots.txt` permite todo). |

Los tres Dockerfiles de frontend copian `packages/` (los paquetes compartidos del workspace, hoy `@clini/theme` y `@clini/brand`, ver [ADR 0012](../adr/0012-tokens-de-diseno-en-un-paquete-del-workspace.md) y [ADR 0017](../adr/0017-marca-en-un-paquete-del-workspace-con-manifiesto.md)) antes del `npm ci`. Por eso el build context tiene que ser la raíz del repo, y por eso un cambio que solo toca `packages/` también cambia las imágenes de los frontends que lo usan.

Variables de la API que dependen de los frontends (pestaña **Environment** de la app API):

- `CONTACT_NOTIFICATION_EMAIL` — opcional: dirección a la que llega un mail por cada consulta del formulario de contacto de la landing, con el visitante como Reply-To. Vacía, no se manda nada (las consultas están siempre en el módulo Contactos del dashboard).
- `BRAND_MAIL_LOGO_URL` — opcional: URL pública (PNG) del logo del encabezado de los mails. Sin ella, es el `mailLogo` que publica el panel (`<primer origen de FRONTEND_URL>/brand/…`), así que el panel tiene que estar desplegado. `BRAND_NAME` (default `Clini`) es el nombre que muestran los mails; `MAIL_FROM_NAME` (el remitente) conviene definirla igual, porque su default es `APP_NAME`. Ver [Marca](brand.md).
- `CONTACT_RETENTION_DAYS` — días que se guarda una consulta cerrada antes de que `model:prune` (diario, en el scheduler) la borre. Default 180; `0` las guarda para siempre. Las consultas abiertas no se borran.

- `FRONTEND_URL` — orígenes con CORS + credenciales, separados por coma. **El panel siempre primero**: el primer elemento es la URL base de los links de los mails (invitaciones, verificación de correo, retorno de la suscripción). Después, el origen del dashboard y el de la landing (que solo lo necesita para el `POST /api/v1/contact` de su formulario de contacto).
- `SANCTUM_STATEFUL_DOMAINS` — host(s) de los dos frontends con sesión (`panel.tu-dominio.com,dashboard.tu-dominio.com`), para que los dos reciban la sesión por cookie. **Nunca la landing**: su formulario de contacto es un pedido sin sesión ni CSRF (ADR 0011).
- `ADMIN_ALLOWED_ORIGINS` — solo el origen del dashboard (`https://dashboard.tu-dominio.com`). Las rutas `/api/v1/admin/*` rechazan con 403 cualquier pedido cuyo `Origin`/`Referer` no esté acá, y las rutas de la clínica rechazan con 403 cualquier pedido que venga desde acá. Falla cerrada: si falta, el default es `http://localhost:5175` y todo el dashboard productivo queda en 403.
- `SESSION_DOMAIN` — tiene que cubrir los dos frontends y la API (el dominio padre, p. ej. `.tu-dominio.com`): panel y dashboard comparten la misma cookie de sesión de la API, con una identidad por guard (ver [ADR 0010](../adr/0010-identidad-separada-para-operadores-de-plataforma.md)). Por eso el dashboard tiene que vivir en el mismo sitio (dominio registrable) que la API y el panel.
- `ADMIN_REPORTING_TIMEZONE` — zona horaria de los agregados diarios del dashboard (default `America/Argentina/Buenos_Aires`). **Tiene que coincidir con la constante `REPORTING_TIMEZONE` de `apps/dashboard/src/lib/format.ts`**: el dashboard la usa para mostrar fechas y para los límites del input de extensión de gracia, y cambiarla ahí requiere rebuild. Si difieren, cerca de medianoche el cliente permite fechas que la API rechaza (422) o al revés, y las fechas mostradas no coinciden con los buckets.

Operadores: en producción y en el server de demo no se siembran (`PlatformAdminSeeder` es un no-op en producción); se crean con `php artisan admin:create` desde la terminal del contenedor de la API.

Después de desplegar el cambio que introdujo el dashboard sobre una base ya existente de testing/demo hace falta, una sola vez, `php artisan migrate:fresh --seed --force` (agregó columnas editando migraciones en el lugar) — ver [Development Guide](development.md#una-sola-vez-tras-desplegar-el-dashboard-de-operación-migratefresh---seed).

**Limitación conocida (proxy)**: `bootstrap/app.php` no configura `trustProxies`, así que detrás del proxy de Dokploy `$request->ip()` es la dirección del proxy. Consecuencias: el throttle del login del dashboard (`admin-login`, 5 por minuto por `email|ip`) degrada a un límite por email, el del formulario de contacto (`contact`, 5 por minuto y 20 por hora por IP) pasa a ser un límite global para todos los visitantes, y la columna `ip` de `admin_audit_logs` registra el proxy. No se agregó un límite solo por IP justamente por eso (sería un bloqueo global del login). Se resuelve configurando `trustProxies` con la red del proxy.

## Colas

`QUEUE_CONNECTION=database` para arrancar. Redis solo si aparece una necesidad real de throughput/latencia que la cola en base de datos no pueda cubrir — no antes.

Un job fallido queda en `failed_jobs` con su payload y la excepción entera, y los dos pueden llevar datos personales (#322). `queue:prune-failed` corre todos los días en el scheduler y borra los que tienen más de `QUEUE_FAILED_RETENTION_HOURS` horas (default 168, una semana; nunca menos de una hora, así que una variable vacía o en `0` no vacía la tabla). Un job cuyo payload lleva un dato que no es un modelo (una dirección, un token) implementa `ShouldBeEncrypted`, como `EmailVerificationMail`, y así va cifrado con `APP_KEY` en `jobs` y en `failed_jobs`. Los modelos viajan solo como id (`SerializesModels`).

## Caché

Driver por defecto de Laravel. No optimizar prematuramente: sin justificación concreta (medición, no intuición), no vale la pena introducir Redis/Memcached solo para cache.

## Archivos

Los archivos que suben los usuarios (hoy, el logo de la organización, #239) van a un bucket compatible con S3, a través del disco `media` ([ADR 0015](../adr/0015-archivos-de-usuarios-en-un-bucket-s3.md)). La base guarda solo la clave del objeto. El bucket es privado, y la API sirve los archivos públicos con su propia ruta.

**Producción: Cloudflare R2.** Antes de desplegar, crear el bucket y un token de API de R2 con permiso de lectura y escritura sobre ese bucket. Después, cargar estas variables en la app API (pestaña **Environment**):

| Variable | Valor |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | las credenciales del token de R2 |
| `AWS_DEFAULT_REGION` | `auto` |
| `AWS_BUCKET` | el nombre del bucket |
| `AWS_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `AWS_USE_PATH_STYLE_ENDPOINT` | `false` |

Sin ellas, la API arranca igual, pero subir un logo responde 500. Los backups de los archivos se hacen sobre el bucket, por separado de Postgres.

En dev, el servicio `s3` de Compose (`adobe/s3mock`) reemplaza a R2: crea el bucket `clini` al arrancar y guarda los objetos en el volumen `clini-s3`.

## Observabilidad

### Datos personales en los logs

Los logs no tienen la protección ni la retención de la base, así que no llevan datos personales (#322; la regla de `logContext()` está en [Contrato de errores](error-contract.md#dónde-se-traduce)). Lo que lo sostiene fuera del código de la aplicación:

- La imagen de la API corre con `zend.exception_ignore_args=On` (`apps/api/Dockerfile`): sin eso, cada frame de una traza en `laravel.log` o en `failed_jobs` lleva sus argumentos, como un DNI, un email o un nombre que se le pasó a una Action.
- Los nginx de la API, del panel y del dashboard no escriben access log, y el error log de la API va a stderr solo en `crit`. Una URL lleva el estado de búsqueda (`?q=` con un nombre o un DNI) y tokens en el path (`/turno/<token>`), y el `Referer` también. La búsqueda de un paciente por documento (`POST /api/v1/patients/lookup`) es un POST para que el DNI no viaje en la URL.
- **Dokploy/Traefik**: el monitoreo de **Requests** de Dokploy activa el access log de Traefik, y ese log guarda la URL completa, con el query string. Mantenerlo apagado. Si se activa, las búsquedas `?q=` del panel y del dashboard (nombres, DNI, emails) quedan ahí, con la retención que tenga el host.
- `MAIL_MAILER` nunca es `log` en producción, porque el mailer `log` escribe cada mail entero (destinatario, paciente, turno) en `laravel.log`. Producción usa `resend`, y el server de demo puede usar `array`.

Herramientas evaluadas (no instaladas todavía): Laravel Pulse, Laravel Nightwatch, Uptime Kuma. El objetivo cuando se necesite: logs, métricas, monitoreo, uptime — con preferencia por soluciones gratuitas o de muy bajo costo dado el estadio del proyecto. Sin decisión tomada sobre cuál(es) usar.
